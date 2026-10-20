import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import type { FallbackOptions, ProviderClient, ProviderName } from './types';

const ORDER: ProviderName[] = ['groq', 'gemini', 'openrouter', 'mistral'];
const CIRCUIT_FAILURE_LIMIT = 3;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_COOLDOWN_MS = 5 * 60_000;
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type CircuitState = { failures: number[]; openedAt?: number };
const circuits = new Map<ProviderName, CircuitState>();

function stateFor(provider: ProviderName) {
  const state = circuits.get(provider) ?? { failures: [] };
  circuits.set(provider, state);
  return state;
}

function isOpen(provider: ProviderName, now: number) {
  const state = stateFor(provider);
  if (state.openedAt && now - state.openedAt < CIRCUIT_COOLDOWN_MS) return true;
  if (state.openedAt && now - state.openedAt >= CIRCUIT_COOLDOWN_MS) {
    state.openedAt = undefined;
    state.failures = [];
  }
  state.failures = state.failures.filter((failureAt) => now - failureAt < CIRCUIT_WINDOW_MS);
  return false;
}

function recordFailure(provider: ProviderName, now: number) {
  const state = stateFor(provider);
  state.failures.push(now);
  state.failures = state.failures.filter((failureAt) => now - failureAt < CIRCUIT_WINDOW_MS);
  if (state.failures.length >= CIRCUIT_FAILURE_LIMIT) state.openedAt = now;
}

function recordSuccess(provider: ProviderName) {
  const state = stateFor(provider);
  state.failures = [];
  state.openedAt = undefined;
}

function errorStatus(error: unknown) {
  if (typeof error === 'object' && error && 'status' in error) return Number(error.status);
  return 0;
}

function shouldRetry(error: unknown) {
  const status = errorStatus(error);
  return status === 429 || status >= 500 || status === 408 || status === 0 || error instanceof Error;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Provider HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return await response.json() as Record<string, any>;
  } finally {
    clearTimeout(timer);
  }
}

function openAiClient(provider: ProviderName, apiKey: string | undefined, endpoint: string, model: string, timeoutMs: number): ProviderClient {
  return async (messages, signal) => {
    if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY_MISSING`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (!response.ok) {
      const error = new Error(`Provider HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    const json = await response.json() as any;
    return {
      content: String(json.choices?.[0]?.message?.content ?? ''),
      provider_used: provider,
      model: String(json.model ?? model),
      tokens: Number(json.usage?.total_tokens ?? 0),
      request_id: json.id,
    };
  };
}

function geminiClient(apiKey: string | undefined, timeoutMs: number): ProviderClient {
  return async (messages, signal) => {
    if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');
    const contents = messages.filter((message) => message.role !== 'system').map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.3 } }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (!response.ok) {
      const error = new Error(`Provider HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    const json = await response.json() as any;
    const content = String(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    return { content, provider_used: 'gemini', model: 'gemini-1.5-flash', tokens: Number(json.usageMetadata?.totalTokenCount ?? 0) };
  };
}

function defaultProviders(timeoutMs: number): Record<ProviderName, ProviderClient> {
  return {
    groq: openAiClient('groq', process.env.GROQ_API_KEY, 'https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile', timeoutMs),
    gemini: geminiClient(process.env.GEMINI_API_KEY, timeoutMs),
    openrouter: openAiClient('openrouter', process.env.OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1/chat/completions', 'meta-llama/llama-3.3-70b-instruct:free', timeoutMs),
    mistral: openAiClient('mistral', process.env.MISTRAL_API_KEY, 'https://api.mistral.ai/v1/chat/completions', 'mistral-small-latest', timeoutMs),
  };
}

export function resetCircuitBreakers() { circuits.clear(); }
export function getCircuitState(provider: ProviderName) { return { ...stateFor(provider), failures: [...stateFor(provider).failures] }; }

export async function chatWithFallback(messages: ChatMessage[], _userId: string, options: FallbackOptions = {}): Promise<ProviderResponse> {
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 30_000);
  const providers = { ...defaultProviders(timeoutMs), ...options.providers };
  const errors: string[] = [];

  for (const provider of ORDER) {
    if (isOpen(provider, now())) {
      errors.push(`${provider}:circuit-open`);
      continue;
    }
    const client = providers[provider];
    if (!client) continue;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await client(messages, AbortSignal.timeout(timeoutMs));
        recordSuccess(provider);
        return response;
      } catch (error) {
        recordFailure(provider, now());
        errors.push(`${provider}:${error instanceof Error ? error.message : String(error)}`);
        if (attempt < maxRetries && shouldRetry(error)) {
          await sleep(250 * 2 ** attempt);
          continue;
        }
        break;
      }
    }
  }
  throw new Error(`ALL_PROVIDERS_FAILED ${errors.join(' | ')}`);
}
