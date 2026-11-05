import { NextResponse } from 'next/server';
import { authConfigMissingResponse, authFailureResponse } from '../../../../lib/authErrors';
import { getAppOrigin } from '../../../../lib/requestOrigin';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export async function POST(request: Request) {
  let body: { email?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  if (typeof body.email !== 'string' || !body.email.trim()) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  if (!supabase) return authConfigMissingResponse();
  const callback = new URL('/auth/callback', getAppOrigin(request));
  callback.searchParams.set('next', '/reset-password');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(body.email.trim(), { redirectTo: callback.toString() });
    if (error) return authFailureResponse(error);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
