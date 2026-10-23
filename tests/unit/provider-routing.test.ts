import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chatWithFallback, getConfiguredModels, resetCircuitBreakers } from '@prismai/provider-router';
import type { ChatMessage, ProviderResponse } from '@prismai/contracts';

const envKeys = ['GROQ_API_KEY', 'GROQ_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'OPENROUTER_API_KEY', 'OPENROUTER_MODEL', 'MISTRAL_API_KEY', 'MISTRAL_MODEL'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const messages: ChatMessage[] = [{ role: 'user', content: 'Bonjour' }];
const answer: ProviderResponse = { content: 'Salut', provider_used: 'gemini', model: 'gemini-test', tokens: 4 };

beforeEach(() => { for (const key of envKeys) delete process.env[key]; resetCircuitBreakers(); });
afterEach(() => { for (const key of envKeys) { const value = originalEnv[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

describe('catalogue et politique de routage PrismAI', () => {
  it('n’expose que les providers munis d’une clé et ne retourne jamais cette clé', () => {
    process.env.GROQ_API_KEY = 'secret-test-key'; process.env.GROQ_MODEL = 'llama-test';
    expect(getConfiguredModels()).toEqual([{ id: 'groq:llama-test', provider: 'groq', providerLabel: 'Groq', model: 'llama-test', label: 'Groq · llama-test' }]);
    expect(JSON.stringify(getConfiguredModels())).not.toContain('secret-test-key');
  });

  it('respecte le choix manuel en le plaçant avant les autres modèles disponibles', async () => {
    const calls: string[] = [];
    const response = await chatWithFallback(messages, 'user', { preferredProvider: 'gemini', maxRetries: 0, providers: {
      groq: async () => { calls.push('groq'); return { ...answer, provider_used: 'groq' }; },
      gemini: async () => { calls.push('gemini'); return answer; },
    } });
    expect(response.provider_used).toBe('gemini'); expect(calls).toEqual(['gemini']);
  });

  it('passe au fournisseur suivant sur une limitation de débit', async () => {
    const fallback = Object.assign(new Error('rate limited'), { status: 429 });
    const response = await chatWithFallback(messages, 'user', { maxRetries: 0, providers: {
      groq: async () => { throw fallback; },
      gemini: async () => answer,
    } });
    expect(response.content).toBe('Salut'); expect(response.provider_used).toBe('gemini');
  });

  it('ne déclenche pas de fallback sur une erreur d’authentification fournisseur', async () => {
    const unauthorized = Object.assign(new Error('unauthorized'), { status: 401 });
    const secondProvider = async () => answer;
    await expect(chatWithFallback(messages, 'user', { maxRetries: 0, providers: { groq: async () => { throw unauthorized; }, gemini: secondProvider } })).rejects.toBe(unauthorized);
  });

  it('ne relance pas un autre provider si un timeout réseau laisse incertain l’état de la génération', async () => {
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    await expect(chatWithFallback(messages, 'user', { maxRetries: 0, providers: { groq: async () => { throw timeout; }, gemini: async () => answer } })).rejects.toBe(timeout);
  });
});
