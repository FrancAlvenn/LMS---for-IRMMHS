import { notFound } from 'next/navigation';

import { getTenantContext } from '@/server/tenancy/tenantContext';

// Deliberately bare — the point of this page is to prove tenant
// resolution works end to end (v2 Phase 2.4's "Done when: /s/irmmhs/…
// resolves"), not to be a real app shell. That's Phase 5 (theming) and
// beyond. No DB call happens here: src/proxy.ts already resolved the
// tenant and getTenantContext() just reads the headers it attached.
export default async function TenantHomePage() {
  const tenant = await getTenantContext();

  // Shouldn't happen — proxy.ts's matcher covers every /s/:path*
  // request and 404s/403s before a page is ever reached for an
  // unknown/suspended tenant. Defensive fallback, not the normal path.
  if (!tenant) {
    notFound();
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>You are viewing:</p>
      <h1>{tenant.displayName}</h1>
      <dl style={{ fontFamily: 'monospace', fontSize: 13, color: '#444' }}>
        <dt>slug</dt>
        <dd>{tenant.slug}</dd>
        <dt>locale</dt>
        <dd>{tenant.locale}</dd>
        <dt>timezone</dt>
        <dd>{tenant.timezone}</dd>
      </dl>
    </main>
  );
}
