import { NextResponse } from 'next/server';
import { getAppOrigin } from '../../../../lib/requestOrigin';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/chat';
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getAppOrigin(request);
  let supabase;
  try { supabase = createSupabaseServerClient(); } catch { return NextResponse.redirect(new URL('/login?error=oauth', origin)); }
  if (!supabase) return NextResponse.redirect(new URL('/login?error=oauth', origin));
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', safeNextPath(url.searchParams.get('next')));
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.toString() } });
    if (error || !data.url) return NextResponse.redirect(new URL('/login?error=oauth', origin));
    return NextResponse.redirect(data.url);
  } catch { return NextResponse.redirect(new URL('/login?error=oauth', origin)); }
}
