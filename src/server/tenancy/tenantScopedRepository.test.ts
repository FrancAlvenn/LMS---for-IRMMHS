import { describe, expect, it, vi } from 'vitest';

import { TenantRequiredError } from '@/server/lib/errors';

import { TenantScopedRepository } from './tenantScopedRepository';

/**
 * A minimal stand-in for a Mongoose Model — just enough surface for the
 * base class to call, with every method spy-able so tests can assert on
 * the exact filter/update shapes each method builds. The full-fidelity
 * version of this (seeding two real tenants against a real model and
 * asserting isolation end to end) is Prompt 2.6's isolation test suite,
 * once a real tenant-scoped model exists — this file only proves the base
 * class itself never constructs an unscoped query.
 */
function chainable<T>(resolved: T) {
  return { lean: vi.fn().mockResolvedValue(resolved) };
}

function buildFakeModel() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  };
}

type FakeDoc = { _id: string; tenantId: string; name: string };

class TestRepo extends TenantScopedRepository<FakeDoc, FakeDoc> {
  toDTO(doc: FakeDoc): FakeDoc {
    return doc;
  }
}

// A real 24-hex-char ObjectId string — matches what an actual tenantId
// looks like in production (the stringified Tenant _id). Deliberately not
// a human-readable placeholder like "tenant-a": the aggregate() method
// casts tenantId with `new Types.ObjectId(tenantId)`, which throws on
// anything that isn't 12 raw bytes or 24 hex characters.
const TENANT_A = '507f1f77bcf86cd799439011';

describe('TenantScopedRepository', () => {
  it('throws TenantRequiredError, not an unfiltered query, when tenantId is falsy', async () => {
    const model = buildFakeModel();
    const repo = new TestRepo(model as never);

    await expect(repo.findById('', 'x')).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.find('')).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.findOne('', {})).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.create('', {}, null)).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.updateById('', 'x', {}, null)).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.archiveById('', 'x', null)).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.count('')).rejects.toBeInstanceOf(TenantRequiredError);
    await expect(repo.aggregate('', [])).rejects.toBeInstanceOf(TenantRequiredError);

    // Not one of the underlying model methods was ever reached.
    expect(model.findOne).not.toHaveBeenCalled();
    expect(model.find).not.toHaveBeenCalled();
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
    expect(model.countDocuments).not.toHaveBeenCalled();
    expect(model.aggregate).not.toHaveBeenCalled();
  });

  it('findById matches on { _id, tenantId } together', async () => {
    const model = buildFakeModel();
    model.findOne.mockReturnValue(chainable(null));
    const repo = new TestRepo(model as never);

    await repo.findById(TENANT_A, 'doc-1');

    expect(model.findOne).toHaveBeenCalledWith({ _id: 'doc-1', tenantId: TENANT_A });
  });

  it('find merges tenantId into whatever filter the caller supplies', async () => {
    const model = buildFakeModel();
    model.find.mockReturnValue(chainable([]));
    const repo = new TestRepo(model as never);

    await repo.find(TENANT_A, { name: 'Sampaguita' });

    expect(model.find).toHaveBeenCalledWith({ name: 'Sampaguita', tenantId: TENANT_A });
  });

  it('create injects the real tenantId and discards any client-supplied one', async () => {
    const model = buildFakeModel();
    model.create.mockResolvedValue({
      toObject: () => ({ _id: 'new-doc', tenantId: TENANT_A, name: 'x' }),
    });
    const repo = new TestRepo(model as never);

    await repo.create(TENANT_A, { name: 'x', tenantId: 'attacker-supplied-tenant-b' }, 'actor-1');

    expect(model.create).toHaveBeenCalledWith({
      name: 'x',
      tenantId: TENANT_A,
      createdBy: 'actor-1',
      updatedBy: 'actor-1',
    });
  });

  it('updateById matches on { _id, tenantId } and discards a client-supplied tenantId in the patch', async () => {
    const model = buildFakeModel();
    model.findOneAndUpdate.mockReturnValue(chainable(null));
    const repo = new TestRepo(model as never);

    await repo.updateById(
      TENANT_A,
      'doc-1',
      { name: 'y', tenantId: 'attacker-supplied-tenant-b' },
      'actor-1',
    );

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'doc-1', tenantId: TENANT_A },
      { name: 'y', updatedBy: 'actor-1' },
      { returnDocument: 'after' },
    );
  });

  it('archiveById sets archivedAt and matches on { _id, tenantId }', async () => {
    const model = buildFakeModel();
    model.findOneAndUpdate.mockReturnValue(chainable(null));
    const repo = new TestRepo(model as never);

    await repo.archiveById(TENANT_A, 'doc-1', 'actor-1');

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'doc-1', tenantId: TENANT_A },
      { archivedAt: expect.any(Date), updatedBy: 'actor-1' },
      { returnDocument: 'after' },
    );
  });

  it('count merges tenantId into the filter', async () => {
    const model = buildFakeModel();
    model.countDocuments.mockResolvedValue(3);
    const repo = new TestRepo(model as never);

    const result = await repo.count(TENANT_A, { name: 'x' });

    expect(model.countDocuments).toHaveBeenCalledWith({ name: 'x', tenantId: TENANT_A });
    expect(result).toBe(3);
  });

  it('aggregate prepends a tenant $match before the caller-supplied pipeline', async () => {
    const model = buildFakeModel();
    model.aggregate.mockResolvedValue([]);
    const repo = new TestRepo(model as never);

    await repo.aggregate(TENANT_A, [{ $group: { _id: '$name' } }]);

    expect(model.aggregate).toHaveBeenCalledTimes(1);
    const pipeline = model.aggregate.mock.calls[0][0];
    expect(pipeline[0].$match.tenantId.toString()).toBe(TENANT_A);
    expect(pipeline[1]).toEqual({ $group: { _id: '$name' } });
  });
});
