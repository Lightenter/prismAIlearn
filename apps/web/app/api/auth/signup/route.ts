import { NextResponse } from 'next/server';
import { authConfigMissingResponse, authErrorResponse } from '../../../../lib/authErrors';
import { getAppOrigin } from '../../../../lib/requestOrigin';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; fullName?: unknown; referralCode?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || typeof body.fullName !== 'string' || !body.email.trim() || !body.fullName.trim() || body.password.length < 8) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return authConfigMissingResponse(); }
  if (!supabase) return authConfigMissingResponse();
  const callback = new URL('/auth/callback', getAppOrigin(request));
  callback.searchParams.set('next', '/login?confirmed=1');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: body.email.trim(), password: body.password,
      options: {
        data: { full_name: body.fullName.trim(), display_name: body.fullName.trim(), ...(typeof body.referralCode === 'string' && body.referralCode.trim() ? { referral_code: body.referralCode.trim() } : {}) },
        emailRedirectTo: callback.toString(),
      },
    });
    if (error) return authErrorResponse(error.message);
    return NextResponse.json({ ok: true, emailConfirmationRequired: !data.session }, { status: 201 });
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 502 }); }
}
