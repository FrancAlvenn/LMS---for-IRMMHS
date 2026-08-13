import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { getGradingPeriod, updateGradingPeriod } from '@/server/services/gradingPeriod.service';
import { gradingPeriodUpdateSchema } from '@/types/gradingPeriod';

// TODO(Phase 3): requirePermission('grading-period:read')
export async function GET(_request: NextRequest, ctx: RouteContext<'/api/grading-periods/[id]'>) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    return getGradingPeriod(id);
  });
}

// TODO(Phase 3): requirePermission('grading-period:write')
// Does not accept `status` — see the /open and /lock routes below.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/grading-periods/[id]'>) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = gradingPeriodUpdateSchema.parse(body);
    const userId = await getCurrentUserId();
    return updateGradingPeriod(id, patch, userId);
  });
}
