import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { activateSchoolYear } from '@/server/services/schoolYear.service';

// Its own verb, not a PATCH { status: 'active' } — activating has a side
// effect on a sibling record (closes whichever year was active before).
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/activate'>,
) {
  return handleRoute(async () => {
    const actor = await requirePermission('school-year:write');
    const { id } = await ctx.params;
    return activateSchoolYear(id, actor.id);
  });
}
