// Importe le client Supabase serveur et ses options de cookies.
import { createServerClient } from '@supabase/ssr';
// Crée le client serveur uniquement lorsque les variables publiques existent.
export function createSupabaseServerClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) return null; return createServerClient(url, key, { cookies: { getAll() { return []; }, setAll() {} } }); }
