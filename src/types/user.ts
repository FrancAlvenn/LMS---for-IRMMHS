import { z } from 'zod';

// NIST 800-63B: length over mandated complexity. No forced
// uppercase/number/symbol rules — those push people toward "Password1!"
// and sticky notes, not better security.
export const passwordSchema = z.string().min(8);

export const userCreateSchema = z.object({
  username: z.string().min(3),
  displayName: z.string().min(1),
  email: z.email().nullable().optional(),
  // Admin sets the initial password directly — there's no email-delivery
  // system to send a reset link through, and students may have no email
  // at all (playbook D5).
  password: passwordSchema,
  roleId: z.string(),
});

// PATCH semantics — every field optional, same convention as Phase 2's
// update schemas. Deliberately excludes status and password: those go
// through their own action endpoints (disable/enable, reset-password).
export const userUpdateSchema = z
  .object({
    displayName: z.string().min(1),
    email: z.email().nullable(),
    roleId: z.string(),
  })
  .partial();

export const changePasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type UserStatus = 'active' | 'disabled';

// No passwordHash field, on purpose — the repository's toDTO() mapper
// never includes it, so there's no field here to forget to strip before
// a response goes out. See contract §3.
export type User = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  roleId: string;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};
