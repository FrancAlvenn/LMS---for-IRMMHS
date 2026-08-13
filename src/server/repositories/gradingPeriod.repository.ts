import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import type {
  GradingPeriod,
  GradingPeriodInput,
  GradingPeriodStatus,
  GradingPeriodUpdate,
} from '@/types/gradingPeriod';

const gradingPeriodSchema = new Schema(
  {
    schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
    sequence: { type: Number, required: true },
    label: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['notStarted', 'open', 'locked'],
      required: true,
      default: 'notStarted',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

gradingPeriodSchema.index({ schoolYearId: 1, sequence: 1 }, { unique: true });

export const GradingPeriodModel =
  models.GradingPeriod ?? model('GradingPeriod', gradingPeriodSchema);

type GradingPeriodDoc = {
  _id: Types.ObjectId;
  schoolYearId: Types.ObjectId;
  sequence: number;
  label: string;
  startDate: Date;
  endDate: Date;
  status: GradingPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
};

function toDTO(doc: GradingPeriodDoc): GradingPeriod {
  return {
    id: doc._id.toString(),
    schoolYearId: doc.schoolYearId.toString(),
    sequence: doc.sequence,
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

export async function findAllBySchoolYear(schoolYearId: string): Promise<GradingPeriod[]> {
  await connect();
  const docs = await GradingPeriodModel.find({ schoolYearId })
    .sort({ sequence: 1 })
    .select('-__v')
    .lean<GradingPeriodDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<GradingPeriod | null> {
  await connect();
  const doc = await GradingPeriodModel.findById(id).select('-__v').lean<GradingPeriodDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function create(
  schoolYearId: string,
  input: GradingPeriodInput,
  userId: string | null,
): Promise<GradingPeriod> {
  await connect();
  const doc = await GradingPeriodModel.create({
    schoolYearId,
    ...input,
    status: 'notStarted',
    createdBy: userId,
    updatedBy: userId,
  });
  return toDTO(doc.toObject());
}

export async function updateById(
  id: string,
  patch: GradingPeriodUpdate,
  userId: string | null,
): Promise<GradingPeriod | null> {
  await connect();
  const doc = await GradingPeriodModel.findByIdAndUpdate(
    id,
    { ...patch, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<GradingPeriodDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function setStatus(
  id: string,
  status: GradingPeriodStatus,
  userId: string | null,
): Promise<GradingPeriod | null> {
  await connect();
  const doc = await GradingPeriodModel.findByIdAndUpdate(
    id,
    { status, updatedBy: userId },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<GradingPeriodDoc | null>();
  return doc ? toDTO(doc) : null;
}
