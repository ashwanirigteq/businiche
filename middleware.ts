import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'businiche_production_jwt_secret_fallback_key_32_chars';
const secretKey = new TextEncoder().encode(JWT_SECRET);
const SESSION_COOKIE_NAME = 'businiche_session';

// Paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];

// Admin-only paths
const ADMIN_PATHS = ['/users', '/api/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/next.svg') ||
    pathname.startsWith('/vercel.svg')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let sessionPayload: { userId: string; username: string; role: string; fullName: string } | null = null;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, secretKey);
      sessionPayload = payload as { userId: string; username: string; role: string; fullName: string };
    } catch {
      sessionPayload = null;
    }
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

  // 1. If user is logged in and trying to visit login/signup, redirect to dashboard
  if (sessionPayload && isPublicPath && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. If path is public and user is unauthenticated, allow request
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 3. Unauthenticated access to protected routes
  if (!sessionPayload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Admin-only route authorization check
  const isAdminPath = ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  if (isAdminPath && sessionPayload.role !== 'Admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin privilege required.' },
        { status: 403 }
      );
    }
    // Redirect standard user to homepage
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Pass session headers for downstream server components / API handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', sessionPayload.userId);
  requestHeaders.set('x-user-role', sessionPayload.role);
  requestHeaders.set('x-user-name', sessionPayload.username);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
