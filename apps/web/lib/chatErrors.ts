// Importe la réponse Next.js pour conserver un format JSON homogène entre les routes.
import { NextResponse } from 'next/server';
// Décrit les informations publiques minimales qu’une erreur peut porter.
type ErrorMetadata = { code?: unknown; status?: unknown; name?: unknown };
// Convertit prudemment une valeur inconnue en métadonnées inspectables sans lire son message.
function metadata(error: unknown): ErrorMetadata { return typeof error === 'object' && error !== null ? error as ErrorMetadata : {}; }
// Détermine si Supabase a explicitement signalé une session absente ou invalide.
export function isInvalidSessionError(error: unknown) { const details = metadata(error); return details.status === 401 || details.code === 'invalid_token' || details.name === 'AuthSessionMissingError'; }
// Retourne une réponse 401 stable pour une session qui n’est pas utilisable.
export function unauthorizedResponse() { return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }); }
// Retourne une réponse serveur générique sans exposer message, stack, token, SQL ou provider.
export function unexpectedChatErrorResponse(fallbackCode: 'CHAT_FAILED' | 'CHAT_STREAM_FAILED') { return NextResponse.json({ error: fallbackCode }, { status: 500 }); }
// Préserve uniquement les codes métier explicitement autorisés par le contrat HTTP actuel.
export function runtimeChatErrorResponse(error: unknown, fallbackCode: 'CHAT_FAILED' | 'CHAT_STREAM_FAILED') { const code = metadata(error).code; if (code === 'INSUFFICIENT_CREDITS') return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 }); if (code === 'UNAUTHORIZED') return unauthorizedResponse(); return unexpectedChatErrorResponse(fallbackCode); }
