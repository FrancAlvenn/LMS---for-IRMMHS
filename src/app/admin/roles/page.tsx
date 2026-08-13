'use client';

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';

import { PERMISSIONS } from '@/types/permission';
import type { Permission } from '@/types/permission';
import type { ApiResponse } from '@/types/api';
import type { Role } from '@/types/role';

// Prompt 3.7 — deliberately unstyled, same as the other admin pages.
export default function RolesAdminPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/roles', { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiResponse<Role[]>>)
      .then((body) => {
        if (body.error) {
          setError(body.error.message);
        } else {
          setRoles(body.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load roles.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refreshNonce]);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName, permissions: [] }),
    });
    const body = (await res.json()) as ApiResponse<Role>;
    setCreating(false);
    if (body.error) {
      setError(body.error.message);
      return;
    }
    setNewRoleName('');
    refresh();
  }

  async function handleTogglePermission(role: Role, permission: Permission) {
    const nextPermissions = role.permissions.includes(permission)
      ? role.permissions.filter((p) => p !== permission)
      : [...role.permissions, permission];

    setBusyId(role.id);
    const res = await fetch(`/api/roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: nextPermissions }),
    });
    const body = (await res.json()) as ApiResponse<Role>;
    setBusyId(null);
    if (body.error) {
      setError(body.error.message);
      return;
    }
    refresh();
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900 }}>
      <h1>Roles</h1>
      <p style={{ color: '#666' }}>
        The <strong>Admin</strong> role is a system role — it can&apos;t be deleted, and
        role:write/user:write can&apos;t be unchecked on it (it&apos;s the one role that can manage
        roles and users).
      </p>

      {error && (
        <p style={{ color: 'crimson', border: '1px solid crimson', padding: 8 }}>{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        style={{ display: 'flex', gap: 8, alignItems: 'end', margin: '16px 0' }}
      >
        <label>
          New role name
          <input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
        </label>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create role'}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        roles.map((role) => (
          <fieldset
            key={role.id}
            disabled={busyId === role.id}
            style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd' }}
          >
            <legend>
              <strong>{role.name}</strong>
              {role.isSystem && ' (system role)'}
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {PERMISSIONS.map((permission) => {
                const locked =
                  role.isSystem && (permission === 'role:write' || permission === 'user:write');
                return (
                  <label key={permission} style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(permission)}
                      disabled={locked}
                      onChange={() => handleTogglePermission(role, permission)}
                    />
                    {permission}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))
      )}
    </main>
  );
}

const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'monospace',
  fontSize: 13,
};
