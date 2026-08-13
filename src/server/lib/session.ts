import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/server/lib/authOptions';
import { ForbiddenError, UnauthorizedError } from '@/server/lib/errors';
import type { Permission } from '@/types/permission';

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  permissions: Permission[];
  mustChangePassword: boolean;
};

/**
 * Real as of Phase 3 — replaces the Phase 1/2 stub that always returned
 * null. Every route handler that needs createdBy/updatedBy already calls
 * this, so this was the one file that had to change; nothing else did.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * The real implementation every `// TODO(Phase 3): requirePermission(...)`
 * comment in Phase 2's route handlers was waiting for. Throws
 * UnauthorizedError (401, no session) or ForbiddenError (403, signed in
 * but missing the permission) — handleRoute() maps both to the right
 * status automatically, so callers just await this and keep going.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenError();
  }
  return user;
}
