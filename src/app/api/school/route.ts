import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { getSchool, updateSchool } from '@/server/services/school.service';
import { schoolUpdateSchema } from '@/types/school';

// TODO(Phase 3): requirePermission('school:read') — open to anyone for now.
export async function GET() {
  return handleRoute(() => getSchool());
}

// TODO(Phase 3): requirePermission('school:write')
export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const body = await request.json();
    const input = schoolUpdateSchema.parse(body);
    return updateSchool(input);
  });
}
