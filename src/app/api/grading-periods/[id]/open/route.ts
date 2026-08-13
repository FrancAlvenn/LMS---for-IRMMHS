import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { openGradingPeriod } from '@/server/services/gradingPeriod.service';

// notStarted -> open only; the service rejects any other starting state.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/grading-periods/[id]/open'>,
) {
  return handleRoute(async () => {
    const actor = await requirePermission('grading-period:write');
    const { id } = await ctx.params;
    return openGradingPeriod(id, actor.id);
  });
}
