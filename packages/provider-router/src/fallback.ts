import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import { classifyCapability, estimateInputTokens, selectRoutedModels } from './capabilities';
import { getConfiguredModels, PROVIDER_DEFINITIONS, type ConfiguredModel, type PlanTier } from './config';
import type { FallbackOptions, ProviderClient, ProviderName } from './types';

const CIRCUIT_FAILURE_LIMIT = 3;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_COOLDOWN_MS = 5 * 60_000;
type CircuitState = { failures: number[]; openedAt?: number };
const circuits = new Map<ProviderName, CircuitState>();
function stateFor(provider: ProviderName) { const state = circuits.get(provider) ?? { failures: [] }; circuits.set(provider, state); return state; }
function isOpen(provider: ProviderName, now: number) {
  const state = stateFor(provider);
  if (state.openedAt && now - state.openedAt < CIRCUIT_COOLDOWN_MS) return true;
  if (state.openedAt && now - state.openedAt >= CIRCUIT_COOLDOWN_MS) { state.openedAt = undefined; state.failures = []; }
  state.failures = state.failures.filter((failureAt) => now - failureAt < CIRCUIT_WINDOW_MS);
  return false;
}
function recordFailure(provider: ProviderName, now: number) {
  const state = stateFor(provider);
  state.failures.push(now);
  state.failures = state.failures.filter((failureAt) => now - failureAt < CIRCUIT_WINDOW_MS);
  if (state.failures.length >= CIRCUIT_FAILURE_LIMIT) state.openedAt = now;
}
function recordSuccess(provider: ProviderName) { const state = stateFor(provider); state.failures = []; state.openedAt = undefined; }
function errorStatus(error: unknown) { if (typeof error === 'object' && error && 'status' in error) return Number(error.status); return 0; }
// Seules des réponses HTTP explicites de limitation ou indisponibilité autorisent un repli.
// Les timeouts réseau et erreurs de transport restent ambigus et n’entraînent aucun second appel.
function allowsFallback(error: unknown) { return [429, 503].includes(errorStatus(error)); }
function safeProviderError() { return Object.assign(new Error('PROVIDER_UNAVAILABLE'), { code: 'PROVIDER_UNAVAILABLE' }); }

function openAiClient(provider: ProviderName, apiKey: string, endpoint: string, model: string, timeoutMs: number): ProviderClient {
  return async (messages, signal) => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages, temperature: 0.3 }), signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
    if (!response.ok) { const error = new Error(`Provider HTTP ${response.status}`) as Error & { status: number }; error.status = response.status; throw error; }
    const json = await response.json() as any;
    return { content: String(json.choices?.[0]?.message?.content ?? ''), provider_used: provider, model: String(json.model ?? model), tokens: Number(json.usage?.total_tokens ?? 0), request_id: json.id };
  };
}
function geminiClient(apiKey: string, model: string, timeoutMs: number): ProviderClient {
  return async (messages, signal) => {
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    const contents = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { temperature: 0.3 } }), signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
    if (!response.ok) { const error = new Error(`Provider HTTP ${response.status}`) as Error & { status: number }; error.status = response.status; throw error; }
    const json = await response.json() as any;
    const content = String(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    return { content, provider_used: 'gemini', model, tokens: Number(json.usageMetadata?.totalTokenCount ?? 0) };
  };
}
function createProviderClient(configured: ConfiguredModel, timeoutMs: number): ProviderClient | undefined {
  const definition = PROVIDER_DEFINITIONS.find((item) => item.provider === configured.provider);
  const apiKey = definition ? process.env[definition.apiKeyEnv]?.trim() : '';
  if (!apiKey) return undefined;
  if (configured.provider === 'gemini') return geminiClient(apiKey, configured.model, timeoutMs);
  if (configured.provider === 'groq') return openAiClient('groq', apiKey, 'https://api.groq.com/openai/v1/chat/completions', configured.model, timeoutMs);
  if (configured.provider === 'openrouter') return openAiClient('openrouter', apiKey, 'https://openrouter.ai/api/v1/chat/completions', configured.model, timeoutMs);
  return openAiClient('mistral', apiKey, 'https://api.mistral.ai/v1/chat/completions', configured.model, timeoutMs);
}

export function resetCircuitBreakers() { circuits.clear(); }
export function getCircuitState(provider: ProviderName) { return { ...stateFor(provider), failures: [...stateFor(provider).failures] }; }

export async function chatWithFallback(messages: ChatMessage[], _userId: string, options: FallbackOptions = {}): Promise<ProviderResponse> {
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 30_000);
  const planTier: PlanTier = options.planTier ?? 'FREE';
  const models = options.models ?? getConfiguredModels();
  const decision = classifyCapability(messages);
  const candidates = selectRoutedModels(decision, estimateInputTokens(messages), models, planTier);
  const maxFallbacks = Math.min(1, Math.max(0, options.maxFallbacks ?? 1));
  const eligible = candidates.slice(0, maxFallbacks + 1);

  for (let index = 0; index < eligible.length; index += 1) {
    const selected = eligible[index];
    if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
    if (isOpen(selected.provider, now())) continue;
    const client = options.providers?.[selected.provider] ?? createProviderClient(selected, timeoutMs);
    if (!client) continue;
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    try {
      const response = await client(messages, signal);
      recordSuccess(selected.provider);
      const fallbackUsed = index > 0;
      console.info(JSON.stringify({ event: 'prismai.provider.route', capability: decision.capability, complexity: decision.complexity, provider: selected.provider, model: response.model || selected.model, outcome: 'success', fallbackUsed }));
      return { ...response, provider_used: selected.provider, model: response.model || selected.model, fallback_used: fallbackUsed };
    } catch (error) {
      if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      const status = errorStatus(error);
      if (allowsFallback(error) && index < eligible.length - 1) {
        recordFailure(selected.provider, now());
        console.warn(JSON.stringify({ event: 'prismai.provider.route', capability: decision.capability, complexity: decision.complexity, provider: selected.provider, model: selected.model, outcome: 'fallback', status }));
        continue;
      }
      console.error(JSON.stringify({ event: 'prismai.provider.route', capability: decision.capability, complexity: decision.complexity, provider: selected.provider, model: selected.model, outcome: 'failed', status: status || undefined }));
      throw safeProviderError();
    }
  }
  console.warn(JSON.stringify({ event: 'prismai.provider.route', capability: decision.capability, complexity: decision.complexity, outcome: 'no_eligible_provider' }));
  throw safeProviderError();
}
