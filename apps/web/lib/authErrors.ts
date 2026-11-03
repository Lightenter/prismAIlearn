import { NextResponse } from 'next/server';

export function authErrorResponse(message: string, fallbackStatus = 400) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  if (normalized.includes('email not confirmed')) return NextResponse.json({ error: 'EMAIL_NOT_CONFIRMED' }, { status: 403 });
  if (normalized.includes('user already registered')) return NextResponse.json({ error: 'ACCOUNT_ALREADY_EXISTS' }, { status: 409 });
  if (normalized.includes('password should be at least')) return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
  if (normalized.includes('unable to validate email') || normalized.includes('invalid email')) return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  if (normalized.includes('signup is disabled') || normalized.includes('signups not allowed')) return NextResponse.json({ error: 'SIGNUP_DISABLED' }, { status: 403 });
  if (normalized.includes('email rate limit exceeded') || normalized.includes('rate limit')) return NextResponse.json({ error: 'AUTH_RATE_LIMITED' }, { status: 429 });
  if (normalized.includes('captcha')) return NextResponse.json({ error: 'CAPTCHA_REQUIRED' }, { status: 400 });
  return NextResponse.json({ error: 'AUTH_REQUEST_FAILED' }, { status: fallbackStatus });
}

export function authConfigMissingResponse() {
  return NextResponse.json({ error: 'AUTH_NOT_CONFIGURED' }, { status: 503 });
}
