import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { getGradingPeriod, updateGradingPeriod } from '@/server/services/gradingPeriod.service';
import { gradingPeriodUpdateSchema } from '@/types/gradingPeriod';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/grading-periods/[id]'>) {
  return handleRoute(async () => {
    await requirePermission('grading-period:read');
    const { id } = await ctx.params;
    return getGradingPeriod(id);
  });
}

// Does not accept `status` — see the /open and /lock routes below.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/grading-periods/[id]'>) {
  return handleRoute(async () => {
    const actor = await requirePermission('grading-period:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = gradingPeriodUpdateSchema.parse(body);
    return updateGradingPeriod(id, patch, actor.id);
  });
}
