import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/repositories/tenant.repository', () => ({
  findBySlug: vi.fn(),
}));

import * as tenantRepository from '@/server/repositories/tenant.repository';

import {
  extractSlugFromPathname,
  invalidateTenantCache,
  resolveTenantBySlug,
} from './resolveTenant';

const mockFindBySlug = vi.mocked(tenantRepository.findBySlug);

describe('extractSlugFromPathname', () => {
  it('extracts the slug from /s/{slug} and deeper paths under it', () => {
    expect(extractSlugFromPathname('/s/irmmhs')).toBe('irmmhs');
    expect(extractSlugFromPathname('/s/irmmhs/admin/users')).toBe('irmmhs');
    expect(extractSlugFromPathname('/s/meridian-intl/dashboard')).toBe('meridian-intl');
  });

  it('returns null for paths outside /s/{slug}/…', () => {
    expect(extractSlugFromPathname('/admin/users')).toBeNull();
    expect(extractSlugFromPathname('/')).toBeNull();
    expect(extractSlugFromPathname('/s')).toBeNull();
    expect(extractSlugFromPathname('/s/')).toBeNull();
  });
});

describe('resolveTenantBySlug', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFindBySlug.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches a resolved tenant — repeated calls within the TTL hit the repository once', async () => {
    const tenant = { id: 't1', slug: 'cache-test-a', displayName: 'A' } as never;
    mockFindBySlug.mockResolvedValue(tenant);

    const first = await resolveTenantBySlug('cache-test-a');
    const second = await resolveTenantBySlug('cache-test-a');

    expect(first).toEqual(tenant);
    expect(second).toEqual(tenant);
    expect(mockFindBySlug).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the cache TTL expires', async () => {
    mockFindBySlug.mockResolvedValue({ id: 't2', slug: 'cache-test-b' } as never);

    await resolveTenantBySlug('cache-test-b');
    vi.advanceTimersByTime(31_000); // TTL is 30_000ms — see resolveTenant.ts
    await resolveTenantBySlug('cache-test-b');

    expect(mockFindBySlug).toHaveBeenCalledTimes(2);
  });

  it('caches a null result too, so a nonsense slug never hammers the DB on retries', async () => {
    mockFindBySlug.mockResolvedValue(null);

    const first = await resolveTenantBySlug('cache-test-nonsense');
    const second = await resolveTenantBySlug('cache-test-nonsense');

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(mockFindBySlug).toHaveBeenCalledTimes(1);
  });

  it('invalidateTenantCache forces the next call to re-fetch immediately', async () => {
    mockFindBySlug.mockResolvedValue({ id: 't3', slug: 'cache-test-c' } as never);

    await resolveTenantBySlug('cache-test-c');
    invalidateTenantCache('cache-test-c');
    await resolveTenantBySlug('cache-test-c');

    expect(mockFindBySlug).toHaveBeenCalledTimes(2);
  });
});
