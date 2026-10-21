import { NextResponse } from 'next/server';
import { authConfigMissingResponse, authErrorResponse } from '../../../../lib/authErrors';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  if (!supabase) return authConfigMissingResponse();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error) return authErrorResponse(error.message, 502);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
