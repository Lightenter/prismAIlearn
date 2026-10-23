import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import { classifyCapability, selectTextProvider } from './capabilities';
import { getConfiguredModels, PROVIDER_DEFINITIONS } from './config';
import type { FallbackOptions, ProviderClient, ProviderName } from './types';

const ORDER: ProviderName[] = ['groq', 'gemini', 'openrouter', 'mistral'];
const CIRCUIT_FAILURE_LIMIT = 3;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_COOLDOWN_MS = 5 * 60_000;
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  const state = stateFor(provider); state.failures.push(now); state.failures = state.failures.filter((failureAt) => now - failureAt < CIRCUIT_WINDOW_MS);
  if (state.failures.length >= CIRCUIT_FAILURE_LIMIT) state.openedAt = now;
}
function recordSuccess(provider: ProviderName) { const state = stateFor(provider); state.failures = []; state.openedAt = undefined; }
function errorStatus(error: unknown) { if (typeof error === 'object' && error && 'status' in error) return Number(error.status); return 0; }
function shouldRetry(error: unknown) {
  const status = errorStatus(error);
  // Une erreur de transport/timeout ne prouve pas que le provider n’a pas exécuté la génération facturable.
  return [408, 429, 502, 503, 504].includes(status);
}

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
function defaultProviders(timeoutMs: number, preferredProvider?: ProviderName, preferredModel?: string): Partial<Record<ProviderName, ProviderClient>> {
  const models = getConfiguredModels();
  const clients: Partial<Record<ProviderName, ProviderClient>> = {};
  for (const configured of models) {
    const definition = PROVIDER_DEFINITIONS.find((item) => item.provider === configured.provider)!;
    const apiKey = process.env[definition.apiKeyEnv]!;
    const model = configured.provider === preferredProvider && preferredModel ? preferredModel : configured.model;
    if (configured.provider === 'gemini') clients.gemini = geminiClient(apiKey, model, timeoutMs);
    else if (configured.provider === 'groq') clients.groq = openAiClient('groq', apiKey, 'https://api.groq.com/openai/v1/chat/completions', model, timeoutMs);
    else if (configured.provider === 'openrouter') clients.openrouter = openAiClient('openrouter', apiKey, 'https://openrouter.ai/api/v1/chat/completions', model, timeoutMs);
    else if (configured.provider === 'mistral') clients.mistral = openAiClient('mistral', apiKey, 'https://api.mistral.ai/v1/chat/completions', model, timeoutMs);
  }
  return clients;
}
export function resetCircuitBreakers() { circuits.clear(); }
export function getCircuitState(provider: ProviderName) { return { ...stateFor(provider), failures: [...stateFor(provider).failures] }; }

export async function chatWithFallback(messages: ChatMessage[], _userId: string, options: FallbackOptions = {}): Promise<ProviderResponse> {
  const now = options.now ?? (() => Date.now()); const sleep = options.sleep ?? defaultSleep;
  const maxRetries = options.maxRetries ?? 1; const timeoutMs = options.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 30_000);
  const configured = defaultProviders(timeoutMs, options.preferredProvider, options.preferredModel);
  const providers = { ...configured, ...options.providers };
  const available = ORDER.filter((provider) => Boolean(providers[provider]));
  const preferred = options.preferredProvider ?? (available.length ? selectTextProvider(classifyCapability(messages), available).provider : undefined);
  const candidates = preferred ? [preferred, ...available.filter((provider) => provider !== preferred)] : available;
  const errors: string[] = [];

  for (const provider of candidates) {
    if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
    if (isOpen(provider, now())) { errors.push(`${provider}:circuit-open`); continue; }
    const client = providers[provider]; if (!client) continue;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
        const response = await client(messages, signal);
        recordSuccess(provider);
        return response;
      } catch (error) {
        if (options.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
        const retryable = shouldRetry(error);
        if (!retryable) throw error;
        recordFailure(provider, now()); errors.push(`${provider}:${error instanceof Error ? error.message : String(error)}`);
        if (attempt < maxRetries) { await sleep(250 * 2 ** attempt); continue; }
        break;
      }
    }
  }
  throw new Error(`ALL_PROVIDERS_FAILED ${errors.join(' | ')}`);
}
