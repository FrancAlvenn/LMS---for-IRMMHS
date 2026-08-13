import { handleRoute } from '@/server/lib/routeHandler';
import { getActiveSchoolYear } from '@/server/services/schoolYear.service';

// TODO(Phase 3): requirePermission('school-year:read')
// Returns { data: null, error: null } when no school year is active yet —
// an empty answer, not a 404, since that's a legitimate fresh-deployment
// state, not an error condition.
export async function GET() {
  return handleRoute(() => getActiveSchoolYear());
}
