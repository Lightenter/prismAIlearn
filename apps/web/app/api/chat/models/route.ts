import { NextResponse } from 'next/server';
import { getConfiguredModels } from '@prismai/provider-router';
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
  if (!authResult.data.user) return unauthorizedResponse();
  return NextResponse.json({ models: getConfiguredModels() }, { headers: { 'cache-control': 'no-store' } });
}
