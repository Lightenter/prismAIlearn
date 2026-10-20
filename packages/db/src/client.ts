// Importe le client Supabase et son type générique.
import { createClient } from '@supabase/supabase-js';
// Construit le client admin uniquement côté serveur avec la clé de service.
export function getSupabaseAdminClient() { const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) throw new Error('SUPABASE_CONFIG_MISSING'); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
