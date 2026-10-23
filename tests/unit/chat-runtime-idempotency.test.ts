import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reserveCredits: vi.fn(), claimCreditOperation: vi.fn(), completeCredits: vi.fn(), refundCredits: vi.fn(), getSupabaseAdminClient: vi.fn(),
  chatWithFallback: vi.fn(), getConfiguredModels: vi.fn(), getConfiguredModelById: vi.fn(), calculateCreditCost: vi.fn(), insufficientCredits: vi.fn(),
}));
vi.mock('@prismai/db', () => ({ reserveCredits: mocks.reserveCredits, claimCreditOperation: mocks.claimCreditOperation, completeCredits: mocks.completeCredits, refundCredits: mocks.refundCredits, getSupabaseAdminClient: mocks.getSupabaseAdminClient }));
vi.mock('@prismai/domain', () => ({ calculateCreditCost: mocks.calculateCreditCost, insufficientCredits: mocks.insufficientCredits }));
vi.mock('@prismai/provider-router', () => ({ chatWithFallback: mocks.chatWithFallback, getConfiguredModels: mocks.getConfiguredModels, getConfiguredModelById: mocks.getConfiguredModelById, classifyCapability: () => ({ capability: 'TEXT' }) }));
import { runChatTurn } from '../../packages/chat-runtime/src/index';

beforeEach(() => {
  vi.clearAllMocks(); mocks.getConfiguredModels.mockReturnValue([{ provider: 'groq', id: 'groq:test', model: 'test' }]);
  mocks.calculateCreditCost.mockReturnValue(3); mocks.reserveCredits.mockResolvedValue('operation-1'); mocks.claimCreditOperation.mockResolvedValue(false);
});

describe('protection idempotente du runtime chat', () => {
  it('refuse un rejeu avant appel provider et ne rembourse pas une opération déjà revendiquée', async () => {
    await expect(runChatTurn('user-1', [{ role: 'user', content: 'Bonjour' }], { idempotencyKey: 'chat-request-1234' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_REPLAY' });
    expect(mocks.claimCreditOperation).toHaveBeenCalledWith('user-1', 'operation-1');
    expect(mocks.chatWithFallback).not.toHaveBeenCalled();
    expect(mocks.refundCredits).not.toHaveBeenCalled();
  });
});
