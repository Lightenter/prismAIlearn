import { randomUUID } from 'node:crypto';
import type { ChatMessage } from '@prismai/contracts';
import { calculateCreditCost, insufficientCredits } from '@prismai/domain';
import { reserveCredits, claimCreditOperation, completeCredits, refundCredits, getSupabaseAdminClient } from '@prismai/db';
import { chatWithFallback, classifyCapability, estimateInputTokens, getConfiguredModels, selectRoutedModels, type FallbackOptions, type PlanTier } from '@prismai/provider-router';
export * from './stream';

export type ChatRuntimeOptions = {
  fallback?: FallbackOptions;
  estimatedTokens?: number;
  idempotencyKey?: string;
  runId?: string;
  conversationId?: string;
  planTier?: PlanTier;
  signal?: AbortSignal;
};

export async function runChatTurn(userId: string, messages: ChatMessage[], options: ChatRuntimeOptions = {}) {
  const estimatedTokens = options.estimatedTokens ?? Math.max(100, estimateInputTokens(messages));
  const idempotencyKey = options.idempotencyKey ?? randomUUID();
  const models = options.fallback?.models ?? getConfiguredModels();
  const planTier = options.planTier ?? options.fallback?.planTier ?? 'FREE';
  const routedCandidates = selectRoutedModels(classifyCapability(messages), estimatedTokens, models, planTier);
  const maxFallbacks = Math.min(1, Math.max(0, options.fallback?.maxFallbacks ?? 1));
  const reservableCandidates = routedCandidates.slice(0, maxFallbacks + 1);
  const estimatedCost = Math.max(...reservableCandidates.map((model) => calculateCreditCost(model.provider, estimatedTokens)));
  const operationId = await reserveCredits(userId, idempotencyKey, estimatedCost, options.runId);
  let finalized = false;
  try {
    const claimed = await claimCreditOperation(userId, operationId);
    if (!claimed) {
      finalized = true;
      throw Object.assign(new Error('IDEMPOTENCY_REPLAY'), { code: 'IDEMPOTENCY_REPLAY' });
    }
    const response = await chatWithFallback(messages, userId, {
      ...options.fallback,
      models: reservableCandidates,
      planTier,
      maxFallbacks,
      signal: options.signal ?? options.fallback?.signal,
    });
    const finalCost = calculateCreditCost(response.provider_used, response.tokens || estimatedTokens);
    const completed = await completeCredits(operationId, finalCost);
    finalized = true;

    let conversationId = options.conversationId;
    let persistenceWarning = false;
    try {
      const supabase = getSupabaseAdminClient() as any;
      const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
      if (!conversationId) {
        const title = (lastUserMessage?.content ?? 'Nouvelle conversation').trim().slice(0, 80) || 'Nouvelle conversation';
        const { data, error } = await supabase.from('conversations').insert({ user_id: userId, title }).select('id').single();
        if (error || !data?.id) persistenceWarning = true;
        else conversationId = data.id;
      } else {
        const { data, error } = await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', userId).select('id').maybeSingle();
        if (error || !data?.id) persistenceWarning = true;
      }
      if (conversationId) {
        const rows = [
          ...(lastUserMessage ? [{ conversation_id: conversationId, user_id: userId, role: 'user', content: lastUserMessage.content }] : []),
          { conversation_id: conversationId, user_id: userId, role: 'assistant', content: response.content, provider_used: response.provider_used, model_used: response.model, tokens: response.tokens },
        ];
        const { error } = await supabase.from('messages').insert(rows);
        if (error) persistenceWarning = true;
      }
    } catch { persistenceWarning = true; }

    return { content: response.content, provider_used: response.provider_used, model: response.model, tokens: response.tokens, fallback_used: response.fallback_used ?? false, balance: completed.balance, creditsSpent: finalCost, conversationId: conversationId ?? null, persistenceWarning };
  } catch (error) {
    if (!finalized) {
      try { await refundCredits(operationId, 'provider_or_runtime_failure'); } catch { /* La base reste l’autorité si le remboursement échoue. */ }
    }
    if (error instanceof Error && ['INSUFFICIENT_CREDITS', 'INSUFFICIENT_CREDITS_FINAL'].includes(error.message)) throw insufficientCredits();
    throw error;
  }
}
