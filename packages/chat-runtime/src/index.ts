// Importe la génération cryptographiquement aléatoire d’une clé par défaut.
import { randomUUID } from 'node:crypto';
// Importe le contrat des messages chat.
import type { ChatMessage } from '@prismai/contracts';
// Importe le calcul de coût et l’erreur métier stable.
import { calculateCreditCost, insufficientCredits } from '@prismai/domain';
// Importe les RPC atomiques de crédits et le client backend pour la persistance.
import { reserveCredits, completeCredits, refundCredits, getSupabaseAdminClient } from '@prismai/db';
// Importe le routeur fournisseur avec fallback borné.
import { chatWithFallback, type FallbackOptions } from '@prismai/provider-router';
// Réexporte les contrats SSE existants.
export * from './stream';
// Décrit les paramètres stables d’un tour logique et de son opération de crédit.
export type ChatRuntimeOptions = { fallback?: FallbackOptions; estimatedTokens?: number; idempotencyKey?: string; runId?: string };
// Exécute un tour après réservation atomique et finalise ou rembourse la réservation selon le résultat.
export async function runChatTurn(userId: string, messages: ChatMessage[], options: ChatRuntimeOptions = {}) {
  // Estime le volume avant l’appel fournisseur pour borner la réservation initiale.
  const estimatedTokens = options.estimatedTokens ?? Math.max(100, messages.reduce((sum, message) => sum + message.content.length / 4, 0));
  // Calcule le coût de réservation avec le tarif prudent du premier provider.
  const estimatedCost = calculateCreditCost('groq', estimatedTokens);
  // Utilise la même clé lors des reprises explicites au lieu d’une clé par tentative réseau.
  const idempotencyKey = options.idempotencyKey ?? randomUUID();
  // Réserve sous verrou SQL avant toute dépense fournisseur.
  const operationId = await reserveCredits(userId, idempotencyKey, estimatedCost, options.runId);
  // Suit l’état pour ne jamais rembourser une opération déjà finalisée.
  let finalized = false;
  try {
    // Aucun provider n’est appelé avant la confirmation de la réservation.
    const response = await chatWithFallback(messages, userId, options.fallback);
    // Calcule le coût réel à partir du provider et des tokens effectivement rapportés.
    const finalCost = calculateCreditCost(response.provider_used, response.tokens || estimatedTokens);
    // Finalise atomiquement et libère la différence entre estimation et coût réel.
    const completed = await completeCredits(operationId, finalCost);
    finalized = true;
    // Persiste la conversation après la réussite financière, sans clé service côté navigateur.
    const supabase = getSupabaseAdminClient() as any;
    const { data: conversation } = await supabase.from('conversations').insert({ user_id: userId, title: messages.find((message) => message.role === 'user')?.content.slice(0, 80) ?? 'Nouvelle conversation' }).select('id').single();
    if (conversation?.id) {
      await supabase.from('messages').insert([
        ...messages.map((message) => ({ conversation_id: conversation.id, user_id: userId, role: message.role, content: message.content })),
        { conversation_id: conversation.id, user_id: userId, role: 'assistant', content: response.content, provider_used: response.provider_used, tokens: response.tokens },
      ]);
    }
    // Retourne le solde réellement issu de la finalisation SQL.
    return { ...response, balance: completed.balance };
  } catch (error) {
    // Libère la réservation uniquement si la finalisation n’a pas abouti.
    if (!finalized) {
      try { await refundCredits(operationId, 'provider_or_runtime_failure'); } catch { /* La base reste l’autorité si le remboursement échoue. */ }
    }
    // Conserve l’erreur métier pour que la route applique son contrat HTTP stable.
    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') throw insufficientCredits();
    throw error;
  }
}
