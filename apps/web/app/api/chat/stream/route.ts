import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { chatRequestSchema } from '@prismai/contracts';
import { getConfiguredModels } from '@prismai/provider-router';
import { createRunEvents, encodeSse, createRunId, runChatTurn } from '@prismai/chat-runtime';
import { consumeRateLimit } from '@prismai/db';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
import { isInvalidSessionError, runtimeChatErrorResponse, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../../lib/chatErrors';
import { getChatPlanTier } from '../../../../lib/chatPlan';

export async function POST(request: Request) {
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return unexpectedChatErrorResponse('CHAT_STREAM_FAILED'); }
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  let authResult;
  try { authResult = await supabase.auth.getUser(); } catch { return unexpectedChatErrorResponse('CHAT_STREAM_FAILED'); }
  if (authResult.error && isInvalidSessionError(authResult.error)) return unauthorizedResponse();
  if (authResult.error) return unexpectedChatErrorResponse('CHAT_STREAM_FAILED');
  const user = authResult.data.user;
  if (!user) return unauthorizedResponse();
  try {
    if (!(await consumeRateLimit(`chat-stream:${user.id}`, 60, 30))) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  } catch { return unexpectedChatErrorResponse('CHAT_STREAM_FAILED'); }

  try {
    const input = chatRequestSchema.parse(await request.json());
    const models = getConfiguredModels();
    if (!models.length) return NextResponse.json({ error: 'NO_PROVIDER_CONFIGURED' }, { status: 503 });
    if (input.conversationId) {
      const { data, error } = await supabase.from('conversations').select('id').eq('id', input.conversationId).eq('user_id', user.id).maybeSingle();
      if (error) return unexpectedChatErrorResponse('CHAT_STREAM_FAILED');
      if (!data) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
    }
    const idempotencyKey = request.headers.get('idempotency-key') ?? `chat-stream:${user.id}:${randomUUID()}`;
    const planTier = await getChatPlanTier(supabase, user.id);
    const response = await runChatTurn(user.id, input.messages, { idempotencyKey, conversationId: input.conversationId, planTier, signal: request.signal });
    const body = createRunEvents(createRunId(), input.messages, response.content, response.fallback_used, response.creditsSpent).map(encodeSse).join('');
    return new Response(body, { headers: { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream; charset=utf-8', 'x-prismai-balance': String(response.balance), ...(response.conversationId ? { 'x-prismai-conversation-id': response.conversationId } : {}) } });
  } catch (error: unknown) { return runtimeChatErrorResponse(error, 'CHAT_STREAM_FAILED'); }
}
