import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { createSchoolYear, listSchoolYears } from '@/server/services/schoolYear.service';
import { schoolYearInputSchema } from '@/types/schoolYear';

// TODO(Phase 3): requirePermission('school-year:read')
export async function GET() {
  return handleRoute(() => listSchoolYears());
}

// TODO(Phase 3): requirePermission('school-year:write')
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = await request.json();
    const input = schoolYearInputSchema.parse(body);
    const userId = await getCurrentUserId();
    return createSchoolYear(input, userId);
  });
}
