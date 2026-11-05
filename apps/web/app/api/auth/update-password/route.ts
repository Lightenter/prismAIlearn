import { NextResponse } from 'next/server';
import { authConfigMissingResponse, authFailureResponse } from '../../../../lib/authErrors';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export async function POST(request: Request) {
  let body: { password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  if (typeof body.password !== 'string' || body.password.length < 8) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  if (!supabase) return authConfigMissingResponse();
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: 'SESSION_REQUIRED' }, { status: 401 });
    const { error } = await supabase.auth.updateUser({ password: body.password });
    if (error) return authFailureResponse(error);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
