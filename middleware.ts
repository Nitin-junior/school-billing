import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/google',
  '/api/health',
  '/api/parent/activate-whatsapp',
  '/api/public',                    // public bill viewer API (no auth)
  '/parent',
  '/bill',                          // public QR bill viewer page
];

const STATIC_PREFIXES = [
  '/_next', '/favicon.ico', '/manifest.json',
  '/icon-', '/sw.js', '/workbox-',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cookie is named 'session' (set by verify-otp route)
  const token = request.cookies.get('session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const headers = new Headers(request.headers);
    headers.set('x-user-id',   String(payload.parentId ?? payload.userId ?? ''));
    headers.set('x-user-role', String(payload.role ?? ''));
    headers.set('x-user-name', String(payload.name ?? ''));
    headers.set('x-user-phone', String(payload.phone ?? ''));

    return NextResponse.next({ request: { headers } });
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('session');
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
