import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { activateSchoolYear } from '@/server/services/schoolYear.service';

// TODO(Phase 3): requirePermission('school-year:write')
// Its own verb, not a PATCH { status: 'active' } — activating has a side
// effect on a sibling record (closes whichever year was active before).
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/activate'>,
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const userId = await getCurrentUserId();
    return activateSchoolYear(id, userId);
  });
}
