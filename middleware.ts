import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const COOKIE_NAME = 'finchat_session';

// Timing-safe string comparison — Edge runtime has no Node crypto, so XOR manually.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: login UI, auth API, and the cron sync endpoint (localhost-only)
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/gsheet-sync'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const secret = process.env.AUTH_SECRET ?? '';

  if (!secret || !safeEqual(token, secret)) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
