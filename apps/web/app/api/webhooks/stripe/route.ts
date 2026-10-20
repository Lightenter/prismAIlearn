// Importe la réponse Next.js pour normaliser les réponses webhook.
import { NextResponse } from 'next/server';
// Importe le schéma de validation du paiement normalisé.
import { paymentWebhookSchema } from '@prismai/contracts';
// Importe la RPC backend idempotente de crédit.
import { creditPayment } from '@prismai/db';
// Importe la vérification native du format Stripe-Signature.
import { verifyStripeWebhook } from '../../../../lib/webhookSecurity';
// Force le runtime Node pour les primitives crypto et le client Supabase serveur.
export const runtime = 'nodejs';
// Traite Stripe uniquement après vérification de la signature du corps brut.
export async function POST(request: Request) {
  // Lit le corps brut nécessaire à la signature Stripe.
  const rawBody = await request.text();
  // Vérifie timestamp et digest avant de parser l’événement.
  if (!verifyStripeWebhook(rawBody, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)) return NextResponse.json({ error: 'INVALID_WEBHOOK_SIGNATURE' }, { status: 400 });
  // Parse le corps déjà authentifié cryptographiquement.
  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 }); }
  // Ne crédite que les paiements effectivement finalisés par Stripe.
  if (payload.type !== 'checkout.session.completed' && payload.type !== 'payment_intent.succeeded') return NextResponse.json({ received: true });
  // Extrait uniquement les champs Stripe nécessaires puis les valide avec le contrat partagé.
  const object = payload.data?.object ?? {};
  const normalized = paymentWebhookSchema.safeParse({ userId: object.metadata?.user_id ?? object.client_reference_id, txId: object.payment_intent ?? object.id, amount: Number(object.amount_total ?? object.amount_received ?? object.amount), status: 'SUCCESSFUL' });
  if (!normalized.success) return NextResponse.json({ error: 'INVALID_WEBHOOK_PAYLOAD' }, { status: 400 });
  try {
    // La RPC service_role déduplique l’identifiant Stripe et crédite une seule fois.
    await creditPayment(normalized.data.userId, normalized.data.txId, normalized.data.amount, 'stripe');
    return NextResponse.json({ received: true });
  } catch {
    // Ne révèle aucune information interne au fournisseur de paiement.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 500 });
  }
}
