import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatWithFallback, getConfiguredModels, resetCircuitBreakers, selectRoutedModels, classifyCapability } from '@prismai/provider-router';
import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import type { ConfiguredModel } from '@prismai/provider-router';

const envKeys = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'MISTRAL_API_KEY', 'PRISMAI_ROUTING_CATALOG'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const messages: ChatMessage[] = [{ role: 'user', content: 'Bonjour' }];
const answer: ProviderResponse = { content: 'Salut', provider_used: 'gemini', model: 'gemini-test', tokens: 4 };
const models: ConfiguredModel[] = [
  { id: 'groq:fast', provider: 'groq', model: 'fast', capabilities: ['TEXT', 'CODE', 'REASONING', 'CREATIVE'], contextWindowTokens: 8_000, plans: ['FREE', 'PRO'], qualityRank: 2 },
  { id: 'gemini:quality', provider: 'gemini', model: 'quality', capabilities: ['TEXT', 'CODE', 'REASONING', 'CREATIVE'], contextWindowTokens: 8_000, plans: ['PRO'], qualityRank: 5 },
];
const fallbackModels: ConfiguredModel[] = [models[0], { ...models[1], plans: ['FREE', 'PRO'], qualityRank: 1 }];

beforeEach(() => {
  for (const key of envKeys) delete process.env[key];
  resetCircuitBreakers();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  for (const key of envKeys) { const value = originalEnv[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  vi.restoreAllMocks();
});

describe('catalogue et politique de routage PrismAI', () => {
  it('n’invente aucun modèle par défaut et active seulement les entrées dont la clé serveur existe', () => {
    const entry = { provider: 'groq', model: 'model-explicit-test', capabilities: ['TEXT'], contextWindowTokens: 8_000, plans: ['FREE'], qualityRank: 1 };
    process.env.PRISMAI_ROUTING_CATALOG = JSON.stringify([entry, { ...entry, provider: 'gemini', model: 'gemini-explicit-test' }]);
    process.env.GROQ_API_KEY = 'secret-test-key';
    expect(getConfiguredModels()).toEqual([{ ...entry, id: 'groq:model-explicit-test' }]);
    expect(JSON.stringify(getConfiguredModels())).not.toContain('secret-test-key');
    delete process.env.PRISMAI_ROUTING_CATALOG;
    expect(getConfiguredModels()).toEqual([]);
  });

  it('classe la dernière demande et non tout l’historique, puis tient compte de l’intention et des contraintes', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Crée une vidéo de démonstration' },
      { role: 'assistant', content: 'Quel style ?' },
      { role: 'user', content: 'Compare ces deux fonctions TypeScript étape par étape en tenant compte des contraintes.' },
    ];
    const decision = classifyCapability(history);
    expect(decision.capability).toBe('CODE');
    expect(decision.complexity).toBe('HIGH');
  });

  it('classe une demande de synthèse de fichier comme document mais laisse rédiger un document en texte', () => {
    expect(classifyCapability([{ role: 'user', content: 'Résume ce document en trois points.' }]).capability).toBe('DOCUMENT');
    expect(classifyCapability([{ role: 'user', content: 'Rédige un document de présentation pour mon projet.' }]).capability).toBe('TEXT');
  });

  it('préfère le coût en crédits le plus bas pour Free et la qualité configurée pour Pro complexe', () => {
    const decision = classifyCapability([{ role: 'user', content: 'Compare ces approches étape par étape.' }]);
    const orderedFree = selectRoutedModels(decision, 100, models, 'FREE');
    const orderedPro = selectRoutedModels(decision, 100, models, 'PRO');
    expect(orderedFree[0].provider).toBe('groq');
    expect(orderedPro[0].provider).toBe('gemini');
  });

  it('refuse une capacité multimodale non prise en charge au lieu de la router vers un modèle texte', () => {
    const decision = classifyCapability([{ role: 'user', content: 'Crée une image de paysage.' }]);
    expect(decision.capability).toBe('IMAGE');
    expect(() => selectRoutedModels(decision, 100, models, 'FREE')).toThrow(expect.objectContaining({ code: 'CAPABILITY_UNAVAILABLE' }));
  });

  it('bascule une seule fois sur une réponse HTTP 429 explicite et marque le fallback en interne', async () => {
    const calls: string[] = [];
    const rateLimited = Object.assign(new Error('rate limited'), { status: 429 });
    const response = await chatWithFallback(messages, 'user', { models: fallbackModels, maxFallbacks: 1, providers: {
      groq: async () => { calls.push('groq'); throw rateLimited; },
      gemini: async () => { calls.push('gemini'); return answer; },
    } });
    expect(calls).toEqual(['groq', 'gemini']);
    expect(response.content).toBe('Salut');
    expect(response.fallback_used).toBe(true);
  });

  it('ne tente pas un troisième fournisseur après l’unique fallback autorisé', async () => {
    const calls: string[] = [];
    const unavailable = Object.assign(new Error('unavailable'), { status: 503 });
    const threeModels: ConfiguredModel[] = [...fallbackModels, { id: 'mistral:third', provider: 'mistral', model: 'third', capabilities: ['TEXT'], contextWindowTokens: 8_000, plans: ['FREE'], qualityRank: 5 }];
    await expect(chatWithFallback(messages, 'user', { models: threeModels, providers: {
      groq: async () => { calls.push('groq'); throw unavailable; },
      gemini: async () => { calls.push('gemini'); throw unavailable; },
      mistral: async () => { calls.push('mistral'); return answer; },
    } })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(calls).toEqual(['groq', 'gemini']);
  });

  it('ne déclenche pas de fallback sur une erreur d’authentification provider', async () => {
    const calls: string[] = [];
    const unauthorized = Object.assign(new Error('unauthorized'), { status: 401 });
    await expect(chatWithFallback(messages, 'user', { models: fallbackModels, providers: {
      groq: async () => { calls.push('groq'); throw unauthorized; },
      gemini: async () => { calls.push('gemini'); return answer; },
    } })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(calls).toEqual(['groq']);
  });

  it('ne déclenche pas de second appel si un timeout réseau laisse incertaine l’exécution', async () => {
    const calls: string[] = [];
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    await expect(chatWithFallback(messages, 'user', { models: fallbackModels, providers: {
      groq: async () => { calls.push('groq'); throw timeout; },
      gemini: async () => { calls.push('gemini'); return answer; },
    } })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(calls).toEqual(['groq']);
  });
});
