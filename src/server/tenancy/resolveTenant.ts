import * as tenantRepository from '@/server/repositories/tenant.repository';
import type { Tenant } from '@/types/tenant';

/**
 * The one place tenant resolution logic lives — playbook Prompt 2.4's own
 * constraint, so swapping /s/{slug}/… for subdomains later is a change to
 * extractSlugFromPathname() alone, not a hunt through every route. Called
 * from src/proxy.ts (the only place a slug gets parsed out of a URL).
 *
 * Talks to tenant.repository.ts directly rather than tenant.service.ts —
 * same reasoning as gradingPeriod.service.ts importing schoolYearRepository
 * directly (see that file's comment): tenant.service.ts calls
 * invalidateTenantCache() after a mutation, so this file importing
 * tenant.service.ts back would be a circular module dependency.
 */

const SLUG_PATH_PATTERN = /^\/s\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/;

export function extractSlugFromPathname(pathname: string): string | null {
  const match = SLUG_PATH_PATTERN.exec(pathname);
  return match ? match[1] : null;
}

/**
 * Per-instance, in-memory cache (playbook Prompt 2.4: "cache the
 * slug-to-tenant lookup"). Deliberately short-lived: long enough to avoid
 * a DB round trip on every navigation within a session, short enough that
 * a Phase 17 suspend action takes effect within seconds rather than
 * staying live until every Vercel instance happens to cold-start again.
 * `invalidateTenantCache` below is the normal path for that; the TTL is
 * only the worst-case ceiling if a caller forgets to invalidate.
 */
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { tenant: Tenant | null; expiresAt: number }>();

export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }
  const tenant = await tenantRepository.findBySlug(slug);
  cache.set(slug, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
  return tenant;
}

/** Called by tenant.service.ts after any create/update/status change. */
export function invalidateTenantCache(slug: string): void {
  cache.delete(slug);
}
