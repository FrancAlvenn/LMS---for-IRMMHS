import bcrypt from 'bcryptjs';

import * as roleRepository from '@/server/repositories/role.repository';
import * as userRepository from '@/server/repositories/user.repository';
import { ConflictError, NotFoundError } from '@/server/lib/errors';
import type { ChangePasswordInput, User, UserCreate, UserUpdate } from '@/types/user';

const SALT_ROUNDS = 10;

export async function listUsers(): Promise<User[]> {
  return userRepository.findAll();
}

export async function getUser(id: string): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError('User not found.');
  }
  return user;
}

// Used by the seed script to stay idempotent, same pattern as
// findSchoolYearByLabel in Phase 2.
export async function findUserByUsername(username: string): Promise<User | null> {
  return userRepository.findByUsername(username);
}

export async function createUser(input: UserCreate, createdBy: string | null): Promise<User> {
  const existingUsername = await userRepository.findByUsername(input.username);
  if (existingUsername) {
    throw new ConflictError(`Username "${input.username}" is already taken.`);
  }

  const role = await roleRepository.findById(input.roleId);
  if (!role) {
    throw new NotFoundError('Role not found.');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return userRepository.create(
    {
      username: input.username,
      displayName: input.displayName,
      email: input.email ?? null,
      roleId: input.roleId,
    },
    passwordHash,
    createdBy,
  );
}

export async function updateUser(
  id: string,
  patch: UserUpdate,
  updatedBy: string | null,
): Promise<User> {
  if (patch.roleId) {
    const role = await roleRepository.findById(patch.roleId);
    if (!role) {
      throw new NotFoundError('Role not found.');
    }
  }
  const updated = await userRepository.updateById(id, patch, updatedBy);
  if (!updated) {
    throw new NotFoundError('User not found.');
  }
  return updated;
}

export async function disableUser(id: string, updatedBy: string | null): Promise<User> {
  const updated = await userRepository.setStatus(id, 'disabled', updatedBy);
  if (!updated) {
    throw new NotFoundError('User not found.');
  }
  return updated;
}

export async function enableUser(id: string, updatedBy: string | null): Promise<User> {
  const updated = await userRepository.setStatus(id, 'active', updatedBy);
  if (!updated) {
    throw new NotFoundError('User not found.');
  }
  return updated;
}

// Admin resets someone else's password — always forces a change on next
// login, since the admin now knows the (temporary) password too.
export async function resetPassword(
  id: string,
  input: ChangePasswordInput,
  updatedBy: string | null,
): Promise<User> {
  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  const updated = await userRepository.setPassword(id, passwordHash, true, updatedBy);
  if (!updated) {
    throw new NotFoundError('User not found.');
  }
  return updated;
}

// Self-service — no currentPassword required, see contract §6#2. Clears
// mustChangePassword; the route handler is responsible for telling the
// client to call useSession().update() afterward so the JWT claim
// actually reflects it without a forced re-login.
export async function changeOwnPassword(id: string, input: ChangePasswordInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  const updated = await userRepository.setPassword(id, passwordHash, false, id);
  if (!updated) {
    throw new NotFoundError('User not found.');
  }
  return updated;
}

/**
 * The only place in the codebase that reads passwordHash — called from
 * next-auth's authorize() callback. Deliberately returns null rather than
 * throwing on any failure (wrong username, wrong password, disabled
 * account): a failed login is an expected outcome, not a server error,
 * and next-auth's CredentialsSignin flow expects null to mean "invalid."
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<{
  id: string;
  username: string;
  displayName: string;
  roleId: string;
  mustChangePassword: boolean;
} | null> {
  const record = await userRepository.findByUsernameForAuth(username);
  if (!record || record.status !== 'active') {
    return null;
  }

  const valid = await bcrypt.compare(password, record.passwordHash);
  if (!valid) {
    return null;
  }

  await userRepository.touchLastLogin(record._id.toString());

  return {
    id: record._id.toString(),
    username: record.username,
    displayName: record.displayName,
    roleId: record.roleId.toString(),
    mustChangePassword: record.mustChangePassword,
  };
}
