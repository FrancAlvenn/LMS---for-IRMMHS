import { describe, expect, it } from 'vitest';

import { gradingPeriodInputSchema, gradingPeriodStatusSchema } from './gradingPeriod';

describe('gradingPeriodInputSchema', () => {
  const valid = {
    sequence: 1,
    label: 'Quarter 1',
    startDate: '2025-06-01',
    endDate: '2025-08-15',
  };

  it('accepts a well-formed grading period', () => {
    expect(gradingPeriodInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects endDate on or before startDate', () => {
    const result = gradingPeriodInputSchema.safeParse({
      ...valid,
      endDate: valid.startDate,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive sequence', () => {
    expect(gradingPeriodInputSchema.safeParse({ ...valid, sequence: 0 }).success).toBe(false);
  });
});

describe('gradingPeriodStatusSchema', () => {
  it('only accepts the 3 registrar-controlled states', () => {
    expect(gradingPeriodStatusSchema.options).toEqual(['notStarted', 'open', 'locked']);
  });

  it('rejects "submitted"/"approved" — those belong to a future Phase 11 record', () => {
    expect(gradingPeriodStatusSchema.safeParse('submitted').success).toBe(false);
    expect(gradingPeriodStatusSchema.safeParse('approved').success).toBe(false);
  });
});
