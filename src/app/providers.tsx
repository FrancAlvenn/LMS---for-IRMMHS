'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

// next-auth v4's useSession()/signIn()/signOut() need this context provider.
// React context only works in Client Components, so this is split out from
// the (Server Component) root layout — see Next's authentication guide.
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
