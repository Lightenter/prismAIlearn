import type { ChatMessage, ProviderResponse } from '@prismai/contracts';

export type ProviderName = 'groq' | 'gemini' | 'openrouter' | 'mistral';
export type ProviderClient = (messages: ChatMessage[], signal: AbortSignal) => Promise<ProviderResponse>;
export type FallbackOptions = {
  providers?: Partial<Record<ProviderName, ProviderClient>>;
  preferredProvider?: ProviderName;
  preferredModel?: string;
  maxRetries?: number;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
};
