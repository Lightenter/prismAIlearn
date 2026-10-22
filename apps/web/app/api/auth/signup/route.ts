// Importe la réponse JSON sécurisée de Next.js.
import { NextResponse } from 'next/server';
// Importe les réponses d’erreur normalisées du parcours Auth.
import { authConfigMissingResponse, authErrorResponse } from '../../../../lib/authErrors';
// Importe la construction d’URL publique pour le lien de confirmation.
import { getAppOrigin } from '../../../../lib/requestOrigin';
// Importe le client Supabase SSR qui écrit les cookies httpOnly.
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

// Traite la création de compte sans déclarer de session avant vérification serveur.
export async function POST(request: Request) {
  // Décrit uniquement les champs attendus du navigateur.
  let body: { email?: unknown; password?: unknown; fullName?: unknown; referralCode?: unknown };
  // Refuse les corps JSON malformés sans exposer l’erreur interne.
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  // Valide les champs critiques avant tout appel à Supabase.
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || typeof body.fullName !== 'string' || !body.email.trim() || !body.fullName.trim() || body.password.length < 8) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  // Construit le client SSR dans un bloc contrôlé pour conserver la réponse 503 de configuration.
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  // Refuse toute tentative si Supabase n’est pas configuré.
  if (!supabase) return authConfigMissingResponse();
  // Construit le callback de confirmation sans accepter une URL fournie par le navigateur.
  const callback = new URL('/auth/callback', getAppOrigin(request));
  // Renvoie l’utilisateur vers la connexion après confirmation lorsqu’aucune session immédiate n’est possible.
  callback.searchParams.set('next', '/login?confirmed=1');
  // Encadre l’appel Auth pour ne pas divulguer de détail fournisseur.
  try {
    // Demande à Supabase de créer le compte et de poser les cookies éventuels.
    const { data, error } = await supabase.auth.signUp({
      // Transmet l’e-mail normalisé au serveur Auth.
      email: body.email.trim(),
      // Transmet le mot de passe uniquement à Supabase Auth via HTTPS.
      password: body.password,
      // Conserve le nom et le code facultatif dans les métadonnées d’inscription.
      options: { data: { full_name: body.fullName.trim(), display_name: body.fullName.trim(), ...(typeof body.referralCode === 'string' && body.referralCode.trim() ? { referral_code: body.referralCode.trim() } : {}) }, emailRedirectTo: callback.toString() },
    });
    // Convertit les erreurs Supabase en codes stables pour le frontend.
    if (error) return authErrorResponse(error.message);
    // Attend la confirmation e-mail au lieu d’ouvrir un Dashboard sans session.
    if (!data.session) return NextResponse.json({ ok: true, sessionEstablished: false, emailConfirmationRequired: true }, { status: 201 });
    // Vérifie que le cookie de session posé par l’appel est réellement lisible côté serveur.
    const { data: verified, error: verificationError } = await supabase.auth.getUser();
    // Refuse la redirection privée si l’identité ne peut pas être vérifiée.
    if (verificationError || !verified.user) return NextResponse.json({ error: 'SESSION_NOT_ESTABLISHED' }, { status: 401 });
    // Autorise le frontend à rediriger uniquement après vérification de la session.
    return NextResponse.json({ ok: true, sessionEstablished: true, emailConfirmationRequired: false }, { status: 201 });
  // Masque les erreurs inattendues du fournisseur d’authentification.
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
