import { describe, expect, it } from 'vitest';
import { calculateCreditCost, CREDIT_RATES, normalizeModel } from '@prismai/domain';

describe('barème interne de crédits', () => {
  it('préserve les taux existants sans créer de tarif provider', () => {
    expect(CREDIT_RATES).toEqual({ groq: 1, gemini: 1, openrouter: 2, mistral: 1.5, image: 50 });
    expect(calculateCreditCost('groq', 1_001)).toBe(2);
    expect(calculateCreditCost('gemini', 1_001)).toBe(2);
    expect(calculateCreditCost('openrouter', 1_001)).toBe(4);
    expect(calculateCreditCost('mistral', 1_001)).toBe(3);
    expect(calculateCreditCost('image', 0)).toBe(50);
  });

  it('refuse de classer automatiquement un provider inconnu au tarif Groq', () => {
    expect(() => normalizeModel('cloudflare')).toThrowError('UNSUPPORTED_CREDIT_MODEL');
    expect(() => calculateCreditCost('cloudflare', 1_000)).toThrowError('UNSUPPORTED_CREDIT_MODEL');
  });
});
