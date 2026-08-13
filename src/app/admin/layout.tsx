import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getCurrentUser } from '@/server/lib/session';

import { SignOutButton } from './sign-out-button';

// Real server-side check, not just proxy.ts's optimistic redirect — see
// Next's own guidance that Proxy must never be the only auth check.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.mustChangePassword) {
    redirect('/change-password');
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #ddd',
        }}
      >
        <nav style={{ display: 'flex', gap: 16 }}>
          <a href="/admin/school-years">School years</a>
          <a href="/admin/users">Users</a>
          <a href="/admin/roles">Roles</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666' }}>
            {user.displayName} ({user.role})
          </span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
