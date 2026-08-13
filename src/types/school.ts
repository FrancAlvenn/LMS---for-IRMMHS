import { z } from 'zod';

// Zod v4: prefer the top-level z.email()/z.url() helpers — the chained
// z.string().email()/.url() methods are deprecated in this version.
export const addressSchema = z.object({
  street: z.string().optional(),
  barangay: z.string().min(1),
  municipality: z.string().min(1),
  province: z.string().min(1),
  region: z.string().min(1),
});

export const schoolInputSchema = z.object({
  depedSchoolId: z.string().regex(/^\d+$/, { error: 'depedSchoolId must be numeric' }),
  name: z.string().min(1),
  officialName: z.string().min(1).nullable(),
  address: addressSchema,
  division: z.string().min(1),
  district: z.string().optional(),
  principalName: z.string().min(1),
  principalTitle: z.string().min(1),
  logoUrl: z.url().nullable(),
  contactEmail: z.email().optional(),
  contactPhone: z.string().optional(),
});

// Every field optional on update — PATCH semantics.
export const schoolUpdateSchema = schoolInputSchema.partial();

export type Address = z.infer<typeof addressSchema>;
export type SchoolInput = z.infer<typeof schoolInputSchema>;
export type SchoolUpdate = z.infer<typeof schoolUpdateSchema>;

export type School = SchoolInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
