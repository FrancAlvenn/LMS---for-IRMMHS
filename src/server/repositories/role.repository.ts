import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import { PERMISSIONS } from '@/types/permission';
import type { Permission } from '@/types/permission';
import type { Role, RoleInput, RoleUpdate } from '@/types/role';

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: { type: [String], enum: PERMISSIONS, default: [] },
    isSystem: { type: Boolean, required: true, default: false },
  },
  baseSchemaOptions,
);

export const RoleModel = models.Role ?? model('Role', roleSchema);

type RoleDoc = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(doc: RoleDoc): Role {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    permissions: doc.permissions,
    isSystem: doc.isSystem,
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
  };
}

export async function findAll(): Promise<Role[]> {
  await connect();
  const docs = await RoleModel.find().sort({ name: 1 }).select('-__v').lean<RoleDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<Role | null> {
  await connect();
  const doc = await RoleModel.findById(id).select('-__v').lean<RoleDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function findByName(name: string): Promise<Role | null> {
  await connect();
  const doc = await RoleModel.findOne({ name }).select('-__v').lean<RoleDoc | null>();
  return doc ? toDTO(doc) : null;
}

// isSystem is never part of the admin-facing Zod input — only the seed
// script creates a system role, by passing isSystem explicitly here.
export async function create(input: RoleInput, isSystem = false): Promise<Role> {
  await connect();
  const doc = await RoleModel.create({ ...input, isSystem });
  return toDTO(doc.toObject());
}

export async function updateById(id: string, patch: RoleUpdate): Promise<Role | null> {
  await connect();
  const doc = await RoleModel.findByIdAndUpdate(id, patch, { returnDocument: 'after' })
    .select('-__v')
    .lean<RoleDoc | null>();
  return doc ? toDTO(doc) : null;
}
