import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { isInvalidSessionError, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../../../lib/chatErrors';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function authenticatedClient() {
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return { error: unexpectedChatErrorResponse('CHAT_FAILED') } as const; }
  if (!supabase) return { error: NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 }) } as const;
  let authResult;
  try { authResult = await supabase.auth.getUser(); } catch { return { error: unexpectedChatErrorResponse('CHAT_FAILED') } as const; }
  if (authResult.error && isInvalidSessionError(authResult.error)) return { error: unauthorizedResponse() } as const;
  if (authResult.error) return { error: unexpectedChatErrorResponse('CHAT_FAILED') } as const;
  if (!authResult.data.user) return { error: unauthorizedResponse() } as const;
  return { supabase, user: authResult.data.user } as const;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: 'INVALID_CONVERSATION_ID' }, { status: 400 });
  const auth = await authenticatedClient(); if ('error' in auth) return auth.error;
  const { data: conversation, error } = await auth.supabase.from('conversations').select('id,title,created_at,updated_at').eq('id', params.id).eq('user_id', auth.user.id).maybeSingle();
  if (error) return unexpectedChatErrorResponse('CHAT_FAILED');
  if (!conversation) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
  const { data: messages, error: messagesError } = await auth.supabase.from('messages').select('id,role,content,tokens,created_at').eq('conversation_id', params.id).eq('user_id', auth.user.id).order('created_at', { ascending: true }).limit(200);
  if (messagesError) return unexpectedChatErrorResponse('CHAT_FAILED');
  return NextResponse.json({ conversation, messages: messages ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: 'INVALID_CONVERSATION_ID' }, { status: 400 });
  const auth = await authenticatedClient(); if ('error' in auth) return auth.error;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  const title = typeof body === 'object' && body !== null && 'title' in body && typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 80) return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400 });
  const { data, error } = await auth.supabase.from('conversations').update({ title }).eq('id', params.id).eq('user_id', auth.user.id).select('id,title,created_at,updated_at').maybeSingle();
  if (error) return unexpectedChatErrorResponse('CHAT_FAILED');
  if (!data) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ conversation: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: 'INVALID_CONVERSATION_ID' }, { status: 400 });
  const auth = await authenticatedClient(); if ('error' in auth) return auth.error;
  const { data, error } = await auth.supabase.from('conversations').delete().eq('id', params.id).eq('user_id', auth.user.id).select('id').maybeSingle();
  if (error) return unexpectedChatErrorResponse('CHAT_FAILED');
  if (!data) return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
