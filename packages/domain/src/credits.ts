export type CreditModel = 'groq' | 'gemini' | 'openrouter' | 'mistral' | 'image';

export const CREDIT_RATES: Record<CreditModel, number> = {
  groq: 1,
  gemini: 1,
  openrouter: 2,
  mistral: 1.5,
  image: 50,
};

export function normalizeModel(model: string): CreditModel {
  const value = model.toLowerCase();
  if (value.includes('gemini')) return 'gemini';
  if (value.includes('openrouter')) return 'openrouter';
  if (value.includes('mistral')) return 'mistral';
  if (value.includes('image')) return 'image';
  return 'groq';
}

export function calculateCreditCost(model: string, tokens: number): number {
  const normalized = normalizeModel(model);
  if (normalized === 'image') return CREDIT_RATES.image;
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / 1000) * CREDIT_RATES[normalized];
}
