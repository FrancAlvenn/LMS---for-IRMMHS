import type { NextRequest } from 'next/server';

import { handleRoute } from '@/server/lib/routeHandler';
import { requirePermission } from '@/server/lib/session';
import { resetPassword } from '@/server/services/user.service';
import { resetPasswordSchema } from '@/types/user';

// Admin sets someone else's password directly (same reasoning as account
// creation — no email-delivery system exists to send a reset link
// through). Always forces mustChangePassword: true on the target account.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/users/[id]/reset-password'>,
) {
  return handleRoute(async () => {
    const actor = await requirePermission('user:write');
    const { id } = await ctx.params;
    const body = await request.json();
    const input = resetPasswordSchema.parse(body);
    return resetPassword(id, input, actor.id);
  });
}
