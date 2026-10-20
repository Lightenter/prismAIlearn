// Importe Vitest pour vérifier les invariants sans appeler un service externe.
import { describe, expect, it } from 'vitest';
// Importe les helpers cryptographiques serveur.
import { verifyHmacWebhook, verifyStripeWebhook } from '../../apps/web/lib/webhookSecurity';
// Importe les décisions RBAC pures.
import { authorizeRole } from '@prismai/authz';
// Importe le module de lecture de fichiers pour vérifier les contrats versionnés.
import { readFileSync } from 'node:fs';
// Importe HMAC pour fabriquer uniquement des signatures de test.
import { createHmac } from 'node:crypto';

describe('security hardening contracts', () => {
  it('vérifie les signatures HMAC sans accepter une signature altérée', () => {
    const body = '{"txId":"tx-test"}';
    const secret = 'test-secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmacWebhook(body, signature, secret)).toBe(true);
    expect(verifyHmacWebhook(`${body}x`, signature, secret)).toBe(false);
  });
  it('applique le format RBAC user/premium/admin', () => {
    expect(authorizeRole('admin', 'admin').allowed).toBe(true);
    expect(authorizeRole('user', 'admin').allowed).toBe(false);
    expect(authorizeRole('premium', 'premium').status).toBe(200);
  });
  it('conserve les invariants SQL de réservation et les révocations utilisateur', () => {
    const migration = readFileSync('supabase/migrations/002_security_hardening.sql', 'utf8');
    expect(migration).toContain('function public.reserve_credits');
    expect(migration).toContain('function public.complete_credits');
    expect(migration).toContain('function public.refund_credits');
    expect(migration).toContain('revoke all on function public.reserve_credits');
    expect(migration).toContain('function public.consume_rate_limit');
  });
  it('ne conserve pas le schéma concurrent check puis deduct dans le runtime', () => {
    const runtime = readFileSync('packages/chat-runtime/src/index.ts', 'utf8');
    expect(runtime).toContain('reserveCredits(');
    expect(runtime).toContain('completeCredits(');
    expect(runtime).toContain('refundCredits(');
    expect(runtime).not.toContain('checkCredits(');
    expect(runtime).not.toContain('deductCredits(');
  });
});
