import type { ChatMessage } from '@prismai/contracts';
import { calculateCreditCost, insufficientCredits } from '@prismai/domain';
import { checkCredits, deductCredits, getSupabaseAdminClient } from '@prismai/db';
import { chatWithFallback, type FallbackOptions } from '@prismai/provider-router';
export * from './stream';

export type ChatRuntimeOptions = { fallback?: FallbackOptions; estimatedTokens?: number };

export async function runChatTurn(userId: string, messages: ChatMessage[], options: ChatRuntimeOptions = {}) {
  const estimatedTokens = options.estimatedTokens ?? Math.max(100, messages.reduce((sum, message) => sum + message.content.length / 4, 0));
  const estimatedCost = calculateCreditCost('groq', estimatedTokens);
  if (!(await checkCredits(userId, estimatedCost))) throw insufficientCredits();

  const response = await chatWithFallback(messages, userId, options.fallback);
  const deduction = await deductCredits(userId, response.provider_used, response.tokens || estimatedTokens);
  const supabase = getSupabaseAdminClient() as any;
  const { data: conversation } = await supabase.from('conversations').insert({ user_id: userId, title: messages.find((message) => message.role === 'user')?.content.slice(0, 80) ?? 'Nouvelle conversation' }).select('id').single();
  if (conversation?.id) {
    await supabase.from('messages').insert([
      ...messages.map((message) => ({ conversation_id: conversation.id, user_id: userId, role: message.role, content: message.content })),
      { conversation_id: conversation.id, user_id: userId, role: 'assistant', content: response.content, provider_used: response.provider_used, tokens: response.tokens },
    ]);
  }
  return { ...response, balance: deduction.balance };
}
