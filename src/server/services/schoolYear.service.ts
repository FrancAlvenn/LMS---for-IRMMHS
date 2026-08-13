import { getSchool } from '@/server/services/school.service';
import * as schoolYearRepository from '@/server/repositories/schoolYear.repository';
import { createGradingPeriod } from '@/server/services/gradingPeriod.service';
import { NotFoundError } from '@/server/lib/errors';
import type { SchoolYear, SchoolYearInput, SchoolYearUpdate } from '@/types/schoolYear';
import type { GradingPeriod, GradingPeriodInput } from '@/types/gradingPeriod';

async function requireSchoolId(): Promise<string> {
  const school = await getSchool();
  if (!school) {
    throw new NotFoundError('School profile has not been set up yet. Run the seed script first.');
  }
  return school.id;
}

export async function listSchoolYears(): Promise<SchoolYear[]> {
  const schoolId = await requireSchoolId();
  return schoolYearRepository.findAllBySchool(schoolId);
}

export async function getSchoolYear(id: string): Promise<SchoolYear> {
  const schoolYear = await schoolYearRepository.findById(id);
  if (!schoolYear) {
    throw new NotFoundError('School year not found.');
  }
  return schoolYear;
}

// Used by the seed script to stay idempotent on re-runs. Not wired to a
// route — the contract's endpoint list doesn't need lookup-by-label.
export async function findSchoolYearByLabel(label: string): Promise<SchoolYear | null> {
  const schoolId = await requireSchoolId();
  return schoolYearRepository.findBySchoolAndLabel(schoolId, label);
}

/**
 * The pattern every SY-scoped query in every later phase builds on: "what
 * school year is it right now?" Returns null rather than throwing when
 * there isn't one — an empty answer, not an error, since a fresh
 * deployment legitimately has no active year yet.
 */
export async function getActiveSchoolYear(): Promise<SchoolYear | null> {
  const school = await getSchool();
  if (!school) return null;
  return schoolYearRepository.findActiveBySchool(school.id);
}

export async function createSchoolYear(
  input: SchoolYearInput,
  userId: string | null,
): Promise<SchoolYear> {
  const schoolId = await requireSchoolId();
  return schoolYearRepository.create(schoolId, input, userId);
}

export async function updateSchoolYear(
  id: string,
  patch: SchoolYearUpdate,
  userId: string | null,
): Promise<SchoolYear> {
  const updated = await schoolYearRepository.updateById(id, patch, userId);
  if (!updated) {
    throw new NotFoundError('School year not found.');
  }
  return updated;
}

/**
 * Sets `id` active and, if a different school year was previously active,
 * closes it — one operation, so there's never a moment with zero or two
 * active years for callers who read in between. See contract §2 for the
 * DB-level partial-unique-index backstop.
 */
export async function activateSchoolYear(id: string, userId: string | null): Promise<SchoolYear> {
  const target = await schoolYearRepository.findById(id);
  if (!target) {
    throw new NotFoundError('School year not found.');
  }

  const currentActive = await schoolYearRepository.findActiveBySchool(target.schoolId);
  if (currentActive && currentActive.id !== target.id) {
    await schoolYearRepository.setStatus(currentActive.id, 'closed', userId);
  }

  const activated = await schoolYearRepository.setStatus(target.id, 'active', userId);
  if (!activated) {
    throw new NotFoundError('School year not found.');
  }
  return activated;
}

/**
 * Convenience for the common case (JHS: 4 quarters) — see contract §5#2.
 * POST /api/school-years itself only creates the year; this is used by
 * the seed script, which needs both in one call.
 */
export async function createSchoolYearWithPeriods(
  input: SchoolYearInput,
  periods: GradingPeriodInput[],
  userId: string | null,
): Promise<{ schoolYear: SchoolYear; gradingPeriods: GradingPeriod[] }> {
  const schoolYear = await createSchoolYear(input, userId);
  const gradingPeriods: GradingPeriod[] = [];
  for (const period of periods) {
    gradingPeriods.push(await createGradingPeriod(schoolYear.id, period, userId));
  }
  return { schoolYear, gradingPeriods };
}
