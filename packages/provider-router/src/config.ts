import { z } from 'zod';
import { capabilitySchema, type Capability } from '@prismai/contracts';
import type { ProviderName } from './types';

export type PlanTier = 'FREE' | 'PRO';
export type ConfiguredModel = {
  id: string;
  provider: ProviderName;
  model: string;
  capabilities: Capability[];
  contextWindowTokens: number;
  plans: PlanTier[];
  qualityRank: number;
};

export const PROVIDER_DEFINITIONS: { provider: ProviderName; apiKeyEnv: string }[] = [
  { provider: 'groq', apiKeyEnv: 'GROQ_API_KEY' },
  { provider: 'gemini', apiKeyEnv: 'GEMINI_API_KEY' },
  { provider: 'openrouter', apiKeyEnv: 'OPENROUTER_API_KEY' },
  { provider: 'mistral', apiKeyEnv: 'MISTRAL_API_KEY' },
];

const routingEntrySchema = z.object({
  provider: z.enum(['groq', 'gemini', 'openrouter', 'mistral']),
  model: z.string().trim().min(1).max(200),
  capabilities: z.array(capabilitySchema).min(1),
  contextWindowTokens: z.number().int().positive(),
  plans: z.array(z.enum(['FREE', 'PRO'])).min(1),
  qualityRank: z.number().int().min(1).max(5),
}).strict();
const routingCatalogSchema = z.array(routingEntrySchema).max(32).superRefine((entries, context) => {
  const ids = new Set<string>();
  entries.forEach((entry, index) => {
    const id = `${entry.provider}:${entry.model}`;
    if (ids.has(id)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'model'], message: 'duplicate model entry' });
    ids.add(id);
  });
});

/**
 * Le catalogue ne contient que les modèles dont le nom et les métadonnées ont été
 * renseignés explicitement par l’exploitant. Une clé API seule n’active aucun modèle.
 */
export function getConfiguredModels(): ConfiguredModel[] {
  const raw = process.env.PRISMAI_ROUTING_CATALOG?.trim();
  if (!raw) return [];

  let value: unknown;
  try { value = JSON.parse(raw); }
  catch {
    console.error(JSON.stringify({ event: 'prismai.routing.config_error', code: 'INVALID_JSON' }));
    return [];
  }
  const parsed = routingCatalogSchema.safeParse(value);
  if (!parsed.success) {
    console.error(JSON.stringify({
      event: 'prismai.routing.config_error',
      code: 'INVALID_CATALOG',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code })),
    }));
    return [];
  }

  return parsed.data.flatMap((entry) => {
    const definition = PROVIDER_DEFINITIONS.find((item) => item.provider === entry.provider);
    if (!definition || !process.env[definition.apiKeyEnv]?.trim()) return [];
    return [{ ...entry, id: `${entry.provider}:${entry.model}` }];
  });
}

export function getConfiguredModelById(id: string | undefined): ConfiguredModel | undefined {
  return id ? getConfiguredModels().find((model) => model.id === id) : undefined;
}
