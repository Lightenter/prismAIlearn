// Importe la réponse Next.js pour les erreurs JSON hors flux SSE.
import { NextResponse } from 'next/server';
// Importe le contrat d’entrée chat partagé.
import { chatRequestSchema } from '@prismai/contracts';
// Importe le runtime et les encodeurs d’événements SSE.
import { createRunEvents, encodeSse, createRunId, runChatTurn } from '@prismai/chat-runtime';
// Importe le client Supabase serveur et sa session vérifiée.
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
// Importe la politique commune de codes et de réponses sûres.
import { isInvalidSessionError, runtimeChatErrorResponse, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../../lib/chatErrors';
// Expose le endpoint SSE avec authentification et gestion bornée des erreurs.
export async function POST(request: Request) {
  // Déclare le client avant sa création pour intercepter les erreurs de configuration inattendues.
  let supabase;
  // Encadre la création du client Supabase côté serveur.
  try {
    // Construit le client à partir des variables protégées de l’environnement.
    supabase = createSupabaseServerClient();
  } catch {
    // Retourne une erreur générique sans divulguer de détail de configuration.
    return unexpectedChatErrorResponse('CHAT_STREAM_FAILED');
  }
  // Conserve 503 lorsque les variables Supabase requises sont simplement absentes.
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  // Déclare le résultat de vérification de session avant l’appel réseau.
  let authResult;
  // Encadre l’appel Supabase afin de distinguer session invalide et panne inattendue.
  try {
    // Demande à Supabase de vérifier le jeton et de retourner l’utilisateur authentifié.
    authResult = await supabase.auth.getUser();
  } catch {
    // Ne convertit pas une exception inconnue en 401 et ne renvoie aucun message interne.
    return unexpectedChatErrorResponse('CHAT_STREAM_FAILED');
  }
  // Retourne 401 uniquement lorsque Supabase prouve que la session est absente ou invalide.
  if (authResult.error && isInvalidSessionError(authResult.error)) return unauthorizedResponse();
  // Retourne 500 pour une erreur de vérification non classifiée.
  if (authResult.error) return unexpectedChatErrorResponse('CHAT_STREAM_FAILED');
  // Refuse une réponse Supabase dépourvue d’utilisateur authentifié.
  if (!authResult.data.user) return unauthorizedResponse();
  // Encadre la validation, l’exécution et l’encodage du run.
  try {
    // Valide le corps de requête après le contrôle d’identité.
    const input = chatRequestSchema.parse(await request.json());
    // Exécute le runtime avec l’identifiant vérifié, jamais avec une valeur du navigateur.
    const response = await runChatTurn(authResult.data.user.id, input.messages);
    // Construit les événements SSE typés avec un identifiant de run nouveau.
    const body = createRunEvents(createRunId(), input.messages, response.content, response.provider_used, response.balance < 0 ? 0 : response.tokens).map(encodeSse).join('');
    // Retourne le flux avec les en-têtes nécessaires au streaming sans cache.
    return new Response(body, { headers: { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream; charset=utf-8' } });
  } catch (error: unknown) {
    // Préserve le statut 402 des crédits et masque toute autre erreur interne.
    return runtimeChatErrorResponse(error, 'CHAT_STREAM_FAILED');
  }
}
