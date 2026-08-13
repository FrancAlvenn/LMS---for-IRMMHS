import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Next.js 16 renamed Middleware to Proxy (same mechanism, new name) — see
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
// Optimistic checks ONLY: token presence and the mustChangePassword/
// disabled claims already riding in the JWT. Real permission enforcement
// happens server-side in requirePermission() — Next's own guidance is
// explicit that Proxy must never be the only auth check.
const PROTECTED_PREFIXES = ['/admin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.disabled) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.mustChangePassword) {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
