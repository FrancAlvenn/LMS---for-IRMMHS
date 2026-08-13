import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUserId } from '@/server/lib/session';
import { lockGradingPeriod } from '@/server/services/gradingPeriod.service';

// TODO(Phase 3): requirePermission('grading-period:write')
// open -> locked only; the service rejects any other starting state.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/grading-periods/[id]/lock'>,
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const userId = await getCurrentUserId();
    return lockGradingPeriod(id, userId);
  });
}
