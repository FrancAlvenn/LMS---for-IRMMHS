import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { openGradingPeriod } from '@/server/services/gradingPeriod.service';

// TODO(Phase 3): requirePermission('grading-period:write')
// notStarted -> open only; the service rejects any other starting state.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/grading-periods/[id]/open'>,
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const userId = await getCurrentUserId();
    return openGradingPeriod(id, userId);
  });
}
