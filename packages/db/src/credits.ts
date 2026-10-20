// Importe le client admin commun.
import { getSupabaseAdminClient } from './client';
// Vérifie le solde avant une opération coûteuse.
export async function checkCredits(userId: string, estimatedCost: number) { const { data, error } = await getSupabaseAdminClient().rpc('check_credits', { p_user_id: userId, p_estimated_cost: estimatedCost }); if (error) throw error; return Boolean(data); }
// Déduit les crédits via la RPC historique compatible avec le schéma initial.
export async function deductCredits(userId: string, model: string, tokens: number) { const { data, error } = await getSupabaseAdminClient().rpc('deduct_credits', { p_user_id: userId, p_model: model, p_tokens: tokens }); if (error) throw error; return { balance: Number(data ?? 0) }; }
// Réserve les crédits avec une clé idempotente.
export async function reserveCredits(userId: string, idempotencyKey: string, estimatedAmount: number, runId?: string) { const { data, error } = await getSupabaseAdminClient().rpc('reserve_credits', { p_user_id: userId, p_idempotency_key: idempotencyKey, p_estimated_amount: estimatedAmount, p_run_id: runId ?? null }); if (error) throw error; return String(data); }
// Finalise une opération et enregistre le coût réel.
export async function finalizeOperation(operationId: string, finalAmount: number, providerUsed: string, tokens: number) { const { data, error } = await getSupabaseAdminClient().rpc('finalize_operation', { p_operation_id: operationId, p_final_amount: finalAmount, p_provider_used: providerUsed, p_tokens: tokens }); if (error) throw error; return Number(data ?? 0); }
// Rembourse une réservation lorsque le provider échoue.
export async function refundOperation(operationId: string) { const { data, error } = await getSupabaseAdminClient().rpc('refund_operation', { p_operation_id: operationId }); if (error) throw error; return Number(data ?? 0); }
export { getSupabaseAdminClient };
