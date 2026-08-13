import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import type { Address, School, SchoolInput, SchoolUpdate } from '@/types/school';

const schoolSchema = new Schema(
  {
    depedSchoolId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    officialName: { type: String, default: null },
    address: {
      street: { type: String },
      barangay: { type: String, required: true },
      municipality: { type: String, required: true },
      province: { type: String, required: true },
      region: { type: String, required: true },
    },
    division: { type: String, required: true },
    district: { type: String },
    principalName: { type: String, required: true },
    principalTitle: { type: String, required: true },
    logoUrl: { type: String, default: null },
    contactEmail: { type: String },
    contactPhone: { type: String },
  },
  baseSchemaOptions,
);

// Hot-reload-safe model registration (models.X ?? model(...)) — see
// src/server/db/connect.ts for why this pattern matters in Next.js dev.
export const SchoolModel = models.School ?? model('School', schoolSchema);

type SchoolDoc = {
  _id: Types.ObjectId;
  depedSchoolId: string;
  name: string;
  officialName: string | null;
  address: Address;
  division: string;
  district?: string;
  principalName: string;
  principalTitle: string;
  logoUrl: string | null;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(doc: SchoolDoc): School {
  return {
    id: doc._id.toString(),
    depedSchoolId: doc.depedSchoolId,
    name: doc.name,
    officialName: doc.officialName,
    address: doc.address,
    division: doc.division,
    district: doc.district,
    principalName: doc.principalName,
    principalTitle: doc.principalTitle,
    logoUrl: doc.logoUrl,
    contactEmail: doc.contactEmail,
    contactPhone: doc.contactPhone,
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
  };
}

export async function findAll(): Promise<School[]> {
  await connect();
  const docs = await SchoolModel.find().select('-__v').lean<SchoolDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<School | null> {
  await connect();
  const doc = await SchoolModel.findById(id).select('-__v').lean<SchoolDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function create(input: SchoolInput): Promise<School> {
  await connect();
  const doc = await SchoolModel.create(input);
  return toDTO(doc.toObject());
}

export async function updateById(id: string, patch: SchoolUpdate): Promise<School | null> {
  await connect();
  const doc = await SchoolModel.findByIdAndUpdate(id, patch, { returnDocument: 'after' })
    .select('-__v')
    .lean<SchoolDoc | null>();
  return doc ? toDTO(doc) : null;
}
