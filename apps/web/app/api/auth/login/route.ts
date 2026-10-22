// Importe la réponse JSON sécurisée de Next.js.
import { NextResponse } from 'next/server';
// Importe les réponses d’erreur normalisées du parcours Auth.
import { authConfigMissingResponse, authErrorResponse } from '../../../../lib/authErrors';
// Importe le client Supabase SSR qui gère les cookies httpOnly.
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

// Traite la connexion sans autoriser de redirection avant vérification de l’identité.
export async function POST(request: Request) {
  // Décrit uniquement les champs attendus du navigateur.
  let body: { email?: unknown; password?: unknown };
  // Refuse les corps JSON malformés sans divulguer le détail de parsing.
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  // Vérifie les champs critiques avant l’appel Supabase.
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  // Construit le client SSR dans un bloc contrôlé.
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  // Refuse toute tentative si Supabase n’est pas configuré.
  if (!supabase) return authConfigMissingResponse();
  // Encadre l’authentification et la vérification pour masquer les erreurs internes.
  try {
    // Demande à Supabase de vérifier les identifiants et de poser le cookie de session.
    const { data, error } = await supabase.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    // Convertit l’erreur fournisseur en code stable côté navigateur.
    if (error) return authErrorResponse(error.message, 502);
    // Refuse une réussite sans session exploitable pour le Dashboard.
    if (!data.session) return NextResponse.json({ error: 'SESSION_NOT_ESTABLISHED' }, { status: 401 });
    // Vérifie l’identité depuis le cookie SSR plutôt que depuis la réponse du navigateur.
    const { data: verified, error: verificationError } = await supabase.auth.getUser();
    // Refuse toute redirection si l’identité n’est pas confirmée côté serveur.
    if (verificationError || !verified.user) return NextResponse.json({ error: 'SESSION_NOT_ESTABLISHED' }, { status: 401 });
    // Autorise le frontend à rejoindre le Dashboard après vérification complète.
    return NextResponse.json({ ok: true, sessionEstablished: true });
  // Masque les erreurs inattendues de Supabase.
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
