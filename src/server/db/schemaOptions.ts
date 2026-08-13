import type { SchemaOptions } from 'mongoose';

/**
 * Every Mongoose model in this project spreads this into its schema
 * definition (`new Schema({ ... }, baseSchemaOptions)`):
 *
 * - `timestamps: true` adds createdAt/updatedAt automatically.
 * - the `toJSON` transform renames `_id` -> `id` and strips `__v`, so API
 *   responses never leak Mongoose internals to the client.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id ? String(ret._id) : undefined;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};
