// Importe le client SSR Supabase et ses options de cookies typées.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Importe le magasin de cookies de la requête serveur Next.js.
import { cookies } from 'next/headers';
// Crée un client SSR qui vérifie et renouvelle la session via rotation Supabase.
export function createSupabaseServerClient() {
  // Lit les variables publiques nécessaires au client Auth, sans accepter de valeur du navigateur.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Lit la clé anon prévue pour vérifier les sessions côté serveur.
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Refuse de construire un client incomplet lorsque la configuration est absente.
  if (!url || !key) return null;
  // Accède au magasin de cookies associé à la requête courante.
  const cookieStore = cookies();
  // La politique explicite couvre aussi les previews HTTPS terminées avant le serveur Node.
  const secureCookies = process.env.SUPABASE_COOKIE_SECURE === 'true';
  // Retourne un client SSR qui gère la vérification et la rotation des refresh tokens.
  return createServerClient(url, key, {
    // Branche explicitement les opérations de lecture et d’écriture sur Next.js.
    cookies: {
      // Transmet tous les cookies reçus par la requête au client Supabase.
      getAll() { return cookieStore.getAll(); },
      // Persiste les tokens renouvelés avec des attributs non lisibles par JavaScript.
      setAll(values: { name: string; value: string; options: CookieOptions }[]) {
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, httpOnly: true, secure: secureCookies, sameSite: secureCookies ? 'none' : 'lax' }));
      },
    },
  });
}
