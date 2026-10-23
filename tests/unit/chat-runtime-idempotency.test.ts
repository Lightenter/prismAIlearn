import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reserveCredits: vi.fn(), claimCreditOperation: vi.fn(), completeCredits: vi.fn(), refundCredits: vi.fn(), getSupabaseAdminClient: vi.fn(),
  chatWithFallback: vi.fn(), getConfiguredModels: vi.fn(), calculateCreditCost: vi.fn(), insufficientCredits: vi.fn(),
}));
vi.mock('@prismai/db', () => ({ reserveCredits: mocks.reserveCredits, claimCreditOperation: mocks.claimCreditOperation, completeCredits: mocks.completeCredits, refundCredits: mocks.refundCredits, getSupabaseAdminClient: mocks.getSupabaseAdminClient }));
vi.mock('@prismai/domain', () => ({ calculateCreditCost: mocks.calculateCreditCost, insufficientCredits: mocks.insufficientCredits }));
vi.mock('@prismai/provider-router', () => ({
  chatWithFallback: mocks.chatWithFallback,
  getConfiguredModels: mocks.getConfiguredModels,
  estimateInputTokens: () => 100,
  classifyCapability: () => ({ capability: 'TEXT', complexity: 'LOW', reason: 'test' }),
  selectRoutedModels: (_decision: unknown, _tokens: number, available: unknown[]) => available,
}));
import { runChatTurn } from '../../packages/chat-runtime/src/index';

const configuredModels = [
  { id: 'groq:fast', provider: 'groq', model: 'fast' },
  { id: 'gemini:backup', provider: 'gemini', model: 'backup' },
  { id: 'mistral:not-eligible', provider: 'mistral', model: 'not-eligible' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConfiguredModels.mockReturnValue(configuredModels);
  mocks.calculateCreditCost.mockImplementation((provider: string) => ({ groq: 1, gemini: 2, mistral: 99 }[provider] ?? 1));
  mocks.reserveCredits.mockResolvedValue('operation-1');
  mocks.claimCreditOperation.mockResolvedValue(false);
  mocks.insufficientCredits.mockReturnValue(Object.assign(new Error('INSUFFICIENT_CREDITS'), { code: 'INSUFFICIENT_CREDITS' }));
});

describe('protection idempotente du runtime chat', () => {
  it('refuse un rejeu avant appel provider et réserve seulement le coût maximal des candidats exécutables', async () => {
    await expect(runChatTurn('user-1', [{ role: 'user', content: 'Bonjour' }], { idempotencyKey: 'chat-request-1234' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY' });
    expect(mocks.claimCreditOperation).toHaveBeenCalledWith('user-1', 'operation-1');
    expect(mocks.reserveCredits).toHaveBeenCalledWith('user-1', 'chat-request-1234', 2, undefined);
    expect(mocks.chatWithFallback).not.toHaveBeenCalled();
    expect(mocks.refundCredits).not.toHaveBeenCalled();
  });

  it('arrête avant le provider quand la réservation refuse un solde insuffisant', async () => {
    mocks.reserveCredits.mockRejectedValue(Object.assign(new Error('INSUFFICIENT_CREDITS'), { code: 'INSUFFICIENT_CREDITS' }));
    await expect(runChatTurn('user-1', [{ role: 'user', content: 'Bonjour' }], { idempotencyKey: 'chat-request-credit' })).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
    expect(mocks.claimCreditOperation).not.toHaveBeenCalled();
    expect(mocks.chatWithFallback).not.toHaveBeenCalled();
    expect(mocks.refundCredits).not.toHaveBeenCalled();
  });
});
