import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
import { isInvalidSessionError, unauthorizedResponse, unexpectedChatErrorResponse } from '../../../../lib/chatErrors';

export async function GET() {
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return unexpectedChatErrorResponse('CHAT_FAILED'); }
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_CONFIG_MISSING' }, { status: 503 });
  let authResult;
  try { authResult = await supabase.auth.getUser(); } catch { return unexpectedChatErrorResponse('CHAT_FAILED'); }
  if (authResult.error && isInvalidSessionError(authResult.error)) return unauthorizedResponse();
  if (authResult.error) return unexpectedChatErrorResponse('CHAT_FAILED');
  const user = authResult.data.user;
  if (!user) return unauthorizedResponse();
  const { data, error } = await supabase.from('conversations').select('id,title,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100);
  if (error) return unexpectedChatErrorResponse('CHAT_FAILED');
  return NextResponse.json({ conversations: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}
