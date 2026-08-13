import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { createGradingPeriod, listGradingPeriods } from '@/server/services/gradingPeriod.service';
import { gradingPeriodInputSchema } from '@/types/gradingPeriod';

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/grading-periods'>,
) {
  return handleRoute(async () => {
    await requirePermission('grading-period:read');
    const { id } = await ctx.params;
    return listGradingPeriods(id);
  });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/school-years/[id]/grading-periods'>,
) {
  return handleRoute(async () => {
    const actor = await requirePermission('grading-period:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const input = gradingPeriodInputSchema.parse(body);
    return createGradingPeriod(id, input, actor.id);
  });
}
