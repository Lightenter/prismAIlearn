import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatWithFallback, getConfiguredModels, resetCircuitBreakers, selectRoutedModels, classifyCapability } from '@prismai/provider-router';
import type { ChatMessage, ProviderResponse } from '@prismai/contracts';
import type { ConfiguredModel } from '@prismai/provider-router';

const envKeys = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'MISTRAL_API_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'PRISMAI_ROUTING_CATALOG'] as const;
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
  vi.unstubAllGlobals();
});

describe('catalogue et politique de routage PrismAI', () => {
  it('n’invente aucun modèle par défaut et active seulement les entrées dont la clé serveur existe', () => {
    const entry = { provider: 'groq', model: 'model-explicit-test', capabilities: ['TEXT'], contextWindowTokens: 8_000, plans: ['FREE'], qualityRank: 1 };
    process.env.PRISMAI_ROUTING_CATALOG = JSON.stringify([entry, { ...entry, provider: 'gemini', model: 'gemini-explicit-test' }]);
    process.env.GROQ_API_KEY = 'secret-test-key';
    expect(getConfiguredModels()).toEqual([{ ...entry, creditClass: 'groq', id: 'groq:model-explicit-test' }]);
    expect(JSON.stringify(getConfiguredModels())).not.toContain('secret-test-key');
    delete process.env.PRISMAI_ROUTING_CATALOG;
    expect(getConfiguredModels()).toEqual([]);
  });

  it('ignore Cloudflare sans classe de crédits explicite ou sans identifiants complets', () => {
    const entry = { provider: 'cloudflare', model: '@cf/unit-test', capabilities: ['TEXT'], contextWindowTokens: 8_000, plans: ['FREE'], qualityRank: 1 };
    process.env.CLOUDFLARE_API_TOKEN = 'cloudflare-unit-test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'account-unit-test';
    process.env.PRISMAI_ROUTING_CATALOG = JSON.stringify([entry]);
    expect(getConfiguredModels()).toEqual([]);

    process.env.PRISMAI_ROUTING_CATALOG = JSON.stringify([{ ...entry, creditClass: 'mistral' }]);
    expect(getConfiguredModels()).toMatchObject([{ provider: 'cloudflare', model: '@cf/unit-test', creditClass: 'mistral' }]);

    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    expect(getConfiguredModels()).toEqual([]);
  });

  it('appelle Gemini avec la clé dans un en-tête serveur et jamais dans l’URL', async () => {
    process.env.GEMINI_API_KEY = 'gemini-unit-test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Gemini OK' }] } }],
      usageMetadata: { totalTokenCount: 5 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await chatWithFallback(messages, 'user', { models: [fallbackModels[1]], maxFallbacks: 0, timeoutMs: 1_000 });

    expect(response).toMatchObject({ content: 'Gemini OK', provider_used: 'gemini', tokens: 5 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/quality:generateContent');
    expect(String(url)).not.toContain('key=');
    expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('gemini-unit-test-key');
  });

  it('appelle Groq avec une authentification Bearer serveur et sans secret dans l’URL', async () => {
    process.env.GROQ_API_KEY = 'groq-unit-test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-request',
      model: 'fast',
      choices: [{ message: { content: 'Groq OK' } }],
      usage: { total_tokens: 3 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await chatWithFallback(messages, 'user', { models: [models[0]], maxFallbacks: 0, timeoutMs: 1_000 });

    expect(response).toMatchObject({ content: 'Groq OK', provider_used: 'groq', tokens: 3 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(String(url)).not.toContain('groq-unit-test-key');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer groq-unit-test-key');
  });

  it('appelle OpenRouter avec un Bearer serveur et le modèle exact explicitement configuré', async () => {
    process.env.OPENROUTER_API_KEY = 'openrouter-unit-test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-request',
      model: 'unit-test-model',
      choices: [{ message: { content: 'OpenRouter OK' } }],
      usage: { total_tokens: 4 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const configured: ConfiguredModel = { ...models[0], id: 'openrouter:unit-test-model', provider: 'openrouter', model: 'unit-test-model' };

    const response = await chatWithFallback(messages, 'user', { models: [configured], maxFallbacks: 0, timeoutMs: 1_000 });

    expect(response).toMatchObject({ content: 'OpenRouter OK', provider_used: 'openrouter', model: 'unit-test-model', tokens: 4 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(String(url)).not.toContain('openrouter-unit-test-key');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer openrouter-unit-test-key');
    expect(JSON.parse(String(init?.body)).model).toBe('unit-test-model');
  });

  it('appelle Mistral avec un Bearer serveur et le modèle exact configuré', async () => {
    process.env.MISTRAL_API_KEY = 'mistral-unit-test-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-request',
      model: 'unit-test-model',
      choices: [{ message: { content: 'Mistral OK' } }],
      usage: { total_tokens: 4 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const configured: ConfiguredModel = { ...models[0], id: 'mistral:unit-test-model', provider: 'mistral', model: 'unit-test-model' };

    const response = await chatWithFallback(messages, 'user', { models: [configured], maxFallbacks: 0, timeoutMs: 1_000 });

    expect(response).toMatchObject({ content: 'Mistral OK', provider_used: 'mistral', model: 'unit-test-model', tokens: 4 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.mistral.ai/v1/chat/completions');
    expect(String(url)).not.toContain('mistral-unit-test-key');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer mistral-unit-test-key');
  });

  it('appelle Cloudflare Workers AI sur le compte configuré avec un Bearer serveur', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'cloudflare-unit-test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'account-unit-test';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-request',
      model: '@cf/unit-test',
      choices: [{ message: { content: 'Cloudflare OK' } }],
      usage: { total_tokens: 5 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const configured: ConfiguredModel = { ...models[0], id: 'cloudflare:@cf/unit-test', provider: 'cloudflare', model: '@cf/unit-test', creditClass: 'groq' };

    const response = await chatWithFallback(messages, 'user', { models: [configured], maxFallbacks: 0, timeoutMs: 1_000 });

    expect(response).toMatchObject({ content: 'Cloudflare OK', provider_used: 'cloudflare', model: '@cf/unit-test', tokens: 5 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.cloudflare.com/client/v4/accounts/account-unit-test/ai/v1/chat/completions');
    expect(String(url)).not.toContain('cloudflare-unit-test-token');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer cloudflare-unit-test-token');
    expect(JSON.parse(String(init?.body)).model).toBe('@cf/unit-test');
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
