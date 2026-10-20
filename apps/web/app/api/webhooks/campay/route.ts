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
// Traite Campay/CinetPay uniquement après validation de la signature.
export async function POST(request: Request) {
  // Lit le corps brut : le modifier avant vérification invaliderait la signature.
  const rawBody = await request.text();
  // Accepte les noms d’en-tête habituels sans jamais prendre une signature du JSON.
  const signature = request.headers.get('x-signature') ?? request.headers.get('x-webhook-signature');
  // Vérifie le HMAC avant toute désérialisation ou écriture en base.
  if (!verifyHmacWebhook(rawBody, signature, process.env.CAMPAY_WEBHOOK_SECRET)) return NextResponse.json({ error: 'INVALID_WEBHOOK_SIGNATURE' }, { status: 400 });
  // Parse et valide le payload après authentification cryptographique.
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 }); }
  // Normalise les variantes documentées sans faire confiance à un champ non validé.
  const source = payload as Record<string, any>;
  const normalized = paymentWebhookSchema.safeParse({ userId: source.userId ?? source.user_id ?? source.metadata?.user_id, txId: source.txId ?? source.tx_id ?? source.reference ?? source.id, amount: source.amount, status: source.status ?? 'SUCCESSFUL', reference: source.reference });
  if (!normalized.success) return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 });
  // Les événements non réussis sont acceptés sans créditer le compte.
  if (normalized.data.status === 'FAILED' || normalized.data.status === 'PENDING') return NextResponse.json({ received: true });
  try {
    // La RPC service_role déduplique tx_id et réalise le crédit transactionnel.
    await creditPayment(normalized.data.userId, normalized.data.txId, normalized.data.amount, 'campay');
    return NextResponse.json({ received: true });
  } catch {
    // Ne révèle ni message SQL ni détail de la clé service au fournisseur webhook.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 500 });
  }
}
