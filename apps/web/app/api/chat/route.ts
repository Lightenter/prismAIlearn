import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { chatRequestSchema } from '@prismai/contracts';
import { getConfiguredModels } from '@prismai/provider-router';
import { runChatTurn } from '@prismai/chat-runtime';
import { consumeRateLimit } from '@prismai/db';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { isInvalidSessionError, runtimeChatErrorResponse, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../lib/chatErrors';

export async function POST(request: Request) {
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return unexpectedChatErrorResponse('CHAT_FAILED'); }
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  let authResult;
  try { authResult = await supabase.auth.getUser(); } catch { return unexpectedChatErrorResponse('CHAT_FAILED'); }
  if (authResult.error && isInvalidSessionError(authResult.error)) return unauthorizedResponse();
  if (authResult.error) return unexpectedChatErrorResponse('CHAT_FAILED');
  const user = authResult.data.user;
  if (!user) return unauthorizedResponse();
  try {
    if (!(await consumeRateLimit(`chat:${user.id}`, 60, 30))) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  } catch { return unexpectedChatErrorResponse('CHAT_FAILED'); }

  try {
    const input = chatRequestSchema.parse(await request.json());
    const models = getConfiguredModels();
    if (!models.length) return NextResponse.json({ error: 'NO_PROVIDER_CONFIGURED' }, { status: 503 });
    const selected = !input.model || input.model === 'auto' ? undefined : models.find((model) => model.id === input.model);
    if (input.model && input.model !== 'auto' && !selected) return NextResponse.json({ error: 'MODEL_UNAVAILABLE' }, { status: 400 });
    if (input.conversationId) {
      const { data, error } = await supabase.from('conversations').select('id').eq('id', input.conversationId).eq('user_id', user.id).maybeSingle();
      if (error) return unexpectedChatErrorResponse('CHAT_FAILED');
      if (!data) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
    }
    const idempotencyKey = request.headers.get('idempotency-key') ?? `chat:${user.id}:${randomUUID()}`;
    const response = await runChatTurn(user.id, input.messages, { idempotencyKey, conversationId: input.conversationId, model: selected?.id, signal: request.signal });
    return NextResponse.json(response);
  } catch (error: unknown) { return runtimeChatErrorResponse(error, 'CHAT_FAILED'); }
}
