// Importe le client admin commun, réservé aux appels backend.
import { getSupabaseAdminClient } from './client';
// Vérifie le solde uniquement pour les compatibilités internes non concurrentes.
export async function checkCredits(userId: string, estimatedCost: number) { const { data, error } = await getSupabaseAdminClient().rpc('check_credits', { p_user_id: userId, p_estimated_cost: estimatedCost }); if (error) throw error; return Boolean(data); }
// Réserve atomiquement des crédits avant l’appel d’un fournisseur IA.
export async function reserveCredits(userId: string, idempotencyKey: string, estimatedAmount: number, runId?: string) { const { data, error } = await getSupabaseAdminClient().rpc('reserve_credits', { p_user_id: userId, p_idempotency_key: idempotencyKey, p_estimated_amount: estimatedAmount, p_run_id: runId ?? null }); if (error) throw error; return String(data); }
// Réclame une réservation une seule fois avant l’appel IA; un rejeu reçoit false sans relancer le provider.
export async function claimCreditOperation(userId: string, operationId: string) { const { data, error } = await getSupabaseAdminClient().rpc('claim_credit_operation', { p_user_id: userId, p_operation_id: operationId }); if (error) throw error; return Boolean(data); }
// Finalise la réservation avec le coût réel via le nom exact de la RPC SQL.
export async function completeCredits(operationId: string, finalAmount: number) { const { data, error } = await getSupabaseAdminClient().rpc('complete_credits', { p_operation_id: operationId, p_final_amount: finalAmount }); if (error) throw error; return { balance: Number(data ?? 0) }; }
// Conserve un alias explicite pour les appelants historiques, sans appeler une RPC inexistante.
export const finalizeOperation = completeCredits;
// Rembourse exactement une réservation non finalisée après un échec fournisseur.
export async function refundCredits(operationId: string, reason = 'provider_failure') { const { data, error } = await getSupabaseAdminClient().rpc('refund_credits', { p_operation_id: operationId, p_reason: reason }); if (error) throw error; return { balance: Number(data ?? 0) }; }
// Conserve un alias de compatibilité vers la RPC refund_credits réelle.
export const refundOperation = refundCredits;
// Incrémente le rate limit atomique réservé aux endpoints backend.
export async function consumeRateLimit(key: string, windowSeconds: number, limit: number) { const { data, error } = await getSupabaseAdminClient().rpc('consume_rate_limit', { p_key: key, p_window_seconds: windowSeconds, p_limit: limit }); if (error) throw error; return Boolean(data); }
// Réexporte le constructeur backend pour les repositories serveur.
export { getSupabaseAdminClient };
