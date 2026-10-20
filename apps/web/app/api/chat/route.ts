// Importe la réponse Next.js pour conserver le format HTTP actuel.
import { NextResponse } from 'next/server';
// Importe le contrat qui valide uniquement les champs fonctionnels du chat.
import { chatRequestSchema } from '@prismai/contracts';
// Importe le runtime qui reçoit désormais l’identité vérifiée côté serveur.
import { runChatTurn } from '@prismai/chat-runtime';
// Importe le client Supabase configuré pour lire les cookies de session serveur.
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
// Définit une réponse d’erreur stable qui ne divulgue pas les détails internes.
function authError() { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
// Expose le endpoint POST du chat avec authentification avant toute opération métier.
export async function POST(request: Request) {
  // Refuse la requête avant de parser ou d’exécuter une opération sensible si Supabase n’est pas configuré.
  const supabase = createSupabaseServerClient();
  // Signale une configuration serveur manquante sans exposer de clé ni de stack trace.
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  // Récupère l’utilisateur depuis le jeton vérifié par Supabase et non depuis le corps HTTP.
  const { data: { user }, error: authFailure } = await supabase.auth.getUser();
  // Traite toute session absente, expirée ou invalide comme une absence d’authentification.
  if (authFailure || !user) return authError();
  // Valide le contenu fonctionnel après le contrôle d’identité.
  try {
    // Parse le corps sans accepter d’identifiant utilisateur comme preuve d’identité.
    const input = chatRequestSchema.parse(await request.json());
    // Transmet exclusivement l’identifiant issu de Supabase au runtime sensible.
    return NextResponse.json(await runChatTurn(user.id, input.messages));
  } catch (error: any) {
    // Ne renvoie qu’un code métier connu afin de ne jamais exposer un détail provider ou SQL.
    const code = error?.code === 'INSUFFICIENT_CREDITS' ? 'INSUFFICIENT_CREDITS' : 'CHAT_FAILED';
    // Conserve le statut métier des crédits et masque les autres erreurs internes.
    return NextResponse.json({ error: code }, { status: code === 'INSUFFICIENT_CREDITS' ? 402 : 500 });
  }
}
