// Importe le client admin réservé aux webhooks backend vérifiés.
import { getSupabaseAdminClient } from './client';
// Crédite un paiement après validation cryptographique et délègue l’idempotence à PostgreSQL.
export async function creditPayment(userId: string, txId: string, amount: number, method: 'stripe' | 'campay' | 'cinetpay') { const { data, error } = await getSupabaseAdminClient().rpc('credit_payment_v2', { p_user_id: userId, p_tx_id: txId, p_amount: amount, p_method: method }); if (error) throw error; return { balance: Number(data ?? 0) }; }
