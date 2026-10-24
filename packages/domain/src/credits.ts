export type CreditModel = 'groq' | 'gemini' | 'openrouter' | 'mistral' | 'image';

export const CREDIT_RATES: Record<CreditModel, number> = {
  groq: 1,
  gemini: 1,
  openrouter: 2,
  mistral: 1.5,
  image: 50,
};

/**
 * Seules les classes de crédits internes explicites sont acceptées.
 * Un provider inconnu ne doit jamais être facturé silencieusement au tarif Groq.
 */
export function normalizeModel(model: string): CreditModel {
  const value = model.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CREDIT_RATES, value)) return value as CreditModel;
  throw Object.assign(new Error('UNSUPPORTED_CREDIT_MODEL'), { code: 'UNSUPPORTED_CREDIT_MODEL' });
}

export function calculateCreditCost(model: string, tokens: number): number {
  const normalized = normalizeModel(model);
  if (normalized === 'image') return CREDIT_RATES.image;
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / 1000) * CREDIT_RATES[normalized];
}
