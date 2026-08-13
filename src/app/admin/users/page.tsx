'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';

import type { ApiResponse } from '@/types/api';
import type { Role } from '@/types/role';
import type { User } from '@/types/user';

// Prompt 3.7 — deliberately unstyled, same as /admin/school-years.
export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch('/api/users', { signal: controller.signal }).then(
        (res) => res.json() as Promise<ApiResponse<User[]>>,
      ),
      fetch('/api/roles', { signal: controller.signal }).then(
        (res) => res.json() as Promise<ApiResponse<Role[]>>,
      ),
    ])
      .then(([usersBody, rolesBody]) => {
        if (usersBody.error) {
          setError(usersBody.error.message);
          return;
        }
        if (rolesBody.error) {
          setError(rolesBody.error.message);
          return;
        }
        setUsers(usersBody.data);
        setRoles(rolesBody.data);
        setError(null);
        setForm((f) => ({ ...f, roleId: f.roleId || (rolesBody.data[0]?.id ?? '') }));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load users.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshNonce]);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = (await res.json()) as ApiResponse<User>;
    setCreating(false);
    if (body.error) {
      setError(body.error.message);
      return;
    }
    setForm((f) => ({ ...f, username: '', displayName: '', email: '', password: '' }));
    refresh();
  }

  async function handleToggleStatus(user: User) {
    setBusyId(user.id);
    const action = user.status === 'active' ? 'disable' : 'enable';
    const res = await fetch(`/api/users/${user.id}/${action}`, { method: 'POST' });
    const body = (await res.json()) as ApiResponse<User>;
    setBusyId(null);
    if (body.error) {
      setError(body.error.message);
      return;
    }
    refresh();
  }

  async function handleResetPassword(user: User) {
    const newPassword = window.prompt(`New temporary password for ${user.username} (min 8 chars):`);
    if (!newPassword) return;
    setBusyId(user.id);
    const res = await fetch(`/api/users/${user.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    const body = (await res.json()) as ApiResponse<User>;
    setBusyId(null);
    if (body.error) {
      setError(body.error.message);
      return;
    }
    refresh();
  }

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId;

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900 }}>
      <h1>Users</h1>
      <p style={{ color: '#666' }}>
        Admin-provisioned accounts only — every new user gets a temporary password and must change
        it on first login.
      </p>

      {error && (
        <p style={{ color: 'crimson', border: '1px solid crimson', padding: 8 }}>{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'end',
          margin: '16px 0',
          padding: 12,
          border: '1px solid #ddd',
        }}
      >
        <label>
          Username
          <input
            required
            minLength={3}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
        </label>
        <label>
          Display name
          <input
            required
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
        </label>
        <label>
          Email (optional)
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          Temporary password
          <input
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>
        <label>
          Role
          <select
            required
            value={form.roleId}
            onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={creating || roles.length === 0}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cellStyle}>Username</th>
              <th style={cellStyle}>Name</th>
              <th style={cellStyle}>Role</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Must change password</th>
              <th style={cellStyle}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={cellStyle}>{user.username}</td>
                <td style={cellStyle}>{user.displayName}</td>
                <td style={cellStyle}>{roleName(user.roleId)}</td>
                <td style={cellStyle}>{user.status}</td>
                <td style={cellStyle}>{user.mustChangePassword ? 'yes' : 'no'}</td>
                <td style={{ ...cellStyle, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => handleToggleStatus(user)}
                  >
                    {user.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => handleResetPassword(user)}
                  >
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const cellStyle: CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px 12px',
  textAlign: 'left',
};
