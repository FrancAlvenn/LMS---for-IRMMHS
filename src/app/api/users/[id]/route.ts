import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { getUser, updateUser } from '@/server/services/user.service';
import { userUpdateSchema } from '@/types/user';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/users/[id]'>) {
  return handleRoute(async () => {
    await requirePermission('user:read');
    const { id } = await ctx.params;
    return getUser(id);
  });
}

// displayName/email/roleId only — not status or password. See the
// disable/enable and reset-password action routes.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/users/[id]'>) {
  return handleRoute(async () => {
    const actor = await requirePermission('user:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = userUpdateSchema.parse(body);
    return updateUser(id, patch, actor.id);
  });
}
