import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import type {
  SchoolYear,
  SchoolYearInput,
  SchoolYearStatus,
  SchoolYearUpdate,
} from '@/types/schoolYear';

const schoolYearSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    label: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'closed'],
      required: true,
      default: 'upcoming',
    },
    // ref: 'User' — that model doesn't exist until Phase 3. Refs don't
    // require the target model to be registered, only .populate() does.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

schoolYearSchema.index({ schoolId: 1, label: 1 }, { unique: true });

// Belt-and-suspenders on "exactly one active school year per school" —
// see docs/contracts/phase-2.1-config-foundation.md §2. The service layer
// enforces this too; this partial unique index means a bug there can't
// silently create two active years.
schoolYearSchema.index(
  { schoolId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const SchoolYearModel = models.SchoolYear ?? model('SchoolYear', schoolYearSchema);

type SchoolYearDoc = {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  label: string;
  startDate: Date;
  endDate: Date;
  status: SchoolYearStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
};

function toDTO(doc: SchoolYearDoc): SchoolYear {
  return {
    id: doc._id.toString(),
    schoolId: doc.schoolId.toString(),
    label: doc.label,
    startDate: toISOString(doc.startDate),
    endDate: toISOString(doc.endDate),
    status: doc.status,
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
  };
}

export async function findAllBySchool(schoolId: string): Promise<SchoolYear[]> {
  await connect();
  const docs = await SchoolYearModel.find({ schoolId })
    .sort({ startDate: -1 })
    .select('-__v')
    .lean<SchoolYearDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<SchoolYear | null> {
  await connect();
  const doc = await SchoolYearModel.findById(id).select('-__v').lean<SchoolYearDoc | null>();
  return doc ? toDTO(doc) : null;
}

// Used by the seed script to stay idempotent — the { schoolId, label }
// unique index would reject a re-run's duplicate insert anyway, but a
// friendly "already exists, skipping" beats catching a Mongo error.
export async function findBySchoolAndLabel(
  schoolId: string,
  label: string,
): Promise<SchoolYear | null> {
  await connect();
  const doc = await SchoolYearModel.findOne({ schoolId, label })
    .select('-__v')
    .lean<SchoolYearDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function findActiveBySchool(schoolId: string): Promise<SchoolYear | null> {
  await connect();
  const doc = await SchoolYearModel.findOne({ schoolId, status: 'active' })
    .select('-__v')
    .lean<SchoolYearDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function create(
  schoolId: string,
  input: SchoolYearInput,
  userId: string | null,
): Promise<SchoolYear> {
  await connect();
  const doc = await SchoolYearModel.create({
    schoolId,
    ...input,
    status: 'upcoming',
    createdBy: userId,
    updatedBy: userId,
  });
  return toDTO(doc.toObject());
}

export async function updateById(
  id: string,
  patch: SchoolYearUpdate,
  userId: string | null,
): Promise<SchoolYear | null> {
  await connect();
  const doc = await SchoolYearModel.findByIdAndUpdate(
    id,
    { ...patch, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<SchoolYearDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function setStatus(
  id: string,
  status: SchoolYearStatus,
  userId: string | null,
): Promise<SchoolYear | null> {
  await connect();
  const doc = await SchoolYearModel.findByIdAndUpdate(
    id,
    { status, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<SchoolYearDoc | null>();
  return doc ? toDTO(doc) : null;
}
