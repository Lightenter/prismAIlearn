// Importe les messages normalisés du contrat partagé.
import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
// Déclare les fournisseurs supportés par l’orchestrateur.
export type ProviderName = 'groq' | 'gemini' | 'openrouter' | 'mistral';
// Décrit un client provider injectable et testable.
export type ProviderClient = (messages: ChatMessage[], signal: AbortSignal) => Promise<ProviderResponse>;
// Regroupe les options de retry, timeout et clients de test.
export type FallbackOptions = { providers?: Partial<Record<ProviderName, ProviderClient>>; maxRetries?: number; timeoutMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> };
