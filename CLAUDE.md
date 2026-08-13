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

## Conventions

- Folder structure: [to be filled in once the Next.js scaffold lands — Step 1]
- Naming: [fill in as patterns emerge]
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
