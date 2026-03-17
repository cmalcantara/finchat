import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { COOKIE_NAME } from '@/middleware';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const appPassword = process.env.APP_PASSWORD ?? '';
  const authSecret = process.env.AUTH_SECRET ?? '';

  if (!appPassword || !authSecret) {
    return NextResponse.json({ error: 'Server not configured — set APP_PASSWORD and AUTH_SECRET in .env.local' }, { status: 500 });
  }

  let match = false;
  try {
    const a = Buffer.from(String(password ?? ''));
    const b = Buffer.from(appPassword);
    match = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    match = false;
  }

  if (!match) {
    await new Promise(r => setTimeout(r, 500)); // blunt brute-force
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, authSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
