// Importe le client SSR Supabase et ses options de cookies typées.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Importe le magasin de cookies de la requête serveur Next.js.
import { cookies } from 'next/headers';
// Crée un client Supabase serveur qui conserve l’identité vérifiée de la session.
export function createSupabaseServerClient() {
  // Lit les variables publiques nécessaires au client Auth, sans accepter de valeur du navigateur.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Lit la clé anon prévue pour vérifier les sessions côté serveur.
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Refuse de construire un client incomplet lorsque la configuration est absente.
  if (!url || !key) return null;
  // Accède au magasin de cookies associé à la requête courante.
  const cookieStore = cookies();
  // Retourne un client SSR qui peut rafraîchir les cookies de session Supabase.
  return createServerClient(url, key, {
    // Branche explicitement les opérations de lecture et d’écriture sur Next.js.
    cookies: {
      // Transmet tous les cookies reçus par la requête au client Supabase.
      getAll() { return cookieStore.getAll(); },
      // Persiste les cookies renouvelés par Supabase dans la réponse serveur.
      setAll(values: { name: string; value: string; options: CookieOptions }[]) { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
    },
  });
}
