'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';

import type { ApiResponse } from '@/types/api';
import type { SchoolYear } from '@/types/schoolYear';

// Prompt 2.6 — deliberately unstyled. Phase 4 (design system) makes this
// presentable; this page proves the activate workflow end to end.
// TODO(Phase 3): gate this whole route behind requirePermission('school-year:write')
// — it's wide open right now, same as every route in Phase 2.
export default function SchoolYearsAdminPage() {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/school-years', { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiResponse<SchoolYear[]>>)
      .then((body) => {
        if (body.error) {
          setError(body.error.message);
        } else {
          setSchoolYears(body.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load school years.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshNonce]);

  const handleActivate = useCallback(async (id: string) => {
    setActivatingId(id);
    try {
      const res = await fetch(`/api/school-years/${id}/activate`, { method: 'POST' });
      const body = (await res.json()) as ApiResponse<SchoolYear>;
      if (body.error) {
        setError(body.error.message);
      } else {
        setError(null);
        setRefreshNonce((n) => n + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate school year.');
    } finally {
      setActivatingId(null);
    }
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720 }}>
      <h1>School years</h1>
      <p style={{ color: '#666' }}>
        Admin console, unstyled on purpose — Phase 4 makes this presentable. Activating a year
        closes whichever one was previously active.
      </p>

      {error && (
        <p style={{ color: 'crimson', border: '1px solid crimson', padding: 8 }}>{error}</p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : schoolYears.length === 0 ? (
        <p>
          No school years yet. Run <code>npm run seed</code>, or create one via{' '}
          <code>POST /api/school-years</code>.
        </p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cellStyle}>Label</th>
              <th style={cellStyle}>Start</th>
              <th style={cellStyle}>End</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}></th>
            </tr>
          </thead>
          <tbody>
            {schoolYears.map((schoolYear) => (
              <tr key={schoolYear.id}>
                <td style={cellStyle}>{schoolYear.label}</td>
                <td style={cellStyle}>{new Date(schoolYear.startDate).toLocaleDateString()}</td>
                <td style={cellStyle}>{new Date(schoolYear.endDate).toLocaleDateString()}</td>
                <td style={cellStyle}>{schoolYear.status}</td>
                <td style={cellStyle}>
                  {schoolYear.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => handleActivate(schoolYear.id)}
                      disabled={activatingId === schoolYear.id}
                    >
                      {activatingId === schoolYear.id ? 'Activating…' : 'Activate'}
                    </button>
                  )}
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
