// Importe la réponse Next.js et le contrat d’entrée chat.
import { NextResponse } from 'next/server';
import { chatRequestSchema } from '@prismai/contracts';
import { runChatTurn } from '@prismai/chat-runtime';
// Expose le endpoint POST du chat avec validation et gestion d’erreurs.
export async function POST(request: Request) { try { const input = chatRequestSchema.parse(await request.json()); return NextResponse.json(await runChatTurn('00000000-0000-0000-0000-000000000000', input.messages)); } catch (error: any) { return NextResponse.json({ error: error?.message ?? 'CHAT_FAILED' }, { status: 500 }); } }
