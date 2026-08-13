import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { getSchoolYear, updateSchoolYear } from '@/server/services/schoolYear.service';
import { schoolYearUpdateSchema } from '@/types/schoolYear';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/school-years/[id]'>) {
  return handleRoute(async () => {
    await requirePermission('school-year:read');
    const { id } = await ctx.params;
    return getSchoolYear(id);
  });
}

// Does not accept `status` — see schoolYearUpdateSchema and the /activate
// route below.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/school-years/[id]'>) {
  return handleRoute(async () => {
    const actor = await requirePermission('school-year:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = schoolYearUpdateSchema.parse(body);
    return updateSchoolYear(id, patch, actor.id);
  });
}
