import NextAuth from 'next-auth';

import { authOptions } from '@/server/lib/authOptions';

// next-auth's own catch-all — signin/signout/session/csrf. Framework-owned:
// deliberately not wrapped in handleRoute(), which is for this project's
// own { data, error } routes only.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
