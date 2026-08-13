import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { getSchool, updateSchool } from '@/server/services/school.service';
import { schoolUpdateSchema } from '@/types/school';

export async function GET() {
  return handleRoute(async () => {
    await requirePermission('school:read');
    return getSchool();
  });
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission('school:write');
    const body = await request.json();
    const input = schoolUpdateSchema.parse(body);
    return updateSchool(input);
  });
}
