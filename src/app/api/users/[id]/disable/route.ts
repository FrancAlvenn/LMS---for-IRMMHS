import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { disableUser } from '@/server/services/user.service';

// Own action, not a PATCH { status } field — see Phase 2's convention on
// state transitions with a real effect (here: an existing session's next
// request gets logged out, per authOptions.ts's per-request status check).
export async function POST(_request: NextRequest, ctx: RouteContext<'/api/users/[id]/disable'>) {
  return handleRoute(async () => {
    const actor = await requirePermission('user:write');
    const { id } = await ctx.params;
    return disableUser(id, actor.id);
  });
}
