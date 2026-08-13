import { z } from 'zod';

export const schoolYearStatusSchema = z.enum(['upcoming', 'active', 'closed']);

// "status" is deliberately absent from the input schema — it only ever
// changes via the activate action, never a free-text field edit. See
// docs/contracts/phase-2.1-config-foundation.md §2.
export const schoolYearInputSchema = z
  .object({
    label: z.string().regex(/^\d{4}-\d{4}$/, { error: 'label must look like "2025-2026"' }),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate > v.startDate, {
    error: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const schoolYearUpdateSchema = z
  .object({
    label: z.string().regex(/^\d{4}-\d{4}$/, { error: 'label must look like "2025-2026"' }),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .partial();

export type SchoolYearStatus = z.infer<typeof schoolYearStatusSchema>;
export type SchoolYearInput = z.infer<typeof schoolYearInputSchema>;
export type SchoolYearUpdate = z.infer<typeof schoolYearUpdateSchema>;

export type SchoolYear = {
  id: string;
  schoolId: string;
  label: string;
  startDate: string;
  endDate: string;
  status: SchoolYearStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};
