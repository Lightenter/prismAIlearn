// Importe la réponse Next.js pour normaliser les réponses webhook.
import { NextResponse } from 'next/server';
// Importe le schéma de validation du paiement normalisé.
import { paymentWebhookSchema } from '@prismai/contracts';
// Importe la RPC backend idempotente de crédit.
import { creditPayment } from '@prismai/db';
// Importe la vérification HMAC du corps brut.
import { verifyHmacWebhook } from '../../../../lib/webhookSecurity';
// Force le runtime Node pour les primitives crypto et le client Supabase serveur.
export const runtime = 'nodejs';
// Traite CinetPay uniquement après validation de la signature configurée.
export async function POST(request: Request) {
  // Lit le corps brut, indispensable pour vérifier la signature avant parsing.
  const rawBody = await request.text();
  // Vérifie le HMAC CinetPay avant toute désérialisation ou écriture.
  if (!verifyHmacWebhook(rawBody, request.headers.get('x-signature') ?? request.headers.get('x-webhook-signature'), process.env.CINETPAY_WEBHOOK_SECRET)) return NextResponse.json({ error: 'INVALID_WEBHOOK_SIGNATURE' }, { status: 400 });
  // Parse le corps uniquement après authentification cryptographique.
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 }); }
  // Normalise les variantes de champs puis valide leur type et leur domaine.
  const source = payload as Record<string, any>;
  const normalized = paymentWebhookSchema.safeParse({ userId: source.userId ?? source.user_id ?? source.metadata?.user_id, txId: source.txId ?? source.tx_id ?? source.reference ?? source.id, amount: source.amount, status: source.status ?? 'SUCCESSFUL', reference: source.reference });
  if (!normalized.success) return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 });
  // Les paiements non finalisés ne doivent pas créditer le compte.
  if (normalized.data.status === 'FAILED' || normalized.data.status === 'PENDING') return NextResponse.json({ received: true });
  try {
    // La RPC service_role déduplique tx_id et crédite une seule fois.
    await creditPayment(normalized.data.userId, normalized.data.txId, normalized.data.amount, 'cinetpay');
    return NextResponse.json({ received: true });
  } catch {
    // Ne révèle aucune information interne au fournisseur de paiement.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 500 });
  }
}
