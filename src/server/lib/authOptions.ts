import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

import * as roleRepository from '@/server/repositories/role.repository';
import * as userRepository from '@/server/repositories/user.repository';
import { verifyCredentials } from '@/server/services/user.service';

/**
 * next-auth v4, Credentials provider, JWT sessions. See
 * docs/contracts/phase-3.1-identity-access.md §4 for the reasoning behind
 * the staleness trade-off in the callbacks below — permissions are
 * embedded at sign-in only, but account status is re-checked every call.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }
        // Returns null on any failure (wrong username/password, disabled
        // account) — next-auth's CredentialsSignin flow expects null to
        // mean "invalid," not an exception.
        return verifyCredentials(credentials.username, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign-in: `user` is whatever authorize() returned.
        // Look up the role once here so permissions ride in the token —
        // see contract §4 on why this isn't refreshed every request.
        const role = await roleRepository.findById(user.roleId);
        token.id = user.id;
        token.username = user.username;
        token.displayName = user.displayName;
        token.role = role?.name ?? '';
        token.permissions = role?.permissions ?? [];
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }

      // useSession().update({ mustChangePassword: false }) after a
      // successful password change — see contract §6#2. Refreshes the
      // claim without a full re-login.
      if (trigger === 'update' && typeof session?.mustChangePassword === 'boolean') {
        token.mustChangePassword = session.mustChangePassword;
      }

      // Cheap per-request check: has an admin disabled this account
      // since the token was issued? Deliberately the only thing
      // re-checked on every call — see contract §4.
      if (token.id) {
        const status = await userRepository.findStatusById(token.id);
        token.disabled = status !== 'active';
      }

      return token;
    },
    async session({ session, token }) {
      if (token.disabled) {
        // No `user` on the session — every consumer in this codebase
        // treats that as "not signed in" (see requirePermission()).
        session.user = undefined;
        return session;
      }
      session.user = {
        id: token.id,
        username: token.username,
        displayName: token.displayName,
        role: token.role,
        permissions: token.permissions,
        mustChangePassword: token.mustChangePassword,
      };
      return session;
    },
  },
};
