// Importe le client Supabase et son type générique.
import { createClient } from '@supabase/supabase-js';
// Construit le client backend uniquement avec une clé service jamais exposée au navigateur.
export function getSupabaseAdminClient() {
  // L’URL peut être publique, mais elle est lue uniquement côté serveur.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // La clé service est obligatoire pour les RPC internes et les écritures serveur.
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Refuse explicitement le fallback dangereux vers NEXT_PUBLIC_SUPABASE_ANON_KEY.
  if (!url || !key) throw new Error('SUPABASE_SERVICE_CONFIG_MISSING');
  // Désactive la persistance locale : ce client serveur ne doit jamais stocker une session utilisateur.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
