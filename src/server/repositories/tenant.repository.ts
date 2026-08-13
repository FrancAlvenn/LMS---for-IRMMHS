import { Schema, Types, model, models } from 'mongoose';

import { connect } from '@/server/db/connect';
import { baseSchemaOptions } from '@/server/db/schemaOptions';
import { toISOString } from '@/server/lib/serialize';
import type {
  Tenant,
  TenantCreate,
  TenantLimits,
  TenantStatus,
  TenantUpdate,
} from '@/types/tenant';

// The one repository in the codebase that does NOT extend
// TenantScopedRepository (src/server/tenancy/tenantScopedRepository.ts) —
// this is the platform-level registry tenants are resolved *from*, so
// scoping it by tenant would be incoherent. See contract §2.4.
const tenantSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      immutable: true, // belt-and-suspenders with the Zod schema excluding
      // it from tenantUpdateSchema — see src/types/tenant.ts
    },
    displayName: { type: String, required: true },
    officialName: { type: String, default: null },
    status: {
      type: String,
      enum: ['onboarding', 'active', 'suspended', 'archived'],
      required: true,
      default: 'onboarding',
    },
    locale: { type: String, required: true, default: 'en-PH' },
    timezone: { type: String, required: true, default: 'Asia/Manila' },
    logoUrl: { type: String, default: null },
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
    installedPacks: { type: [String], default: [] },
    limits: {
      type: new Schema(
        { maxLearners: { type: Number, default: null }, maxUsers: { type: Number, default: null } },
        { _id: false },
      ),
      default: null,
    },
    externalIds: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

export const TenantModel = models.Tenant ?? model('Tenant', tenantSchema);

type TenantDoc = {
  _id: Types.ObjectId;
  slug: string;
  displayName: string;
  officialName: string | null;
  status: TenantStatus;
  locale: string;
  timezone: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  installedPacks: string[];
  limits: TenantLimits;
  externalIds: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
};

function toDTO(doc: TenantDoc): Tenant {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    displayName: doc.displayName,
    officialName: doc.officialName,
    status: doc.status,
    locale: doc.locale,
    timezone: doc.timezone,
    logoUrl: doc.logoUrl,
    contactEmail: doc.contactEmail,
    contactPhone: doc.contactPhone,
    installedPacks: doc.installedPacks,
    limits: doc.limits,
    // Mongoose's `minimize` option (default true) strips an empty-object
    // Mixed field entirely before persisting — a tenant seeded with
    // externalIds: {} (e.g. Meridian, which has no LRN/DepEd IDs to
    // record) comes back from the DB with the field simply absent, not
    // `{}`. Fall back explicitly so the DTO's Record<string, string>
    // contract holds regardless of what actually got persisted.
    externalIds: doc.externalIds ?? {},
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
  };
}

export async function findAll(): Promise<Tenant[]> {
  await connect();
  const docs = await TenantModel.find().sort({ displayName: 1 }).select('-__v').lean<TenantDoc[]>();
  return docs.map(toDTO);
}

export async function findById(id: string): Promise<Tenant | null> {
  await connect();
  const doc = await TenantModel.findById(id).select('-__v').lean<TenantDoc | null>();
  return doc ? toDTO(doc) : null;
}

// The lookup Phase 2.4's tenant resolution middleware will call for every
// /s/{slug}/… request. Also used by tenant.service.ts to enforce slug
// uniqueness and by the seed script for idempotency.
export async function findBySlug(slug: string): Promise<Tenant | null> {
  await connect();
  const doc = await TenantModel.findOne({ slug }).select('-__v').lean<TenantDoc | null>();
  return doc ? toDTO(doc) : null;
}

export async function create(input: TenantCreate, createdBy: string | null): Promise<Tenant> {
  await connect();
  const doc = await TenantModel.create({
    ...input,
    createdBy,
    updatedBy: createdBy,
  });
  return toDTO(doc.toObject());
}

export async function updateById(
  id: string,
  patch: TenantUpdate,
  updatedBy: string | null,
): Promise<Tenant | null> {
  await connect();
  const doc = await TenantModel.findByIdAndUpdate(
    id,
    { ...patch, updatedBy },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<TenantDoc | null>();
  return doc ? toDTO(doc) : null;
}

// Status only ever changes through this — never a generic PATCH field.
// Same reasoning as SchoolYear's activate action and GradingPeriod's
// open/lock: a status change here has a side effect (denying every user
// of that school access), so it deserves its own verb.
export async function setStatus(
  id: string,
  status: TenantStatus,
  updatedBy: string | null,
): Promise<Tenant | null> {
  await connect();
  const doc = await TenantModel.findByIdAndUpdate(
    id,
    { status, updatedBy },
    { returnDocument: 'after' },
  )
    .select('-__v')
    .lean<TenantDoc | null>();
  return doc ? toDTO(doc) : null;
}
