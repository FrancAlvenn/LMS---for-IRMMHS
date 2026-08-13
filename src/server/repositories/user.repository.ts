import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import type { User, UserStatus, UserUpdate } from '@/types/user';

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, default: null },
    passwordHash: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    status: { type: String, enum: ['active', 'disabled'], required: true, default: 'active' },
    mustChangePassword: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

export const UserModel = models.User ?? model('User', userSchema);

type UserDoc = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  email: string | null;
  roleId: Types.ObjectId;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
};

// Only for the auth path (next-auth's authorize() callback + the jwt()
// per-request status check) — the one place in the codebase allowed to
// see passwordHash. Everything else uses toDTO()'d results below, which
// never include it. See contract §3.
type AuthUserDoc = UserDoc & { passwordHash: string };

function toDTO(doc: UserDoc): User {
  return {
    id: doc._id.toString(),
    username: doc.username,
    displayName: doc.displayName,
    email: doc.email,
    roleId: doc.roleId.toString(),
    status: doc.status,
    mustChangePassword: doc.mustChangePassword,
    lastLoginAt: doc.lastLoginAt ? toISOString(doc.lastLoginAt) : null,
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
  };
}

export async function findAll(): Promise<User[]> {
  await connect();
  const docs = await UserModel.find()
    .sort({ username: 1 })
    .select('-__v -passwordHash')
    .lean<UserDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<User | null> {
  await connect();
  const doc = await UserModel.findById(id).select('-__v -passwordHash').lean<UserDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function findByUsername(username: string): Promise<User | null> {
  await connect();
  const doc = await UserModel.findOne({ username })
    .select('-__v -passwordHash')
    .lean<UserDoc | null>();
  return doc ? toDTO(doc) : null;
}

/** Auth-only — includes passwordHash. See AuthUserDoc above. */
export async function findByUsernameForAuth(username: string) {
  await connect();
  return UserModel.findOne({ username }).select('-__v').lean<AuthUserDoc | null>();
}

/** Auth-only — the jwt() callback's cheap per-request status re-check. */
export async function findStatusById(id: string): Promise<UserStatus | null> {
  await connect();
  const doc = await UserModel.findById(id).select('status').lean<{ status: UserStatus } | null>();
  return doc?.status ?? null;
}

export async function create(
  input: { username: string; displayName: string; email?: string | null; roleId: string },
  passwordHash: string,
  createdBy: string | null,
): Promise<User> {
  await connect();
  const doc = await UserModel.create({
    ...input,
    passwordHash,
    mustChangePassword: true,
    createdBy,
    updatedBy: createdBy,
  });
  return toDTO(doc.toObject());
}

export async function updateById(
  id: string,
  patch: UserUpdate,
  userId: string | null,
): Promise<User | null> {
  await connect();
  const doc = await UserModel.findByIdAndUpdate(
    id,
    { ...patch, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v -passwordHash')
    .lean<UserDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function setStatus(
  id: string,
  status: UserStatus,
  userId: string | null,
): Promise<User | null> {
  await connect();
  const doc = await UserModel.findByIdAndUpdate(
    id,
    { status, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v -passwordHash')
    .lean<UserDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function setPassword(
  id: string,
  passwordHash: string,
  mustChangePassword: boolean,
  userId: string | null,
): Promise<User | null> {
  await connect();
  const doc = await UserModel.findByIdAndUpdate(
    id,
    { passwordHash, mustChangePassword, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v -passwordHash')
    .lean<UserDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function touchLastLogin(id: string): Promise<void> {
  await connect();
  await UserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() });
}
