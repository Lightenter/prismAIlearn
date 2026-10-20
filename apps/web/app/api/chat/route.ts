// Importe la réponse Next.js pour conserver le format HTTP actuel.
import { NextResponse } from 'next/server';
// Importe le contrat qui valide uniquement les champs fonctionnels du chat.
import { chatRequestSchema } from '@prismai/contracts';
// Importe le runtime qui reçoit désormais l’identité vérifiée côté serveur.
import { runChatTurn } from '@prismai/chat-runtime';
// Importe le client Supabase configuré pour lire les cookies de session serveur.
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
// Importe la politique partagée de réponses sûres.
import { isInvalidSessionError, runtimeChatErrorResponse, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../lib/chatErrors';
// Expose le endpoint POST du chat avec authentification avant toute opération métier.
export async function POST(request: Request) {
  // Déclare le client avant le bloc de configuration pour pouvoir intercepter sa création.
  let supabase;
  // Encadre la création du client afin qu’une erreur inattendue reste générique.
  try {
    // Construit le client serveur à partir de la configuration de l’environnement.
    supabase = createSupabaseServerClient();
  } catch {
    // Masque toute erreur interne de configuration ou de création du client.
    return unexpectedChatErrorResponse('CHAT_FAILED');
  }
  // Conserve le statut 503 lorsque la configuration requise est explicitement absente.
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  // Déclare le résultat d’authentification avant d’appeler Supabase.
  let authResult;
  // Encadre la vérification du jeton afin de distinguer invalidité prouvée et panne inattendue.
  try {
    // Récupère l’utilisateur depuis le jeton vérifié par Supabase.
    authResult = await supabase.auth.getUser();
  } catch {
    // Ne transforme pas une exception inconnue en 401 et ne renvoie aucun détail interne.
    return unexpectedChatErrorResponse('CHAT_FAILED');
  }
  // Refuse une session explicitement absente ou déclarée invalide par Supabase.
  if (authResult.error && isInvalidSessionError(authResult.error)) return unauthorizedResponse();
  // Traite une erreur Supabase non classifiée comme une erreur serveur générique.
  if (authResult.error) return unexpectedChatErrorResponse('CHAT_FAILED');
  // Refuse une réponse sans utilisateur même si Supabase n’a pas fourni d’erreur.
  if (!authResult.data.user) return unauthorizedResponse();
  // Valide le contenu fonctionnel après le contrôle d’identité.
  try {
    // Parse le corps sans accepter d’identifiant utilisateur comme preuve d’identité.
    const input = chatRequestSchema.parse(await request.json());
    // Transmet exclusivement l’identifiant issu de Supabase au runtime sensible.
    return NextResponse.json(await runChatTurn(authResult.data.user.id, input.messages));
  } catch (error: unknown) {
    // Préserve les codes métier autorisés et masque tous les autres détails.
    return runtimeChatErrorResponse(error, 'CHAT_FAILED');
  }
}
