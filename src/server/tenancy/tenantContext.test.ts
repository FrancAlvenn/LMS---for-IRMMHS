import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { headers } from 'next/headers';

import { TENANT_HEADER_NAMES, getTenantContext, tenantContextFromHeaders } from './tenantContext';

describe('tenantContextFromHeaders', () => {
  it('builds a TenantContext from a fully-populated header set, decoding displayName', () => {
    const h = new Headers();
    h.set(TENANT_HEADER_NAMES.id, 'tenant-id-1');
    h.set(TENANT_HEADER_NAMES.slug, 'irmmhs');
    h.set(TENANT_HEADER_NAMES.displayName, encodeURIComponent('Iluminada Roxas-Mendoza'));
    h.set(TENANT_HEADER_NAMES.locale, 'en-PH');
    h.set(TENANT_HEADER_NAMES.timezone, 'Asia/Manila');

    expect(tenantContextFromHeaders(h)).toEqual({
      id: 'tenant-id-1',
      slug: 'irmmhs',
      displayName: 'Iluminada Roxas-Mendoza',
      locale: 'en-PH',
      timezone: 'Asia/Manila',
    });
  });

  it('returns null when any header is missing — e.g. a request proxy.ts never resolved a tenant for', () => {
    const h = new Headers();
    h.set(TENANT_HEADER_NAMES.id, 'tenant-id-1');
    // slug, displayName, locale, timezone deliberately absent.
    expect(tenantContextFromHeaders(h)).toBeNull();
  });
});

describe('getTenantContext', () => {
  it('awaits next/headers() and delegates to tenantContextFromHeaders', async () => {
    const h = new Headers();
    h.set(TENANT_HEADER_NAMES.id, 'tenant-id-2');
    h.set(TENANT_HEADER_NAMES.slug, 'meridian-intl');
    h.set(TENANT_HEADER_NAMES.displayName, encodeURIComponent('Meridian International School'));
    h.set(TENANT_HEADER_NAMES.locale, 'en');
    h.set(TENANT_HEADER_NAMES.timezone, 'UTC');
    vi.mocked(headers).mockResolvedValue(h as never);

    const context = await getTenantContext();

    expect(context).toEqual({
      id: 'tenant-id-2',
      slug: 'meridian-intl',
      displayName: 'Meridian International School',
      locale: 'en',
      timezone: 'UTC',
    });
  });
});
