# IRMMHS School Management System

## What this is

A school management system for Iluminada Roxas-Mendoza Memorial High School
(DepEd School ID 306715), Sulucan, Bocaue, Bulacan. ~500 JHS learners.
Public high school. Built and maintained by one developer; must be
operable by non-technical school staff after handover.

## Non-negotiables

1. DepEd School Forms (SF1, SF2, SF5, SF9, SF10) must be producible and correct.
2. Every academic record is scoped to a School Year. No exceptions.
3. Finalized grades store a snapshot of the grading scheme that produced them.
4. Grading weights, subjects, sections, roles, and terms are DATA, not code.
5. Teachers encode grades on phones, on bad Wi-Fi. Design for that first.
6. Personal data of minors. RA 10173 applies. Audit every write to a grade.

## Stack

- Next.js (App Router) — one app, deployed on Vercel
- Server logic lives in src/server/ (services + repositories). Route handlers
  are thin: parse -> authorize -> call service -> serialize.
- MongoDB Atlas + Mongoose
- Tailwind CSS + shadcn/ui (shadcn not installed yet — lands in Phase 4)
- Auth.js (credentials provider, admin-provisioned accounts) — not installed yet, Phase 3
- Zod at every API boundary — not installed yet, lands with the first real model contract
- TypeScript (D2, confirmed 2026-08-13)
- Vitest — unit tests on pure logic, colocated as `src/**/*.test.ts`
- Playwright (chromium only) — E2E tests in `e2e/`, against Desktop Chrome and
  Mobile Chrome (Pixel 7) device projects. Added ahead of the playbook's
  original Phase 1 scope on 2026-08-13 — see decision log.

## Conventions

- Folder structure:
  ```
  src/
    app/                    Next.js App Router — pages, layouts, route handlers
      api/health/route.ts   example route handler: parse -> call service -> serialize
    server/
      db/                   connect.ts (cached Mongoose connection), schemaOptions.ts
      services/             business logic, one file per domain concept — Phase 2+
      repositories/         data access, one file per Mongoose model — Phase 2+
      lib/                  server-only helpers (apiResponse.ts)
    types/                  shared TS types (domain models, API contracts) — Phase 2+
  e2e/                      Playwright E2E specs (*.spec.ts) — separate from Vitest
  playbook/                 project playbook + design tokens (reference, not code)
  ```
- Naming: kebab-case folders, camelCase filenames (`schoolYear.service.ts`), PascalCase
  for React components. One Mongoose model per file in `server/repositories/`; the
  service file of the same domain name is the only thing allowed to import it.
- Testing split: Vitest unit tests are colocated next to the code they test
  (`src/server/lib/apiResponse.test.ts`). Playwright E2E specs live in the
  top-level `e2e/` folder instead of being colocated — they test the app as a
  whole (real browser, real running server), not one module.
- Every model gets: schoolYearId, createdAt, updatedAt, createdBy, updatedBy
- Soft delete via `archivedAt`, never hard delete academic records
- API responses: { data, error } — never bare arrays (see src/server/lib/apiResponse.ts)

## Design language

Warm neutrals, school-color accent, rounded, generous spacing, humanist sans,
real photography. NOT: purple/magenta gradients, dark-mode default, dense
enterprise grids.

Full token spec lives in `playbook/irmmhs-design-tokens.json` (concept:
"Lampara" / Illumination). **Its palette is marked UNVERIFIED** — built on a
remembered violet+magenta school scheme, not sampled from the real logo.
Do not consume it into tailwind.config until the logo is obtained and the
palette is regenerated from real hex values (see the file's `$meta.swapPoint`).
That work belongs to Phase 4, not before.

## Out of scope for v1

- ALS Senior High (schema must not make it impossible later — see D6)
- SF6, SF7, SF4, SF8 (should-have / nice-to-have forms)
- Parent portal, learning materials, assignments, analytics dashboards, SMS,
  QR/biometric attendance (Phase 16+, nothing here until Stage C ships)
- Dark mode (deferred per design tokens, not an oversight)

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
