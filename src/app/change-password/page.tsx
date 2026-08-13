'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/user';

// Reached either voluntarily or via proxy.ts's redirect when
// session.mustChangePassword is true. After a successful change, calls
// useSession().update() so the JWT's mustChangePassword claim flips
// without forcing a logout/login round trip — see contract §6#2.
export default function ChangePasswordPage() {
  const router = useRouter();
  const { update } = useSession();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const body = (await res.json()) as ApiResponse<User>;

    if (body.error) {
      setSubmitting(false);
      setError(body.error.message);
      return;
    }

    await update({ mustChangePassword: false });
    router.push('/admin/school-years');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 360 }}>
      <h1>Change your password</h1>
      <p style={{ color: '#666' }}>
        This account was just created (or reset) with a temporary password. Set your own before
        continuing.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>

        {error && (
          <p style={{ color: 'crimson', border: '1px solid crimson', padding: 8 }}>{error}</p>
        )}

        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </main>
  );
}
