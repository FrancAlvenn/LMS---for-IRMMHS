import * as schoolRepository from '@/server/repositories/school.repository';
import { NotFoundError } from '@/server/lib/errors';
import type { School, SchoolInput, SchoolUpdate } from '@/types/school';

/**
 * Modeled as a collection (see docs/contracts/phase-2.1-config-foundation.md
 * §1), but exactly one document should ever exist for v1. This is the
 * defensive check that catches a data-integrity bug early instead of
 * silently picking "the first one."
 */
export async function getSchool(): Promise<School | null> {
  const schools = await schoolRepository.findAll();
  if (schools.length > 1) {
    throw new Error(`Data integrity: ${schools.length} School documents exist; expected 0 or 1.`);
  }
  return schools[0] ?? null;
}

// Not wired to a route (no POST /api/school in the contract) — called by
// the seed script (Prompt 2.5) only. A fresh deployment has no way to get
// a School profile except by seeding.
export async function createSchool(input: SchoolInput): Promise<School> {
  const existing = await getSchool();
  if (existing) {
    throw new Error('A School profile already exists; use updateSchool instead.');
  }
  return schoolRepository.create(input);
}

export async function updateSchool(patch: SchoolUpdate): Promise<School> {
  const school = await getSchool();
  if (!school) {
    throw new NotFoundError('School profile has not been set up yet. Run the seed script first.');
  }
  const updated = await schoolRepository.updateById(school.id, patch);
  if (!updated) {
    throw new NotFoundError('School profile not found.');
  }
  return updated;
}
