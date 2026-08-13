import * as tenantRepository from '@/server/repositories/tenant.repository';
import { ConflictError, InvalidTransitionError, NotFoundError } from '@/server/lib/errors';
import type { Tenant, TenantCreate, TenantUpdate } from '@/types/tenant';

// No route handlers call these yet — deferred to Phase 17 (Platform
// console), per contract §4 open question #3. For now this is called by
// the seed script only, same status as school.service.ts's createSchool
// before Phase 3 gave it real routes.

export async function listTenants(): Promise<Tenant[]> {
  return tenantRepository.findAll();
}

export async function getTenant(id: string): Promise<Tenant> {
  const tenant = await tenantRepository.findById(id);
  if (!tenant) {
    throw new NotFoundError('Tenant not found.');
  }
  return tenant;
}

// Used for seed idempotency now; this is also the lookup Phase 2.4's
// tenant resolution middleware will call for every /s/{slug}/… request.
export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  return tenantRepository.findBySlug(slug);
}

export async function createTenant(input: TenantCreate, createdBy: string | null): Promise<Tenant> {
  const existing = await tenantRepository.findBySlug(input.slug);
  if (existing) {
    throw new ConflictError(`A tenant with slug "${input.slug}" already exists.`);
  }
  return tenantRepository.create(input, createdBy);
}

export async function updateTenant(
  id: string,
  patch: TenantUpdate,
  updatedBy: string | null,
): Promise<Tenant> {
  const updated = await tenantRepository.updateById(id, patch, updatedBy);
  if (!updated) {
    throw new NotFoundError('Tenant not found.');
  }
  return updated;
}

export async function activateTenant(id: string, updatedBy: string | null): Promise<Tenant> {
  const tenant = await getTenant(id);
  if (tenant.status !== 'onboarding' && tenant.status !== 'suspended') {
    throw new InvalidTransitionError(
      `Cannot activate a tenant with status "${tenant.status}" (must be "onboarding" or "suspended").`,
    );
  }
  const updated = await tenantRepository.setStatus(id, 'active', updatedBy);
  if (!updated) {
    throw new NotFoundError('Tenant not found.');
  }
  return updated;
}

export async function suspendTenant(id: string, updatedBy: string | null): Promise<Tenant> {
  const tenant = await getTenant(id);
  if (tenant.status !== 'active') {
    throw new InvalidTransitionError(
      `Cannot suspend a tenant with status "${tenant.status}" (must be "active").`,
    );
  }
  const updated = await tenantRepository.setStatus(id, 'suspended', updatedBy);
  if (!updated) {
    throw new NotFoundError('Tenant not found.');
  }
  return updated;
}

export async function archiveTenant(id: string, updatedBy: string | null): Promise<Tenant> {
  const tenant = await getTenant(id);
  if (tenant.status === 'archived') {
    throw new InvalidTransitionError('This tenant is already archived.');
  }
  const updated = await tenantRepository.setStatus(id, 'archived', updatedBy);
  if (!updated) {
    throw new NotFoundError('Tenant not found.');
  }
  return updated;
}

// Seed-only convenience — creates the tenant if its slug doesn't exist yet,
// then ensures it's active regardless of which branch ran. Mirrors the
// ensureAdminRole() pattern in role.service.ts.
export async function ensureActiveTenant(
  input: TenantCreate,
  createdBy: string | null,
): Promise<Tenant> {
  let tenant = await tenantRepository.findBySlug(input.slug);
  if (!tenant) {
    tenant = await tenantRepository.create(input, createdBy);
  }
  if (tenant.status !== 'active') {
    tenant = (await tenantRepository.setStatus(tenant.id, 'active', createdBy)) ?? tenant;
  }
  return tenant;
}
