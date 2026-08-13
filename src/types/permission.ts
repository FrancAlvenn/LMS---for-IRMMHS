import { z } from 'zod';

/**
 * The taxonomy of what the system can check — code, not data (see
 * docs/contracts/phase-3.1-identity-access.md §1). Which permissions a
 * Role *has* is data; this list of what permissions *exist* is not.
 *
 * Every later phase appends to this list (learner:read, grade:write, ...).
 * A new permission always ships with the code that checks it.
 */
export const PERMISSIONS = [
  'school:read',
  'school:write',
  'school-year:read',
  'school-year:write',
  'grading-period:read',
  'grading-period:write',
  'user:read',
  'user:write',
  'role:read',
  'role:write',
] as const;

export const permissionSchema = z.enum(PERMISSIONS);

export type Permission = (typeof PERMISSIONS)[number];
