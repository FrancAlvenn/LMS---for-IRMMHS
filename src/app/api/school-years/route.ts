import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { createSchoolYear, listSchoolYears } from '@/server/services/schoolYear.service';
import { schoolYearInputSchema } from '@/types/schoolYear';

export async function GET() {
  return handleRoute(async () => {
    await requirePermission('school-year:read');
    return listSchoolYears();
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const actor = await requirePermission('school-year:write');
    const body = await request.json();
    const input = schoolYearInputSchema.parse(body);
    return createSchoolYear(input, actor.id);
  });
}
