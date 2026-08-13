import { handleRoute } from '@/server/lib/routeHandler';
import { getCurrentUser } from '@/server/lib/session';

// No permission required — this route answers "is anyone signed in, and
// who?" `data: null` when there's no session is the answer, not an error
// (same "empty isn't an error" pattern as GET /api/school-years/active).
export async function GET() {
  return handleRoute(() => getCurrentUser());
}
