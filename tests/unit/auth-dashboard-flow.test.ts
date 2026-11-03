// Importe les assertions et le cycle de préparation Vitest.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// Importe la lecture de sources pour vérifier les invariants d’intégration côté serveur.
import { readFileSync } from 'node:fs';
// Importe les handlers réels afin de vérifier la réponse de configuration absente.
import { POST as loginPost } from '../../apps/web/app/api/auth/login/route';
// Importe le handler réel d’inscription pour le même scénario sécurisé.
import { POST as signupPost } from '../../apps/web/app/api/auth/signup/route';

// Conserve les variables Auth de l’environnement de test.
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Conserve la clé publique éventuelle de l’environnement de test.
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Décrit les contrats indispensables du parcours Auth vers Dashboard.
describe('auth vers dashboard', () => {
  // Force le scénario sans configuration externe pour rester non destructif.
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  // Restaure les variables de la session après chaque test.
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  // Vérifie qu’un login non configuré ne prétend jamais avoir établi une session.
  it('refuse la connexion avec 503 sans configuration Supabase', async () => {
    const response = await loginPost(new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password123' }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AUTH_NOT_CONFIGURED' });
  });

  // Vérifie qu’une inscription non configurée ne redirige jamais vers le Dashboard.
  it('refuse l’inscription avec 503 sans configuration Supabase', async () => {
    const response = await signupPost(new Request('http://localhost/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password123', fullName: 'Test PrismAI' }) }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AUTH_NOT_CONFIGURED' });
  });

  // Vérifie que les handlers ne signalent une réussite qu’après getUser.
  it('exige sessionEstablished et getUser dans les handlers', () => {
    const loginSource = readFileSync('apps/web/app/api/auth/login/route.ts', 'utf8');
    const signupSource = readFileSync('apps/web/app/api/auth/signup/route.ts', 'utf8');
    expect(loginSource).toContain('sessionEstablished: true');
    expect(signupSource).toContain('sessionEstablished: true');
    expect(loginSource).toContain('supabase.auth.getUser()');
    expect(signupSource).toContain('supabase.auth.getUser()');
  });

  // Vérifie que le Dashboard ne contient plus les anciennes valeurs simulées.
  it('protège le Dashboard et utilise le résumé crédit de l’utilisateur courant', () => {
    const dashboardSource = readFileSync('apps/web/app/dashboard/page.tsx', 'utf8');
    expect(dashboardSource).toContain("supabase.auth.getUser()");
    expect(dashboardSource).toContain("supabase.from('profiles')");
    expect(dashboardSource).toContain("supabase.rpc('get_my_credit_summary')");
    expect(dashboardSource).toContain('wallet_available');
    expect(dashboardSource).toContain('daily_available');
    expect(dashboardSource).not.toContain("supabase.from('credits')");
    expect(dashboardSource).toContain('dashboard-empty');
    expect(dashboardSource).not.toContain('10 000');
    expect(dashboardSource).not.toContain('Essentiel');
  });

  // Vérifie que la RPC ne prend pas d’identifiant client et est accordée à authenticated seulement.
  it('limite la RPC résumé crédit à auth.uid()', () => {
    const migration = readFileSync('supabase/migrations/006_user_credit_summary.sql', 'utf8').toLowerCase();
    expect(migration).toContain('security definer');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('revoke all on function public.get_my_credit_summary() from public, anon');
    expect(migration).toContain('grant execute on function public.get_my_credit_summary() to authenticated');
  });
});
