'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

// Deliberately unstyled — Phase 4 makes this presentable (playbook §6:
// "the first screen anyone sees, make it feel like the school").
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/school-years';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setSubmitting(false);
      setError('Incorrect username or password.');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 360 }}>
      <h1>Sign in</h1>
      <p style={{ color: '#666' }}>Iluminada Roxas-Mendoza Memorial High School</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
        </label>

        {error && (
          <p style={{ color: 'crimson', border: '1px solid crimson', padding: 8 }}>{error}</p>
        )}

        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
