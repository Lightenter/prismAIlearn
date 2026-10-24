import { z } from 'zod';
import { capabilitySchema, type Capability } from '@prismai/contracts';
import type { CreditModel } from '@prismai/domain';
import type { ProviderName } from './types';

export type PlanTier = 'FREE' | 'PRO';
export type ProviderCreditClass = Exclude<CreditModel, 'image'>;
export type ConfiguredModel = {
  id: string;
  provider: ProviderName;
  model: string;
  creditClass?: ProviderCreditClass;
  capabilities: Capability[];
  contextWindowTokens: number;
  plans: PlanTier[];
  qualityRank: number;
};

/** Les barèmes historiques restent fixes pour les quatre providers déjà facturés. */
export const LEGACY_PROVIDER_CREDIT_CLASS: Partial<Record<ProviderName, ProviderCreditClass>> = {
  groq: 'groq',
  gemini: 'gemini',
  openrouter: 'openrouter',
  mistral: 'mistral',
};

/** Les nouveaux providers doivent recevoir une classe explicite parmi les barèmes existants. */
export function getConfiguredModelCreditClass(model: Pick<ConfiguredModel, 'provider' | 'creditClass'>): ProviderCreditClass | undefined {
  return LEGACY_PROVIDER_CREDIT_CLASS[model.provider] ?? model.creditClass;
}

type ProviderDefinition = { provider: ProviderName; apiKeyEnv: string; requiredEnvVars?: string[] };
export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  { provider: 'groq', apiKeyEnv: 'GROQ_API_KEY' },
  { provider: 'gemini', apiKeyEnv: 'GEMINI_API_KEY' },
  { provider: 'openrouter', apiKeyEnv: 'OPENROUTER_API_KEY' },
  { provider: 'mistral', apiKeyEnv: 'MISTRAL_API_KEY' },
  { provider: 'cloudflare', apiKeyEnv: 'CLOUDFLARE_API_TOKEN', requiredEnvVars: ['CLOUDFLARE_ACCOUNT_ID'] },
];

const routingEntrySchema = z.object({
  provider: z.enum(['groq', 'gemini', 'openrouter', 'mistral', 'cloudflare']),
  model: z.string().trim().min(1).max(200),
  creditClass: z.enum(['groq', 'gemini', 'openrouter', 'mistral']).optional(),
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
 * Le catalogue ne contient que des modèles renseignés explicitement et assortis
 * d’un barème interne connu. Une clé API seule n’active aucun modèle.
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
    if (!definition) return [];
    const requiredEnvVars = [definition.apiKeyEnv, ...(definition.requiredEnvVars ?? [])];
    if (requiredEnvVars.some((name) => !process.env[name]?.trim())) return [];

    const legacyCreditClass = LEGACY_PROVIDER_CREDIT_CLASS[entry.provider];
    if (legacyCreditClass && entry.creditClass && entry.creditClass !== legacyCreditClass) {
      console.warn(JSON.stringify({ event: 'prismai.routing.model_skipped', provider: entry.provider, code: 'CREDIT_CLASS_OVERRIDE_FORBIDDEN' }));
      return [];
    }
    const creditClass = legacyCreditClass ?? entry.creditClass;
    if (!creditClass) {
      console.warn(JSON.stringify({ event: 'prismai.routing.model_skipped', provider: entry.provider, code: 'MISSING_CREDIT_CLASS' }));
      return [];
    }
    return [{ ...entry, creditClass, id: `${entry.provider}:${entry.model}` }];
  });
}

export function getConfiguredModelById(id: string | undefined): ConfiguredModel | undefined {
  return id ? getConfiguredModels().find((model) => model.id === id) : undefined;
}
