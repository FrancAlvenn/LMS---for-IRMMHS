# School Management Platform

## What this is

A multi-school management platform. First and reference tenant (**"school
zero"**): Iluminada Roxas-Mendoza Memorial High School (DepEd School ID
306715), Sulucan, Bocaue, Bulacan — ~500 JHS learners, public high school,
no IT staff. Built and maintained by one developer; must be operable by
non-technical school staff after handover, and onboardable by a second
school without a rewrite.

**Pivoted from a single-school build to this multi-tenant platform on
2026-08-13** — see the playbook v2 adoption entry in the decision log.
`docs/contracts/phase-2.1-config-foundation.md` and
`docs/contracts/phase-3.1-identity-access.md` document the pre-pivot,
single-tenant shape of `School`/`SchoolYear`/`GradingPeriod` and
`User`/`Role`; both are superseded and kept only as historical record.

### The three reference schools

Test every design choice against all three before hard-coding anything.
Keep this table current — it's more useful day to day than any abstract
genericity principle.

|              | **School A — IRMMHS**           | **School B — private PH K-12**     | **School C — international**         |
| ------------ | ------------------------------- | ---------------------------------- | ------------------------------------ |
| Type         | PH public JHS                   | PH private K-12 with SHS           | Non-PH international                 |
| Levels       | Grades 7–10                     | Kinder–12, SHS strands             | Years 1–13                           |
| Terms        | 4 quarters                      | Quarters (JHS) + semesters (SHS)   | 3 trimesters                         |
| Grading      | DepEd DO 8, transmutation table | DepEd DO 8 + a letter grade column | GPA on a 4.0 scale, no transmutation |
| Learner ID   | LRN (12-digit)                  | LRN + internal student number      | No LRN at all                        |
| Forms        | SF1, SF2, SF5, SF9, SF10        | Same, plus its own report card     | No DepEd forms                       |
| Passing mark | 75                              | 75                                 | 50                                   |

If a design choice breaks School C, it's hard-coded. Fix the seam or log
the limit explicitly in the decision log — never by accident.

## Non-negotiables

1. **Tenancy: every query is tenant-scoped.** A repository method that can
   run without a `tenantId` is a data breach involving minors. No exceptions.
2. DepEd School Forms (SF1, SF2, SF5, SF9, SF10) must be producible and
   correct — but they live in a DepEd compliance pack, not the core.
3. Every academic record is scoped to a School Year. No exceptions.
4. Finalized grades store a snapshot of the grading scheme that produced them.
5. Grading weights, subjects, sections, roles, terms, and theme are DATA,
   not code.
6. Teachers encode grades on phones, on bad Wi-Fi. Design for that first.
7. Personal data of minors, across multiple schools. RA 10173 applies.
   Audit every write to a grade.

## Stack

- Next.js (App Router) — one app, deployed on Vercel
- Server logic lives in src/server/ (services + repositories). Route handlers
  are thin: parse -> resolve tenant -> authorize -> call service -> serialize.
- MongoDB Atlas + Mongoose. Every collection compound-indexed on
  `(tenantId, ...)`; every query goes through a `TenantScopedRepository` base
  class that makes an unscoped query structurally impossible to write
  (v2 Phase 2 — not built yet, see decision log).
- Tailwind CSS + shadcn/ui, bound to CSS variables driven by a per-tenant
  theme (shadcn not installed yet — lands in Phase 5)
- next-auth **v4** (stable — not v5, still beta as of 2026-08-13), Credentials
  provider, JWT sessions, no DB adapter. bcryptjs for password hashing (pure
  JS, no native build step). `User` is platform-level (not tenant-scoped); a
  `Membership` joins user + tenant + role so one person can belong to more
  than one school (v2 Phase 4 — supersedes the single-tenant `User`/`Role`
  shape built in the old Phase 3, see decision log).
- Zod at every API boundary — every route handler parses with a schema from `src/types/`
- TypeScript (D2, confirmed 2026-08-13)
- tsx — runs one-off TS scripts (`scripts/`) with `.env.local` loaded
- Vitest — unit tests on pure logic, colocated as `src/**/*.test.ts`
- Playwright (chromium only) — E2E tests in `e2e/`, against Desktop Chrome and
  Mobile Chrome (Pixel 7) device projects. Added ahead of the playbook's
  original Phase 1 scope on 2026-08-13 — see decision log.

## Conventions

- Folder structure:
  ```
  src/
    app/                    Next.js App Router — pages, layouts, route handlers
      api/                  route handlers: parse -> resolve tenant -> authorize -> call service -> serialize
      api/auth/[...nextauth] next-auth's own catch-all — framework-owned, not handleRoute()
      admin/                admin pages, real auth-gated since Phase 3 (proxy.ts + layout.tsx)
                             — pre-pivot; becomes tenant-scoped (/s/{slug}/admin or equivalent)
                             once v2 Phase 2 (tenancy) and Phase 4 (route protection) land
      login/, change-password/  auth pages, deliberately unstyled until Phase 5
    server/
      db/                   connect.ts (cached Mongoose connection), schemaOptions.ts
      tenancy/              TenantScopedRepository base class, tenant resolution helper
                             (v2 Phase 2 — not built yet, see decision log)
      services/             business logic, one file per domain concept
      repositories/         data access + Mongoose schema, one file per model
      lib/                  server-only helpers (apiResponse, errors, routeHandler,
                             session — requirePermission()/getCurrentUser(), authOptions)
    types/                  shared TS types + Zod schemas (domain models, API contracts)
    hooks/                  client hooks (useSchoolYear, useTenant — the latter from v2 Phase 2)
    proxy.ts                optimistic route protection (Next 16 renamed Middleware -> Proxy)
  e2e/                      Playwright E2E specs (*.spec.ts) — separate from Vitest
  scripts/                  one-off TS scripts (seed.ts), run via `npm run seed` etc.
  docs/contracts/           Habit-3 contract docs — schema/Zod/endpoints, reviewed before code.
                             phase-2.1-config-foundation.md and phase-3.1-identity-access.md
                             predate the v2 platform pivot and are superseded — kept as record.
  packs/                    versioned pack data (grading presets, term structure presets,
                             compliance packs) — v2 Phase 10+, not built yet. Data, never code.
  playbook/                 project playbook + design tokens (reference, not code). Current:
                             School-Management-Platform-Playbook.md (v2) +
                             irmmhs-design-tokens-v2.json. Superseded:
                             IRMMHS-SMS-Project-Playbook.md (v1) + irmmhs-design-tokens.json.
  ```
- Naming: kebab-case folders, camelCase filenames (`schoolYear.service.ts`), PascalCase
  for React components. One Mongoose model per file in `server/repositories/` (schema +
  model + DTO mapper together); the service file of the same domain name is the only
  thing allowed to import it. Repositories return plain DTOs (`src/types/*.ts` shapes,
  dates as ISO strings) via an explicit `toDTO()` mapper — never a raw Mongoose
  document or `.lean()` result.
- Testing split: Vitest unit tests are colocated next to the code they test
  (`src/server/lib/apiResponse.test.ts`, `src/types/schoolYear.test.ts`). Playwright
  E2E specs live in the top-level `e2e/` folder instead — they test the app as a
  whole (real browser, real running server), not one module.
- Route handlers wrap their body in `handleRoute()` (`src/server/lib/routeHandler.ts`):
  connects to the DB, catches `ZodError` -> 400, `HttpError` subclasses
  (`NotFoundError`/`ConflictError`/`InvalidTransitionError`) -> their status, anything
  else -> 500. A service throws `NotFoundError` etc.; it never returns a Response.
- Auth is real as of Phase 3. `requirePermission('resource:action')`
  (`src/server/lib/session.ts`) is what every former `// TODO(Phase 3)` comment
  became — throws `UnauthorizedError`/`ForbiddenError`, `handleRoute()` maps both.
  Permission strings are a hardcoded taxonomy (`src/types/permission.ts`) — code,
  not data; which permissions a `Role` _has_ is data. `proxy.ts` only does
  optimistic redirects (no session / must-change-password); every protected page
  and route also checks for real, server-side (Next's own guidance: Proxy is
  never the only auth check).
- Every SY-scoped model gets: schoolYearId, createdAt, updatedAt, createdBy, updatedBy
  (createdBy/updatedBy nullable until Phase 3 — see above).
- Soft delete via `archivedAt`, never hard delete academic records
- API responses: { data, error } — never bare arrays (see src/types/api.ts,
  src/server/lib/apiResponse.ts)
- State transitions that affect a sibling record (activate a school year, open/lock a
  grading period) are their own POST action route, never a generic PATCH field edit.

## Design language

Warm neutrals, one institutional colour (violet) doing the structural work,
one vibrant accent (magenta/pink) spent only on the "Illumination" signature
treatment. Rounded but never pill-shaped, generous spacing, humanist sans,
real photography. NOT: purple/magenta _gradients_ or glassmorphism, dark-mode
default, dense enterprise grids, a cute rounded edtech typeface.

Full token spec lives in `playbook/irmmhs-design-tokens-v2.json` (concept:
"Lampara" / Illumination; v2 rebuilds the palette around the school's actual
reported violet + vibrant pink scheme, replacing v1's placeholder blue/gold).
**Its palette is still marked UNVERIFIED** — built on a remembered scheme,
not sampled from the real logo. Do not consume it into tailwind.config until
the logo is obtained and the palette is regenerated from real hex values
(see the file's `$meta.swapPoint`). That work belongs to v2 Phase 5
(Theming & design system), not before. Under the platform pivot, this file
also becomes a _schema_ other schools instantiate — IRMMHS's palette is one
theme instance, not the only one (v2 Phase 5, `D9`).

## Out of scope for v1

- A second real school onboarded, and self-serve tenant signup (D8 —
  platform-admin provisioning only; onboarding wizard is v2 Phase 16, "a
  second school is possible" is Stage E, not v1)
- ALS Senior High (schema must not make it impossible later — see D6)
- SF6, SF7, SF4, SF8 (should-have / nice-to-have forms)
- Parent portal, learning materials, assignments, analytics dashboards, SMS,
  QR/biometric attendance (v2 Phase 19+, nothing here until Stage C ships)
- Dark mode (deferred per design tokens, not an oversight)
- Subdomain-based tenant resolution (D5 — path-based `/s/{slug}/…` for v1;
  subdomains need wildcard DNS + per-tenant certs, a real cost not worth
  paying yet)

## Decision log

### 2026-08-13 — Phase 1 kickoff

- **D2 (JS vs TS): TypeScript.** Confirmed by the developer. Types keep
  AI-assisted sessions consistent with decisions made weeks earlier.
- **D3 (backend shape): one Next.js app**, no separate Express server.
  `src/server/services/` + `src/server/repositories/`, route handlers thin.
  Playbook recommendation, adopted as-is.
- **D4 (multi-tenant): single-school, tenant-shaped.** Building for IRMMHS
  only; `schoolId` on root records and school profile in the DB (not env
  vars) once that model exists, so a second school later is a migration,
  not a rewrite.
- **Still open — revisit before it blocks something:**
  - **D1** (real deployment vs. portfolio build) — not yet decided out loud.
    Matters for RA 10173 / NPC-registration scope, backup policy, MOA with
    the school. Should be answered before Phase 5 (learner records) starts
    touching real personal data.
  - **D5** (auth mechanics detail) — Phase 3.
  - **D6** (JHS-only vs ALS-compatible schema shape) — Phase 6/7, when the
    curriculum/enrollment models get designed. Default lean: JHS in v1,
    schema must not hard-enum grade levels 7–10 only.
  - Phase 0 fieldwork (exact DepEd school name string, real SF templates,
    the actual logo, enrollment counts) has not been done yet. Nothing in
    Phase 1 depends on it; it blocks Phase 4 (palette) and any printed form
    work in Phase 13.

### 2026-08-13 — Phase 1 complete

**Built:** the full repo/toolchain skeleton — Next.js 16 (App Router,
TypeScript, Tailwind v4, Turbopack) scaffolded at repo root; `src/server/`
boundary (`db/`, `services/`, `repositories/`, `lib/`) plus `src/types/`;
Prettier + `prettier-plugin-tailwindcss` layered with ESLint via
`eslint-config-prettier`; Husky pre-commit → lint-staged (verified live on
the first commit); `.env.example` committed, `.env.local` git-ignored;
Mongoose connection cache (`src/server/db/connect.ts`), shared schema
options, `{ data, error }` response helper, `GET /api/health`; Vitest +
`vite-tsconfig-paths`, one passing example test.

**Live infrastructure:** MongoDB Atlas M0 cluster `irmmhs-db`, dedicated
app DB user `irmmhs-app` (not the personal Atlas login), Network Access
`0.0.0.0/0` (required for Vercel's non-fixed egress IPs — see playbook
Prompt 1.5). Repo pushed to `origin/main`
(github.com/FrancAlvenn/LMS---for-IRMMHS) and imported into Vercel.
`/api/health` returns `dbConnected: true` **both** locally and at the
deployed Vercel URL — Phase 1's acceptance criteria, met.

**Housekeeping:** the developer handed off real Atlas credentials via two
scratch files (`playbook/creds.md`, `playbook/atlas-credentials.env`) —
both are now git-ignored (`.gitignore` patterns `**/creds.md`,
`**/*credentials*`) and were never staged. Worth deleting or moving those
two files out of the repo folder entirely once you've copied what you
need — being git-ignored keeps them out of version control, but they're
still plaintext on disk.

**Decisions still open, unchanged from kickoff:** D1 (real vs. portfolio),
D5 (auth mechanics), D6 (JHS vs ALS schema shape). Phase 0 fieldwork also
still outstanding.

### 2026-08-13 — Playwright added ahead of schedule

The playbook's Prompt 1.4 explicitly put Playwright/E2E out of scope for
Phase 1 ("keep it minimal... component testing, Playwright, E2E tests" was
deferred). The developer asked for it anyway before starting Phase 2, with
its own dedicated folder — so it's in now rather than later. Deliberate
scope expansion, logged per the playbook's own guardrail on accepted TODOs.

**Built:** `@playwright/test`, chromium browser only (not firefox/webkit —
add them later only if a real cross-browser bug shows up; no upfront cost
for browsers nobody's using yet). `playwright.config.ts` at repo root,
`testDir: './e2e'`, two projects — **Desktop Chrome** (registrar's machine)
and **Mobile Chrome** via the Pixel 7 device profile (the teacher-on-Android
case that matters most once Phase 11 ships). `webServer` auto-starts
`npm run dev` and reuses an already-running one in local dev.
`e2e/smoke.spec.ts` — homepage loads, `GET /api/health` reports
`dbConnected: true` — mirrors the same acceptance check Phase 1 already
verified manually, now automated. `npm run test:e2e` / `test:e2e:ui` /
`test:e2e:report` scripts. `test-results/`, `playwright-report/` git-ignored.
All 4 test runs (2 specs × 2 projects) pass locally.

**Next up:** Phase 2 — Config foundation (`School`, `SchoolYear`,
`GradingPeriod` models, all school-year-scoped). Start with the Phase 2.1
contract prompt per playbook §7 before writing any implementation.

### 2026-08-13 — Next.js agent-rules block moved to AGENTS.md

`next dev` (16.3+) auto-manages a "this is not the Next.js you know" block
pointing agents at the version-matched docs bundled in
`node_modules/next/dist/docs/`, and upserts it into whichever of
`AGENTS.md` / `CLAUDE.md` already hosts it. It landed in this file first
since `AGENTS.md` didn't exist yet — moved it there instead, since this
file is the project constitution, not framework churn. `CLAUDE.md` now
`@`-imports `AGENTS.md` (see bottom of this file) so both load together.
**Do not delete `AGENTS.md` or strip its markers** — `next dev` re-adds
them, and undocumented Next.js 16 API changes are a real risk worth
actually reading up on before writing route handlers (dynamic route
`params` are `Promise`-typed now — see the `RouteContext<'/path/[id]'>`
helper — and there's a new opt-in caching model called Cache Components).

### 2026-08-13 — Phase 2 (Config foundation) complete

Built to the reviewed contract (`docs/contracts/phase-2.1-config-foundation.md`):
`School`, `SchoolYear`, `GradingPeriod` — Mongoose schemas + repositories + services

- all 9 route handlers + Zod validators + unit tests, `getActiveSchoolYear()` +
  `useSchoolYear()` client hook, idempotent seed script (`npm run seed`), and a bare
  `/admin/school-years` page with an activate action (E2E-tested).

**Two Next.js 16 / Mongoose 9 API changes caught by actually reading the bundled
docs / running `tsc`, not assumed from training data:**

- Dynamic route `params` are typed via the new global `RouteContext<'/path/[id]'>`
  helper (generated by `next dev`/`next typegen`), not a hand-written
  `{ params: Promise<{ id: string }> }`.
- Mongoose 9 deprecates `findByIdAndUpdate(..., { new: true })` in favor of
  `{ returnDocument: 'after' }` — caught from a runtime warning during the first
  seed run, fixed across all three repositories.
- Zod v4: `z.string().email()`/`.url()` are deprecated in favor of top-level
  `z.email()`/`z.url()`; `.refine()` takes `{ error }`, not `{ message }`.
- Added `npm run typecheck` (`tsc --noEmit`) specifically because of this class of
  risk — ESLint alone doesn't catch it, and "breaking changes vs. training data" is
  exactly what the Next.js agent-rules block (`AGENTS.md`) warns about.

**Verified against live Atlas, not just typechecked:** seed script run twice
(idempotency confirmed — second run skips everything), every route curled by hand
including a validation-error path (400), a 404, and the grading-period open/lock
state machine's invalid-transition rejections (409). E2E suite green (6/6).

**School year seeded is 2026-2027, not 2025-2026** — the playbook's Phase 2 text
illustrates "SY 2025–2026" as of when it was written, but by this repo's actual
build date SY 2025-2026 has already ended. Seeded data (school profile + dates) is
still the Phase 0 web-sourced hypothesis, unconfirmed — see `scripts/seed.ts` header.

**Next up:** Phase 3 — Identity & access (Auth.js, real `requirePermission()`,
replacing every `// TODO(Phase 3)` left in Phase 2's route handlers).

### 2026-08-13 — Phase 3 (Identity & access) complete

Built to the reviewed contract (`docs/contracts/phase-3.1-identity-access.md`):
`User`, `Role`, the `Permission` taxonomy — repositories/services + 8 route
handlers + Zod validators + unit tests, real next-auth v4 credentials/JWT auth,
`proxy.ts` (optimistic redirects) backed by real server-side checks everywhere
(admin layout, every route via `requirePermission()`), login + forced
change-password pages, and bare `/admin/users` + `/admin/roles` pages.

**Two more version-drift catches, same discipline as Phase 2 — checked the
actual current docs/versions instead of assuming:**

- **next-auth v5 is still beta** even now; `latest` on npm is v4.24.15. Asked
  the developer explicitly rather than assuming v5 — chose v4 (stable) after
  confirming both declare Next 16 peer support. See contract intro.
- **Next 16 renamed Middleware to Proxy** (`proxy.ts`, not `middleware.ts` —
  same mechanism). Would have written the wrong filename from training data;
  caught by reading `node_modules/next/dist/docs/01-app/01-getting-started/
16-proxy.md` before writing it, per the `AGENTS.md` block's whole point.

**Two real security properties, verified by hand against live Atlas (not just
typechecked) — see the contract's staleness trade-off in §4:**

1. **Disabling a user takes effect on their very next request**, no
   re-login required — confirmed live: disabled a signed-in test user,
   their existing session immediately started reporting unauthenticated.
2. **Permission changes on a role are picked up at next login, not
   mid-session** — a deliberate, documented trade-off, not a bug.

Also verified live: wrong-password rejection, the `isSystem` role guard
(stripping `role:write`/`user:write` from Admin correctly 409s), 403 on a
permission a role doesn't have, and the full
create-account-with-temp-password → forced-redirect →
`useSession().update()` → claim-refreshes-without-relogin flow end to end.

**bcryptjs is deliberately CPU-heavy and it showed up in testing, not
production:** parallel Playwright workers all logging into the same dev
server flaked out from bcrypt+dev-compile contention starving the event
loop. Not an app bug (12/12 pass serially, and every flow above was also
verified by hand). Fixed by capping Playwright to `workers: 1` — see
`playwright.config.ts` for the full reasoning and the revisit condition.

**Seed script (`npm run seed`) now also creates:** the `"Admin"` system role
(`isSystem: true`, all permissions, can't be stripped of `role:write`/
`user:write`) and one `admin` user with a **randomly generated password
printed once** — there is no default/predictable admin password anywhere in
this repo. Also creates a fixed-password `e2e-test` fixture user when
`E2E_TEST_PASSWORD` is set (dev/test-only — CI without that var just skips
the specs that need it).

**Known, accepted debris:** the E2E "fresh account" test creates a new
throwaway user every run (no `DELETE /api/users` exists — deliberately out
of scope per the contract, no forcing use case yet). These accumulate in
the dev Atlas DB. Harmless, cleaned up manually this session; revisit if it
becomes annoying rather than pre-building delete support nobody's asked for.

**Decisions still open:** D1 (real vs. portfolio), D6 (JHS vs ALS schema
shape). Phase 0 fieldwork also still outstanding. D5 (auth mechanics) is
now resolved by this phase.

**Next up:** Phase 4 — Design system & app shell (Tailwind theme from the
real palette once Phase 0 delivers the logo, shadcn/ui, the nav shell — the
first phase where these bare admin pages stop looking like a 1998 intranet).

### 2026-08-13 — Adopted the v2 platform pivot (multi-tenant)

The developer brought a new playbook —
`playbook/School-Management-Platform-Playbook.md` ("Version 2.0 —
generalised") — and `irmmhs-design-tokens-v2.json`, replacing the v1
single-school documents. v2 turns this from a system for one school into a
**multi-tenant platform**, IRMMHS as school zero rather than the whole spec.
The v1 files (`playbook/IRMMHS-SMS-Project-Playbook.md`,
`playbook/irmmhs-design-tokens.json`) are superseded and kept only for
history. Cost, from the playbook's own §0: 19 phases instead of 15, roughly
+35–40% build size, and the top failure mode moves from "wrong grade on a
report card" to "wrong grade, **plus** one school seeing another school's
learners" — a reportable RA 10173 breach once real data is involved.

**Explicitly asked the developer whether to eat that cost now rather than
assume it** — confirmed: adopt v2 now, rebuild the tenancy-unsafe parts of
what's already built rather than defer.

**Phase numbers shifted underneath completed work.** v1 Phase 1
(repo/toolchain) ≈ v2 Phase 1, compatible as built except v2 adds a
`src/server/tenancy/` folder from the start (not yet created). v1 Phase 2
(Config: `School`/`SchoolYear`/`GradingPeriod`) and v1 Phase 3 (Identity:
`User`/`Role`) do **not** carry forward as built — both assumed a single
tenant, and v2 inserts a new **Phase 2 — Tenancy foundation** ahead of both,
flagged ⚠️ as the highest-risk phase in the project. Under v2 numbering:

- **v2 Phase 2 (Tenancy foundation) — not started.** `Tenant` model,
  `TenantScopedRepository` base class, tenant resolution middleware,
  isolation test suite, two-tenant seed. Nothing in the live Atlas DB has a
  `tenantId` yet. Blocks Phase 3 and Phase 4 below.
- **v2 Phase 3 (Config: `SchoolYear` + `Term`) — needs a rebuild, not an
  extension.** The old `School`/`SchoolYear`/`GradingPeriod` models have no
  `tenantId`; `School` was a singleton where v2 wants a platform-level
  `Tenant` registry; `GradingPeriod` only expresses quarters where v2
  generalises it into `Term` + `TermStructure` presets (quarters, semesters,
  trimesters, custom).
- **v2 Phase 4 (Identity: `User` + `Membership` + `Role`) — needs a rebuild,
  not an extension.** The old `User` has a direct `roleId` and assumes
  exactly one school; v2 makes `User` platform-level and inserts a
  `Membership` (user × tenant × role) so one person can hold different
  roles at different schools.
- `docs/contracts/phase-2.1-config-foundation.md` and
  `docs/contracts/phase-3.1-identity-access.md` are superseded by this —
  kept as a record of the pre-pivot design, not as current contracts.

**D1–D10 locked this session** (old D1–D6 are retired; v2's table
renumbers and expands them):

- **D1 (real deployment vs. portfolio): real, eventually.** Matches v2's own
  assumption ("everything below assumes real, eventually"). RA 10173, an
  MOA with IRMMHS, and a backup policy are real obligations to meet before
  Phase 18 (Hardening & handover), not optional — and the multi-tenant shape
  raises the stakes further: this project is now a Personal Information
  Controller/Processor for potentially several schools' minors' data at
  once, not just one school's.
- **D2 (TypeScript) and D3 (one Next.js app, `src/server/` boundary) carry
  forward unchanged** — v2's own recommendation matches what was already
  locked in Phase 1. No rework needed on this front.
- **D4 (tenancy model): shared database, shared schema, `tenantId`
  discriminator, enforced by a base repository** — not database-per-tenant.
  Database-per-tenant is safer by construction but multiplies migration and
  backup work by school count, untenable solo. Adopted per playbook
  recommendation, not separately re-litigated.
- **D5 (tenant resolution): path-based `/s/{slug}/…` for v1.** Subdomains
  need wildcard DNS and per-tenant certificates — real cost, no upfront
  payoff with one tenant live. Resolution logic lives in exactly one file so
  subdomains later are a swap, not a refactor.
- **D6 (auth strategy): Credentials via next-auth, with a `Membership` join
  between user and tenant.** Confirms and extends the already-built
  next-auth v4 choice — the addition is `Membership`, not a provider change.
- **D7 (PH-only vs. generic): generic core, pluggable compliance packs.**
  DepEd forms, LRN validation, and LIS export move into a Philippine pack;
  the core only knows about "a report," not SF9.
- **D8 (who creates a school): platform-admin provisioning only, no
  self-serve signup in v1.** A signup flow for a system holding minors'
  records, with no identity verification, is a liability not worth taking
  on day one.
- **D9 (theme storage): data, from Phase 5.** Retrofitting theming after
  screens are hard-coded with literal colour classes is one of the worst
  refactors there is — build every component against CSS variables from the
  first one, per the existing "no literal colour" rule this project already
  intends to follow.
- **D10 (v1 launch scope): IRMMHS, JHS only, DepEd pack, one theme.** ALS,
  SHS, a second school, and self-serve onboarding are all v1.1+. Ship
  something a real school uses this school year before generalising further
  — the playbook's own closing caution, taken at face value.

**Old D5/D6 status:** the pre-pivot D5 (auth mechanics) is subsumed by the
new D6 above. The pre-pivot D6 (JHS-only vs. ALS-compatible schema shape) is
still open, now tracked as v2's own D10 scope note plus the "three reference
schools" generality test — revisit at v2 Phase 8 (Academic structure), same
timing as before.

**Not done in this session:** no code changed. This entry is the pivot
record and the decision lock; the next session starts v2 Phase 2's Habit-3
contract (Tenancy foundation) before touching the database or any existing
model.

**Next up:** v2 Phase 2 — Tenancy foundation. Contract first
(`Tenant` schema + tenancy strategy document, §6.2.1 of the new playbook),
reviewed before any implementation, per Habit 3.

---

@AGENTS.md
