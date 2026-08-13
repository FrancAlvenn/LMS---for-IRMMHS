import * as gradingPeriodRepository from '@/server/repositories/gradingPeriod.repository';
// Depends on the repository, not schoolYear.service — schoolYear.service
// imports this file (createSchoolYearWithPeriods), so importing the
// service back here would create a circular module dependency.
import * as schoolYearRepository from '@/server/repositories/schoolYear.repository';
import { InvalidTransitionError, NotFoundError } from '@/server/lib/errors';
import type { GradingPeriod, GradingPeriodInput, GradingPeriodUpdate } from '@/types/gradingPeriod';

export async function listGradingPeriods(schoolYearId: string): Promise<GradingPeriod[]> {
  return gradingPeriodRepository.findAllBySchoolYear(schoolYearId);
}

export async function getGradingPeriod(id: string): Promise<GradingPeriod> {
  const period = await gradingPeriodRepository.findById(id);
  if (!period) {
    throw new NotFoundError('Grading period not found.');
  }
  return period;
}

export async function createGradingPeriod(
  schoolYearId: string,
  input: GradingPeriodInput,
  userId: string | null,
): Promise<GradingPeriod> {
  const schoolYear = await schoolYearRepository.findById(schoolYearId);
  if (!schoolYear) {
    throw new NotFoundError('School year not found.');
  }
  return gradingPeriodRepository.create(schoolYearId, input, userId);
}

export async function updateGradingPeriod(
  id: string,
  patch: GradingPeriodUpdate,
  userId: string | null,
): Promise<GradingPeriod> {
  const updated = await gradingPeriodRepository.updateById(id, patch, userId);
  if (!updated) {
    throw new NotFoundError('Grading period not found.');
  }
  return updated;
}

export async function openGradingPeriod(id: string, userId: string | null): Promise<GradingPeriod> {
  const period = await getGradingPeriod(id);
  if (period.status !== 'notStarted') {
    throw new InvalidTransitionError(
      `Cannot open a grading period with status "${period.status}" (must be "notStarted").`,
    );
  }
  const updated = await gradingPeriodRepository.setStatus(id, 'open', userId);
  if (!updated) {
    throw new NotFoundError('Grading period not found.');
  }
  return updated;
}

export async function lockGradingPeriod(id: string, userId: string | null): Promise<GradingPeriod> {
  const period = await getGradingPeriod(id);
  if (period.status !== 'open') {
    throw new InvalidTransitionError(
      `Cannot lock a grading period with status "${period.status}" (must be "open").`,
    );
  }
  const updated = await gradingPeriodRepository.setStatus(id, 'locked', userId);
  if (!updated) {
    throw new NotFoundError('Grading period not found.');
  }
  return updated;
}
