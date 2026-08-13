import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { getRole, updateRole } from '@/server/services/role.service';
import { roleUpdateSchema } from '@/types/role';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/roles/[id]'>) {
  return handleRoute(async () => {
    await requirePermission('role:read');
    const { id } = await ctx.params;
    return getRole(id);
  });
}

// Rejects stripping role:write/user:write from the isSystem role — see
// role.service.ts#updateRole and contract §2.
export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/roles/[id]'>) {
  return handleRoute(async () => {
    await requirePermission('role:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const patch = roleUpdateSchema.parse(body);
    return updateRole(id, patch);
  });
}
