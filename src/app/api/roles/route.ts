import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { createRole, listRoles } from '@/server/services/role.service';
import { roleInputSchema } from '@/types/role';

export async function GET() {
  return handleRoute(async () => {
    await requirePermission('role:read');
    return listRoles();
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission('role:write');
    const body = await request.json();
    const input = roleInputSchema.parse(body);
    return createRole(input);
  });
}
