import type { ProviderName } from './types';

export type ProviderDefinition = {
  provider: ProviderName;
  label: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
};

export type ConfiguredModel = {
  id: string;
  provider: ProviderName;
  providerLabel: string;
  model: string;
  label: string;
};

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  { provider: 'groq', label: 'Groq', apiKeyEnv: 'GROQ_API_KEY', modelEnv: 'GROQ_MODEL', defaultModel: 'llama-3.3-70b-versatile' },
  { provider: 'gemini', label: 'Google Gemini', apiKeyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-1.5-flash' },
  { provider: 'openrouter', label: 'OpenRouter', apiKeyEnv: 'OPENROUTER_API_KEY', modelEnv: 'OPENROUTER_MODEL', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free' },
  { provider: 'mistral', label: 'Mistral', apiKeyEnv: 'MISTRAL_API_KEY', modelEnv: 'MISTRAL_MODEL', defaultModel: 'mistral-small-latest' },
];

export function getConfiguredModels(): ConfiguredModel[] {
  return PROVIDER_DEFINITIONS.flatMap((definition) => {
    if (!process.env[definition.apiKeyEnv]?.trim()) return [];
    const model = process.env[definition.modelEnv]?.trim() || definition.defaultModel;
    return [{ id: `${definition.provider}:${model}`, provider: definition.provider, providerLabel: definition.label, model, label: `${definition.label} · ${model}` }];
  });
}

export function getConfiguredModelById(id: string | undefined): ConfiguredModel | undefined {
  return id ? getConfiguredModels().find((model) => model.id === id) : undefined;
}
