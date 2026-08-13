import * as roleRepository from '@/server/repositories/role.repository';
import { ConflictError, NotFoundError } from '@/server/lib/errors';
import { PERMISSIONS } from '@/types/permission';
import type { Role, RoleInput, RoleUpdate } from '@/types/role';

// A role missing either of these can't manage roles or users through the
// UI at all — stripping them from the system role would lock the school
// out of its own admin console. See contract §2.
const PROTECTED_PERMISSIONS = ['role:write', 'user:write'] as const;

export async function listRoles(): Promise<Role[]> {
  return roleRepository.findAll();
}

export async function getRole(id: string): Promise<Role> {
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError('Role not found.');
  }
  return role;
}

// Used by the seed script to stay idempotent, same pattern as
// findSchoolYearByLabel in Phase 2.
export async function findRoleByName(name: string): Promise<Role | null> {
  return roleRepository.findByName(name);
}

export async function createRole(input: RoleInput): Promise<Role> {
  const existing = await roleRepository.findByName(input.name);
  if (existing) {
    throw new ConflictError(`A role named "${input.name}" already exists.`);
  }
  return roleRepository.create(input);
}

export async function updateRole(id: string, patch: RoleUpdate): Promise<Role> {
  const role = await getRole(id);

  if (role.isSystem && patch.permissions) {
    const missing = PROTECTED_PERMISSIONS.filter((p) => !patch.permissions?.includes(p));
    if (missing.length > 0) {
      throw new ConflictError(
        `Cannot remove ${missing.join(', ')} from the "${role.name}" role — it's the ` +
          'system role that manages roles and users.',
      );
    }
  }

  const updated = await roleRepository.updateById(id, patch);
  if (!updated) {
    throw new NotFoundError('Role not found.');
  }
  return updated;
}

// Seed-only — creates the one isSystem:true role. Not reachable via any
// route; roleInputSchema (the public, Zod-validated input) has no
// isSystem field.
export async function ensureAdminRole(): Promise<Role> {
  const existing = await roleRepository.findByName('Admin');
  if (existing) {
    return existing;
  }
  return roleRepository.create(
    {
      name: 'Admin',
      description: 'Full access. The system role that manages roles and users — cannot be deleted.',
      permissions: [...PERMISSIONS],
    },
    true,
  );
}
