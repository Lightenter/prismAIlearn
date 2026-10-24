import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import type { ConfiguredModel, PlanTier } from './config';

export type ProviderName = 'groq' | 'gemini' | 'openrouter' | 'mistral' | 'cloudflare' | 'huggingface';
export type ProviderClient = (messages: ChatMessage[], signal: AbortSignal) => Promise<ProviderResponse>;
export type FallbackOptions = {
  providers?: Partial<Record<ProviderName, ProviderClient>>;
  models?: ConfiguredModel[];
  planTier?: PlanTier;
  maxFallbacks?: number;
  timeoutMs?: number;
  now?: () => number;
  signal?: AbortSignal;
};
