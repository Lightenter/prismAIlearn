import { NextResponse } from 'next/server';
import { chatRequestSchema } from '@prismai/contracts';
import { createRunEvents, encodeSse, createRunId, runChatTurn } from '@prismai/chat-runtime';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const input = chatRequestSchema.parse(await request.json());
    const response = await runChatTurn(user.id, input.messages);
    const body = createRunEvents(createRunId(), input.messages, response.content, response.provider_used, response.balance < 0 ? 0 : response.tokens).map(encodeSse).join('');
    return new Response(body, { headers: { 'cache-control': 'no-cache', connection: 'keep-alive', 'content-type': 'text/event-stream; charset=utf-8' } });
  } catch (error: any) {
    const code = error?.code ?? error?.message ?? 'CHAT_STREAM_FAILED';
    const status = code === 'INSUFFICIENT_CREDITS' ? 402 : code === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
