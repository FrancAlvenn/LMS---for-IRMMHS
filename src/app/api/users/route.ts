import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { createUser, listUsers } from '@/server/services/user.service';
import { userCreateSchema } from '@/types/user';

export async function GET() {
  return handleRoute(async () => {
    await requirePermission('user:read');
    return listUsers();
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const actor = await requirePermission('user:write');
    const body = await request.json();
    const input = userCreateSchema.parse(body);
    return createUser(input, actor.id);
  });
}
