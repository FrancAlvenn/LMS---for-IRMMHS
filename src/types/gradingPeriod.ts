import { z } from 'zod';

// 3 states, not the design tokens' 5 — resolved 2026-08-13, see
// docs/contracts/phase-2.1-config-foundation.md §3/§5#1. "submitted" and
// "approved" belong to a future Phase 11 per-section submission record,
// not this period-wide field.
export const gradingPeriodStatusSchema = z.enum(['notStarted', 'open', 'locked']);

export const gradingPeriodInputSchema = z
  .object({
    sequence: z.number().int().positive(),
    label: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate > v.startDate, {
    error: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const gradingPeriodUpdateSchema = z
  .object({
    sequence: z.number().int().positive(),
    label: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .partial();

export type GradingPeriodStatus = z.infer<typeof gradingPeriodStatusSchema>;
export type GradingPeriodInput = z.infer<typeof gradingPeriodInputSchema>;
export type GradingPeriodUpdate = z.infer<typeof gradingPeriodUpdateSchema>;

export type GradingPeriod = {
  id: string;
  schoolYearId: string;
  sequence: number;
  label: string;
  startDate: string;
  endDate: string;
  status: GradingPeriodStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};
