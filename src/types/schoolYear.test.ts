import { describe, expect, it } from 'vitest';

import { schoolYearInputSchema } from './schoolYear';

describe('schoolYearInputSchema', () => {
  const valid = {
    label: '2025-2026',
    startDate: '2025-06-01',
    endDate: '2026-03-31',
  };

  it('accepts a well-formed school year', () => {
    const result = schoolYearInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a label that is not YYYY-YYYY', () => {
    const result = schoolYearInputSchema.safeParse({ ...valid, label: 'SY 2025-2026' });
    expect(result.success).toBe(false);
  });

  it('rejects endDate on or before startDate', () => {
    const result = schoolYearInputSchema.safeParse({
      ...valid,
      startDate: '2025-06-01',
      endDate: '2025-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('does not accept a status field — activation is a separate action', () => {
    const parsed = schoolYearInputSchema.parse({ ...valid, status: 'active' });
    expect(parsed).not.toHaveProperty('status');
  });
});
