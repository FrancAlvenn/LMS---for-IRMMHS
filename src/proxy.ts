import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

import { extractSlugFromPathname, resolveTenantBySlug } from '@/server/tenancy/resolveTenant';
import { TENANT_HEADER_NAMES } from '@/server/tenancy/tenantContext';

// Next.js 16 renamed Middleware to Proxy (same mechanism, new name) — see
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
// Proxy defaults to the Node.js runtime as of v16 (confirmed in that same
// doc), so the DB-backed tenant lookup below is safe to run here.
//
// Optimistic checks ONLY throughout this file: token presence and the
// mustChangePassword/disabled claims already riding in the JWT for
// /admin, and (new, v2 Phase 2.4) a tenant's status for /s/{slug}/…. Real
// enforcement of "does this user belong to this tenant" is Phase 4's job
// (Membership) — this file only keeps a bad slug or a suspended tenant
// from reaching a page at all. Next's own guidance is explicit that Proxy
// must never be the only check.
const ADMIN_PREFIX = '/admin'; // pre-pivot, single-tenant admin — NOT YET
// migrated under /s/{slug}/admin. That move happens together with Phase 4
// (route protection rebuild), not here — see CLAUDE.md's folder-tree note.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const slug = extractSlugFromPathname(pathname);
  if (slug) {
    return resolveTenantForRequest(request, slug);
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    return checkAdminAuth(request, pathname);
  }

  return NextResponse.next();
}

async function resolveTenantForRequest(request: NextRequest, slug: string) {
  const tenant = await resolveTenantBySlug(slug);

  // Unknown or archived: 404, and deliberately indistinguishable from
  // each other — an archived tenant shouldn't confirm to a visitor that
  // it used to exist. Bare response, matching this codebase's "ugly is
  // fine before Phase 5" stance elsewhere (see e.g. /admin's pages).
  if (!tenant || tenant.status === 'archived') {
    return new NextResponse('Not found.', { status: 404 });
  }

  // Suspended: exists, but access is explicitly denied — 403, not 404, so
  // a suspended school's own staff get a message that explains why
  // instead of a bare "doesn't exist."
  if (tenant.status === 'suspended') {
    return new NextResponse("This school's account is currently suspended.", { status: 403 });
  }

  // 'onboarding' and 'active' both proceed — a tenant mid-onboarding still
  // needs to be reachable by the staff setting it up (Phase 16).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HEADER_NAMES.id, tenant.id);
  requestHeaders.set(TENANT_HEADER_NAMES.slug, tenant.slug);
  // encodeURIComponent: displayName is free text and may contain
  // non-ASCII characters; HTTP header values are otherwise restricted to
  // ISO-8859-1. tenantContext.ts decodes this back on read.
  requestHeaders.set(TENANT_HEADER_NAMES.displayName, encodeURIComponent(tenant.displayName));
  requestHeaders.set(TENANT_HEADER_NAMES.locale, tenant.locale);
  requestHeaders.set(TENANT_HEADER_NAMES.timezone, tenant.timezone);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function checkAdminAuth(request: NextRequest, pathname: string) {
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
  matcher: ['/admin/:path*', '/s/:path*'],
};
