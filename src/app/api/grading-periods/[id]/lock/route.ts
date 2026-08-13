import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { lockGradingPeriod } from '@/server/services/gradingPeriod.service';

// open -> locked only; the service rejects any other starting state.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/grading-periods/[id]/lock'>,
) {
  return handleRoute(async () => {
    const actor = await requirePermission('grading-period:write');
    const { id } = await ctx.params;
    return lockGradingPeriod(id, actor.id);
  });
}
