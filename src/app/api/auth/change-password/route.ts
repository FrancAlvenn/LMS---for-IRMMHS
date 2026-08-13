import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { UnauthorizedError } from '@/server/lib/errors';
import { getCurrentUser } from '@/server/lib/session';
import { changeOwnPassword } from '@/server/services/user.service';
import { changePasswordSchema } from '@/types/user';

// Any signed-in user, no particular permission — this is "change your own
// password," not an admin action. See contract §6#2: no currentPassword
// required, and the client must call useSession().update() after success
// to refresh the mustChangePassword claim without forcing a re-login.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }
    const body = await request.json();
    const input = changePasswordSchema.parse(body);
    return changeOwnPassword(user.id, input);
  });
}
