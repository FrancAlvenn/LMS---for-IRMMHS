import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { enableUser } from '@/server/services/user.service';

export async function POST(_request: NextRequest, ctx: RouteContext<'/api/users/[id]/enable'>) {
  return handleRoute(async () => {
    const actor = await requirePermission('user:write');
    const { id } = await ctx.params;
    return enableUser(id, actor.id);
  });
}
