import { Types, type Model, type PipelineStage, type QueryFilter } from 'mongoose';

import { TenantRequiredError } from '@/server/lib/errors';

/**
 * Every tenant-scoped repository in this project extends this class instead
 * of calling its Mongoose model directly. See docs/contracts/
 * phase-2.1-tenancy-foundation.md §2.3 — the point of this class is that
 * there is no method here, or on any subclass, that can run a query without
 * a tenantId. `tenant.repository.ts` is the one exception in the codebase
 * and does NOT extend this (contract §2.4) — it's the platform-level
 * registry tenants are resolved *from*, so scoping it by tenant would be
 * incoherent.
 *
 * `TDoc` is the lean()/toObject() document shape (matching the existing
 * `XDoc` type convention in e.g. user.repository.ts). `TDto` is the public
 * shape returned to callers, produced by the subclass's `toDTO()`.
 */
export abstract class TenantScopedRepository<TDoc, TDto> {
  constructor(protected readonly model: Model<unknown>) {}

  protected abstract toDTO(doc: TDoc): TDto;

  /**
   * Every public method below calls this first. Never optional, never
   * skipped — a falsy tenantId throws immediately instead of a query
   * silently running unfiltered. See contract §2.5 for why this is a 500,
   * not a 400: it signals a route handler that failed to resolve a tenant
   * before calling a service, not a client mistake.
   */
  protected requireTenantId(tenantId: string): void {
    if (!tenantId) {
      throw new TenantRequiredError();
    }
  }

  async findById(tenantId: string, id: string): Promise<TDto | null> {
    this.requireTenantId(tenantId);
    const doc = await this.model
      .findOne({ _id: id, tenantId } as QueryFilter<unknown>)
      .lean<TDoc | null>();
    return doc ? this.toDTO(doc) : null;
  }

  async find(tenantId: string, filter: QueryFilter<unknown> = {}): Promise<TDto[]> {
    this.requireTenantId(tenantId);
    const docs = await this.model
      .find({ ...filter, tenantId } as QueryFilter<unknown>)
      .lean<TDoc[]>();
    return docs.map((doc) => this.toDTO(doc));
  }

  async findOne(tenantId: string, filter: QueryFilter<unknown>): Promise<TDto | null> {
    this.requireTenantId(tenantId);
    const doc = await this.model
      .findOne({ ...filter, tenantId } as QueryFilter<unknown>)
      .lean<TDoc | null>();
    return doc ? this.toDTO(doc) : null;
  }

  /**
   * `input` is trusted for every field except `tenantId` — a client-supplied
   * tenantId in a request body is discarded, never honored (contract §2.3:
   * "never trust a client-supplied tenant id").
   */
  async create(
    tenantId: string,
    input: Record<string, unknown>,
    actorId: string | null,
  ): Promise<TDto> {
    this.requireTenantId(tenantId);
    const safeInput = { ...input };
    delete safeInput.tenantId;
    const doc = await this.model.create({
      ...safeInput,
      tenantId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const hydrated = doc as unknown as { toObject: () => TDoc };
    return this.toDTO(hydrated.toObject());
  }

  /**
   * Matches on `{ _id: id, tenantId }` together, not `id` alone with a
   * separate ownership check — requesting another tenant's document by id
   * returns null, indistinguishable from "doesn't exist," never a 403 that
   * confirms the record exists elsewhere.
   */
  async updateById(
    tenantId: string,
    id: string,
    patch: Record<string, unknown>,
    actorId: string | null,
  ): Promise<TDto | null> {
    this.requireTenantId(tenantId);
    const safePatch = { ...patch };
    delete safePatch.tenantId;
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId } as QueryFilter<unknown>,
        { ...safePatch, updatedBy: actorId },
        { returnDocument: 'after' },
      )
      .lean<TDoc | null>();
    return doc ? this.toDTO(doc) : null;
  }

  /** Soft delete only — see CLAUDE.md: never hard-delete an academic record. */
  async archiveById(tenantId: string, id: string, actorId: string | null): Promise<TDto | null> {
    this.requireTenantId(tenantId);
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId } as QueryFilter<unknown>,
        { archivedAt: new Date(), updatedBy: actorId },
        { returnDocument: 'after' },
      )
      .lean<TDoc | null>();
    return doc ? this.toDTO(doc) : null;
  }

  async count(tenantId: string, filter: QueryFilter<unknown> = {}): Promise<number> {
    this.requireTenantId(tenantId);
    return this.model.countDocuments({ ...filter, tenantId } as QueryFilter<unknown>);
  }

  /**
   * Prepends a tenant $match before anything the caller supplies, so no
   * pipeline can be constructed that runs unscoped. Aggregation pipelines
   * don't get Mongoose's automatic string->ObjectId query casting the way
   * find()/findOne() do, so tenantId is cast to an ObjectId explicitly here.
   */
  async aggregate<TResult>(tenantId: string, pipeline: PipelineStage[]): Promise<TResult[]> {
    this.requireTenantId(tenantId);
    return this.model.aggregate<TResult>([
      { $match: { tenantId: new Types.ObjectId(tenantId) } },
      ...pipeline,
    ]);
  }
}
