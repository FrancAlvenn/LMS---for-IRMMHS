import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { createGradingPeriod, listGradingPeriods } from '@/server/services/gradingPeriod.service';
import { gradingPeriodInputSchema } from '@/types/gradingPeriod';

// TODO(Phase 3): requirePermission('grading-period:read')
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/grading-periods'>,
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    return listGradingPeriods(id);
  });
}

// TODO(Phase 3): requirePermission('grading-period:write')
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/grading-periods'>,
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const body = await request.json();
    const input = gradingPeriodInputSchema.parse(body);
    const userId = await getCurrentUserId();
    return createGradingPeriod(id, input, userId);
  });
}
