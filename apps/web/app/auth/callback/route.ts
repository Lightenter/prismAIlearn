import { NextResponse } from 'next/server';
import { getAppOrigin } from '../../../lib/requestOrigin';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/chat';
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getAppOrigin(request);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));
  const loginError = new URL('/login?error=verification', origin);
  if (!code) return NextResponse.redirect(loginError);

  let supabase;
  try {
    supabase = createSupabaseServerClient();
    if (!supabase) return NextResponse.redirect(new URL('/login?error=verification', origin));
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(loginError);
    return NextResponse.redirect(new URL(next, origin));
  } catch {
    return NextResponse.redirect(loginError);
  }
}
