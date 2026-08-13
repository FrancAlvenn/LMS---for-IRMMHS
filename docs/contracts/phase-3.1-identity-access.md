# Phase 3.1 — Contract: User, Role, Permission, Auth

**Status:** Draft, awaiting review. No implementation yet (Habit 3 — this is
Prompt A; Prompt B implements it once approved).

**Library decision, confirmed 2026-08-13:** `next-auth` **v4.24.15** (stable),
not v5 (still beta). Credentials provider + JWT sessions — no DB adapter,
`authorize()` queries our own `User` model directly.

**Next.js 16 naming change that affects this phase:** Middleware is now called
**Proxy** — the file is `proxy.ts` at repo root, not `middleware.ts` (confirmed
from `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`,
functionality unchanged, name only). Also load-bearing: Next's own guidance is
explicit that Proxy/middleware must never be the _only_ auth check — it's for
optimistic redirects, real enforcement happens in route handlers.

---

## 1. Permission taxonomy (code, not data)

A hardcoded `resource:action` string union — this is "the shape of what the
system can check," which changes by deploy, same category as "what a School
Form looks like" in `CLAUDE.md`'s configure/hard-code split. **Which
permissions a role _has_** is data (§2). Phase 2 already stubbed route
handlers with `// TODO(Phase 3): requirePermission('resource:action')`
comments using exactly this shape — this list formalizes what's already there
plus what Phase 3 itself needs:

```ts
export const PERMISSIONS = [
  'school:read',
  'school:write',
  'school-year:read',
  'school-year:write',
  'grading-period:read',
  'grading-period:write',
  'user:read',
  'user:write',
  'role:read',
  'role:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
```

Every later phase appends to this list (`learner:read`, `grade:write`, ...) —
it is never generated from data, so a new permission always ships with the
code that checks it.

## 2. Role

```ts
interface Role {
  id: string;
  name: string; // "Admin", "Registrar", "Teacher", "Adviser"
  description?: string;
  permissions: Permission[]; // subset of PERMISSIONS — this part IS data,
  // editable by an admin, per playbook Force 2
  isSystem: boolean; // true only for "Admin" — see below
  createdAt: Date;
  updatedAt: Date;
}
```

**`isSystem`, and why:** Role is admin-editable data. Without a guard, an
admin can strip `role:write` from every role including their own, or delete
the last role capable of managing roles, and lock the school out of its own
admin console with no recovery path except a database edit. One role
(seeded as `"Admin"`, `isSystem: true`) cannot be deleted and cannot have
`role:write`/`user:write` removed from it via the API. Everything else about
roles — names, descriptions, which of the other permissions they carry — is
fully editable.

**Zod:**

```ts
const roleInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.enum(PERMISSIONS)),
});
const roleUpdateSchema = roleInputSchema.partial();
```

## 3. User

```ts
interface User {
  id: string;
  username: string; // unique. Admin-chosen for staff; LRN-based
  // for students starting Phase 5 (see §6#1)
  displayName: string;
  email: string | null; // optional — students aren't required to
  // have one (playbook D5)
  roleId: string; // ref Role
  status: 'active' | 'disabled';
  mustChangePassword: boolean; // true on every admin-provisioned account
  lastLoginAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null; // ref User — null for the first seeded admin
  updatedBy: string | null;
}
```

`passwordHash` is **not** on this type on purpose — it exists on the Mongoose
document but the repository's `toDTO()` mapper never includes it. No code
path can accidentally serialize it into a response; there is no field to
forget to strip.

**Zod:**

```ts
// NIST 800-63B: length over mandated complexity. No forced
// uppercase/number/symbol rules — those push people toward "Password1!"
// and sticky notes, not better security. Same "not enterprise-hostile"
// reasoning as the rest of this project's UX.
const passwordSchema = z.string().min(8);

const userCreateSchema = z.object({
  username: z.string().min(3),
  displayName: z.string().min(1),
  email: z.email().nullable().optional(),
  password: passwordSchema, // admin sets the initial password directly —
  // there's no email-delivery system to send a
  // reset link through, and students may have
  // no email at all
  roleId: z.string(),
});

const userUpdateSchema = z.object({
  displayName: z.string().min(1),
  email: z.email().nullable(),
  roleId: z.string(),
});

const changePasswordSchema = z.object({
  newPassword: passwordSchema,
});
```

Password hashing: `bcryptjs` (pure JS — no native build step, so it never
breaks on a machine without build tools; matches "someone else maintains
this after you").

## 4. Session shape & a real staleness tradeoff

JWT session strategy. The `jwt()` callback embeds `{ id, username, role,
permissions, mustChangePassword }` **at sign-in only**. Two consequences,
both deliberate:

- **If an admin edits a role's permissions, users with that role see the
  change on their next login, not immediately.** For a small school with
  infrequent role changes, this is the right trade — refetching the role on
  every request for every user is unnecessary cost for a threat that isn't
  really there.
- **If an admin disables a user, that must take effect immediately** —
  "someone just left the school" can't wait for a token to expire. So the
  `jwt()` callback _does_ re-check `status` (a cheap `findById`) on every
  invocation and invalidates the session if the account is now `disabled`,
  even though it doesn't refresh permissions on every call. Cheap check,
  real consequence; expensive check, low consequence — asymmetric on
  purpose.

`next-auth.d.ts` module augmentation extends `Session`/`JWT`/`User` with
these fields — standard, stable v4 pattern, unchanged across its lifetime.

## 5. Endpoints

`{ data, error }` via `handleRoute()` throughout, same as Phase 2. Two new
error types needed in `src/server/lib/errors.ts`:
`UnauthorizedError` (401, no session) and `ForbiddenError` (403,
authenticated but missing the permission).

| Method | Path                            | Purpose                                                                                        |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| *      | `/api/auth/[...nextauth]`       | next-auth's own catch-all — signin/signout/session/csrf. Framework-owned, not `handleRoute()`. |
| GET    | `/api/me`                       | Current session's user (id, username, displayName, role name, permissions, mustChangePassword) |
| POST   | `/api/auth/change-password`     | Self-service — no `currentPassword` required (see §6#2)                                        |
| GET    | `/api/users`                    | List users — `requirePermission('user:read')`                                                  |
| POST   | `/api/users`                    | Admin-provisioned account, `mustChangePassword: true` — `requirePermission('user:write')`      |
| GET    | `/api/users/:id`                | `requirePermission('user:read')`                                                               |
| PATCH  | `/api/users/:id`                | displayName/email/roleId only — not status or password                                         | `requirePermission('user:write')` |
| POST   | `/api/users/:id/disable`        | Own action, not a PATCH field — see Phase 2's convention on state transitions                  | `requirePermission('user:write')` |
| POST   | `/api/users/:id/enable`         |                                                                                                | `requirePermission('user:write')` |
| POST   | `/api/users/:id/reset-password` | Admin sets a new password + `mustChangePassword: true`                                         | `requirePermission('user:write')` |
| GET    | `/api/roles`                    | `requirePermission('role:read')`                                                               |
| POST   | `/api/roles`                    | `requirePermission('role:write')`                                                              |
| GET    | `/api/roles/:id`                | `requirePermission('role:read')`                                                               |
| PATCH  | `/api/roles/:id`                | Rejects stripping `role:write`/`user:write` from the `isSystem` role                           | `requirePermission('role:write')` |

No `DELETE /api/roles/:id` in this contract — deleting a role in use by a
user needs a decision (reassign? block the delete?) that doesn't have a
forcing use case yet. Left out rather than guessed at; add it when something
actually needs it.

**`requirePermission()`** (`src/server/lib/session.ts`, replacing today's
stub): reads the session via `getServerSession(authOptions)`, throws
`UnauthorizedError` if there's no session, `ForbiddenError` if the
permission isn't in `session.user.permissions`. Every
`// TODO(Phase 3): requirePermission(...)` comment from Phase 2's route
handlers gets replaced with a real call — that cleanup is part of this
phase, not deferred further.

## 6. Open questions

**#1 — LRN-based student usernames can't be built yet.**
Phase 3 (this phase) comes before Phase 5 (Learner records) in the roadmap.
`userCreateSchema.username` is just a string an admin types — there is no
Learner to derive an LRN from yet. The LRN-based auto-generation the
playbook describes for student accounts is a Phase 5 concern: once
`Learner` exists, Phase 5 adds the "create a student login from this
learner's LRN" flow on top of the plain `POST /api/users` this contract
defines. Nothing here blocks that; it just isn't built until there's a
learner to point at.

**#2 — Forced password change doesn't ask for the current password.**
The user just authenticated with it seconds ago to reach this screen, so
re-asking adds friction without adding security. `POST
/api/auth/change-password` takes only `newPassword`, requires an active
session, and — this is the part worth flagging — after a successful change
the client must call `useSession().update()` (next-auth v4's session-refresh
hook) so the JWT's `mustChangePassword` claim flips to `false` without
forcing a logout/login round trip. If this call is missed, the user gets
correctly redirected back to the change-password screen forever despite
having changed it — worth testing explicitly in 3.8.

**#3 — No link from User to Learner/Personnel yet.**
Deliberately absent — those models don't exist until Phases 5/6. Adding a
nullable `linkedRecordType`/`linkedRecordId` now would be a guess at a shape
neither model has yet. Phase 5/6 adds the real field once there's something
to link to.

## 7. Out of scope for this contract

Google sign-in for staff (playbook D5 marks it optional; add as a second
next-auth provider later, doesn't change this schema). Rate limiting /
lockout after repeated failed logins (worth doing before real student data
lands — see D1 — but not blocking Phase 3's shape). Audit logging of
permission checks themselves (the audit log's shape is Phase 15 territory;
grade writes get audited starting Phase 11 per `CLAUDE.md` non-negotiable
#6). Anything about Sections/Learners/Teaching load — those are Phases 5-7.
