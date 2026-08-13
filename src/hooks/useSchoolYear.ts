'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ApiResponse } from '@/types/api';
import type { SchoolYear } from '@/types/schoolYear';

type UseSchoolYearResult = {
  schoolYear: SchoolYear | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch — call after an action that might change which year is active. */
  refresh: () => void;
};

/**
 * Client-side counterpart to getActiveSchoolYear() (server/services/
 * schoolYear.service.ts). Every SY-scoped screen calls this instead of
 * fetching /api/school-years/active directly, so the loading/error
 * handling lives in one place. `schoolYear: null` with no error is a
 * legitimate state — no active year yet, not a failure.
 */
export function useSchoolYear(): UseSchoolYearResult {
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    // No synchronous setState at the top of the effect (react-hooks/
    // set-state-in-effect) — `loading` starts true and only ever flips to
    // false once, in .finally() below. A refresh() after the first load
    // swaps in new data/error without a loading flash, which is fine for
    // this hook's use case (re-fetch after an admin action, not a
    // from-scratch page load).
    const controller = new AbortController();

    fetch('/api/school-years/active', { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiResponse<SchoolYear | null>>)
      .then((body) => {
        if (body.error) {
          setError(body.error.message);
          setSchoolYear(null);
        } else {
          setSchoolYear(body.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load the active school year.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [refreshNonce]);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  return { schoolYear, loading, error, refresh };
}
