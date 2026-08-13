import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { getSchoolYear, updateSchoolYear } from '@/server/services/schoolYear.service';
import { schoolYearUpdateSchema } from '@/types/schoolYear';

// TODO(Phase 3): requirePermission('school-year:read')
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/school-years/[id]'>) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    return getSchoolYear(id);
  });
}

// TODO(Phase 3): requirePermission('school-year:write')
// Does not accept `status` — see schoolYearUpdateSchema and the /activate
// route below.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/school-years/[id]'>) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = schoolYearUpdateSchema.parse(body);
    const userId = await getCurrentUserId();
    return updateSchoolYear(id, patch, userId);
  });
}
