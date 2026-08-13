import { z } from 'zod';

// See docs/contracts/phase-2.1-tenancy-foundation.md §1. Tenant is the
// school as a platform record, not its academic data.

export const tenantStatusSchema = z.enum(['onboarding', 'active', 'suspended', 'archived']);
export type TenantStatus = (typeof tenantStatusSchema.enum)[keyof typeof tenantStatusSchema.enum];

// URL-safe, lowercase, kebab-case. Unique, and IMMUTABLE after creation —
// see the schema comment in tenant.repository.ts for why (it appears in
// every /s/{slug}/… URL a school's staff bookmark).
export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    error: 'slug must be lowercase letters, numbers, and hyphens only',
  });

// Not embedded in tenantCreateSchema/tenantUpdateSchema — limits are a
// schema placeholder only in this phase, set by services/seed data
// directly, not client-writable yet. Exported for Phase 17's eventual
// limits editor to validate against.
export const tenantLimitsSchema = z
  .object({
    maxLearners: z.number().int().positive().nullable(),
    maxUsers: z.number().int().positive().nullable(),
  })
  .nullable();

// Contract §4 open question #1: PH/DepEd-specific identity data
// (depedSchoolId, division, district, …) lives here, not as first-class
// fields — keeps the core schema generic across D7's reference schools.
const externalIdsSchema = z.record(z.string(), z.string());

export const tenantCreateSchema = z.object({
  slug: tenantSlugSchema,
  displayName: z.string().min(1),
  officialName: z.string().min(1).nullable().default(null),
  locale: z.string().min(2).default('en-PH'),
  timezone: z.string().min(1).default('Asia/Manila'),
  logoUrl: z.url().nullable().default(null),
  contactEmail: z.email().nullable().default(null),
  contactPhone: z.string().nullable().default(null),
  externalIds: externalIdsSchema.default({}),
});

// slug is immutable — excluded here, not just conventionally avoided.
// status is also excluded — it only ever changes via the activate/suspend/
// archive service actions (Phase 17's routes), never a generic PATCH
// field, same reasoning as SchoolYear's activate action.
export const tenantUpdateSchema = tenantCreateSchema.omit({ slug: true }).partial();

export type TenantCreate = z.infer<typeof tenantCreateSchema>;
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>;
export type TenantLimits = z.infer<typeof tenantLimitsSchema>;

export type Tenant = TenantCreate & {
  id: string;
  status: TenantStatus;
  // Schema placeholders only in this phase — no pack registry or limit
  // enforcement exists until Phase 10/14/16/17. See contract §4 open
  // question #4.
  installedPacks: string[];
  limits: TenantLimits;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};
