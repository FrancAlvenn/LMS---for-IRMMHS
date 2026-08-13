import type { Permission } from '@/types/permission';

/**
 * next-auth v4 module augmentation — standard, stable pattern, unchanged
 * across v4's lifetime. Without this, session.user/token fields are
 * untyped `any`. See docs/contracts/phase-3.1-identity-access.md §4.
 */
declare module 'next-auth' {
  interface User {
    id: string;
    username: string;
    displayName: string;
    roleId: string;
    mustChangePassword: boolean;
  }

  interface Session {
    // Optional, not required: a disabled account's token maps to a
    // session with no user at all (see authOptions.ts's session()
    // callback) — every consumer treats that as "not signed in."
    user?: {
      id: string;
      username: string;
      displayName: string;
      role: string;
      permissions: Permission[];
      mustChangePassword: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    displayName: string;
    role: string;
    permissions: Permission[];
    mustChangePassword: boolean;
    // Set by the per-request status re-check in the jwt() callback when
    // an admin has disabled this account since the token was issued.
    disabled?: boolean;
  }
}
