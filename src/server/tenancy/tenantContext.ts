import { headers } from 'next/headers';

/**
 * The lightweight, no-DB-call shape src/proxy.ts hands downstream after
 * resolving /s/{slug}/… — just enough for a layout/page to render a
 * school's name or pick a locale without a fetch. Callers needing the
 * full Tenant record (installedPacks, limits, externalIds, …) fetch it
 * explicitly via tenant.service.getTenant(context.id).
 */
export interface TenantContext {
  id: string;
  slug: string;
  displayName: string;
  locale: string;
  timezone: string;
}

const HEADER_ID = 'x-tenant-id';
const HEADER_SLUG = 'x-tenant-slug';
const HEADER_DISPLAY_NAME = 'x-tenant-display-name';
const HEADER_LOCALE = 'x-tenant-locale';
const HEADER_TIMEZONE = 'x-tenant-timezone';

/**
 * Pure header-read — no DB call, since src/proxy.ts already resolved the
 * tenant before this request reached a route. Route Handlers should call
 * this directly with `request.headers`; Server Components should use
 * getTenantContext() below instead (it awaits next/headers() for you).
 *
 * Returns null when there's nothing to read — a request outside
 * /s/{slug}/… never had a tenant resolved for it. Always check for null;
 * never assume a tenant exists.
 */
export function tenantContextFromHeaders(requestHeaders: Headers): TenantContext | null {
  const id = requestHeaders.get(HEADER_ID);
  const slug = requestHeaders.get(HEADER_SLUG);
  const displayName = requestHeaders.get(HEADER_DISPLAY_NAME);
  const locale = requestHeaders.get(HEADER_LOCALE);
  const timezone = requestHeaders.get(HEADER_TIMEZONE);

  if (!id || !slug || !displayName || !locale || !timezone) {
    return null;
  }

  // displayName is free text and may contain non-ASCII characters (a
  // school's real name), so src/proxy.ts encodeURIComponent()s it before
  // setting the header — HTTP header values are otherwise restricted to
  // ISO-8859-1. Decode it back here.
  return { id, slug, displayName: decodeURIComponent(displayName), locale, timezone };
}

/** Server Component version of tenantContextFromHeaders(). */
export async function getTenantContext(): Promise<TenantContext | null> {
  const requestHeaders = await headers();
  return tenantContextFromHeaders(requestHeaders);
}

// Exported for src/proxy.ts, which is the only place these get *set* —
// keeping the header names in one place so the writer and the two readers
// above can never drift apart.
export const TENANT_HEADER_NAMES = {
  id: HEADER_ID,
  slug: HEADER_SLUG,
  displayName: HEADER_DISPLAY_NAME,
  locale: HEADER_LOCALE,
  timezone: HEADER_TIMEZONE,
} as const;
