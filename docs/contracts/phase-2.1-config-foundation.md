# Phase 2.1 — Contract: School, SchoolYear, GradingPeriod

**Status:** Draft, awaiting review. No implementation yet (per playbook Habit 3 —
this is Prompt A; Prompt B implements it once approved).

This is the contract for the config foundation: the first phase that touches
the domain, and the one the playbook singles out as deciding whether "new
school year" is ever a one-click operation (§9, checkpoint 1). Get the
School Year scoping wrong here and every later phase inherits the mistake.

---

## 1. School

A tenant/profile record. Modeled as a collection, not a hardcoded singleton
— per playbook D4 ("single-school, tenant-shaped"), so a second school later
is a migration, not a rewrite. In practice exactly one document exists for
v1; `getSchool()` (service helper, Phase 2.2+) fetches it and throws if zero
or more than one exist, as a defensive check rather than a DB constraint.

```ts
interface School {
  id: string;
  depedSchoolId: string; // "306715" — unique, indexed
  name: string; // common/display name used in the UI
  officialName: string | null; // exact string DepEd expects on printed
  // forms — NULL until Phase 0 confirms it
  // (see playbook §0, the Bambang NHS /
  // IRMMHS name ambiguity). Forms cannot
  // render their masthead while this is null.
  address: {
    street?: string;
    barangay: string;
    municipality: string;
    province: string;
    region: string;
  };
  division: string; // DepEd Division, e.g. "Bulacan"
  district?: string;
  principalName: string;
  principalTitle: string; // e.g. "Principal II"
  logoUrl: string | null; // NULL until Phase 0 logo asset exists
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Zod (create/update — same shape, all fields optional on update):**

```ts
const addressSchema = z.object({
  street: z.string().optional(),
  barangay: z.string().min(1),
  municipality: z.string().min(1),
  province: z.string().min(1),
  region: z.string().min(1),
});

const schoolInputSchema = z.object({
  depedSchoolId: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  officialName: z.string().min(1).nullable(),
  address: addressSchema,
  division: z.string().min(1),
  district: z.string().optional(),
  principalName: z.string().min(1),
  principalTitle: z.string().min(1),
  logoUrl: z.string().url().nullable(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});
```

---

## 2. SchoolYear

**The single most important model in this phase.** Everything downstream —
enrollments, sections, grades, attendance — hangs a `schoolYearId` off this.

```ts
interface SchoolYear {
  id: string;
  schoolId: string; // ref School
  label: string; // "2025-2026" — unique per school
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null; // ref User — null until Phase 3
  updatedBy: string | null;
}
```

**Business rule:** exactly one `active` SchoolYear per school at a time.
Enforced twice — belt and suspenders:

1. Service layer: `activateSchoolYear(id)` sets every other SchoolYear for
   that school to `closed`/`upcoming` as appropriate, inside one operation.
2. DB: a partial unique index on `{ schoolId: 1, status: 1 }` filtered to
   `status: 'active'` — MongoDB supports this natively — so a bug in the
   service code can't silently create two active years.

**Zod:**

```ts
const schoolYearInputSchema = z
  .object({
    label: z.string().regex(/^\d{4}-\d{4}$/),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate > v.startDate, { message: 'endDate must be after startDate' });
```

`status` is never in the create/update input — it's only ever changed via
the `activate` action endpoint, never a free-text PATCH field. (Same
reasoning as the playbook calling out "set active school year" as its own
route in Prompt 2.3, not a generic field edit — activating has a side
effect on sibling records, so it deserves its own verb.)

---

## 3. GradingPeriod

```ts
interface GradingPeriod {
  id: string;
  schoolYearId: string; // ref SchoolYear
  sequence: number; // 1, 2, 3, 4… display/sort order
  label: string; // "Quarter 1" — not hardcoded
  // to "Quarter N" so ALS or a
  // future track can use its
  // own period names (D6)
  startDate: Date;
  endDate: Date;
  status: 'notStarted' | 'open' | 'locked';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}
```

**Resolved (see §5 #1):** 3 states, confirmed 2026-08-13. `submitted`/
`approved` from the design tokens' 5-value `gradingPeriodState` move to a
future Phase 11 per-section submission record instead of living here.

**Zod:**

```ts
const gradingPeriodInputSchema = z
  .object({
    sequence: z.number().int().positive(),
    label: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate > v.startDate, { message: 'endDate must be after startDate' });
```

---

## 4. Endpoints

All responses use the existing `{ data, error }` contract
(`src/server/lib/apiResponse.ts`). Role checks are stubbed as
`// TODO(Phase 3): requirePermission(...)` — no enforcement yet, matching
playbook Prompt 2.3. `createdBy`/`updatedBy` are `null` on everything
written before Phase 3 ships auth; nothing should backfill them with fake
user IDs later.

| Method | Path                                    | Purpose                                                                   |
| ------ | --------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/school`                           | Fetch the (one) school profile                                            |
| PATCH  | `/api/school`                           | Update school profile fields                                              |
| GET    | `/api/school-years`                     | List all school years for the school                                      |
| POST   | `/api/school-years`                     | Create a school year (`status` defaults to `upcoming`)                    |
| GET    | `/api/school-years/active`              | Fetch the currently active school year (404-shaped `{data:null}` if none) |
| GET    | `/api/school-years/:id`                 | Fetch one school year                                                     |
| PATCH  | `/api/school-years/:id`                 | Update label/dates (not status)                                           |
| POST   | `/api/school-years/:id/activate`        | Set active; deactivates all siblings                                      |
| GET    | `/api/school-years/:id/grading-periods` | List periods for a school year                                            |
| POST   | `/api/school-years/:id/grading-periods` | Create a period under a school year                                       |
| PATCH  | `/api/grading-periods/:id`              | Update label/dates (not status)                                           |
| POST   | `/api/grading-periods/:id/open`         | Transition `notStarted` → `open`                                          |
| POST   | `/api/grading-periods/:id/lock`         | Transition `open` → `locked`                                              |

**Service/repository split (per `src/server/` boundary in `CLAUDE.md`):**

- `server/repositories/school.repository.ts`, `schoolYear.repository.ts`, `gradingPeriod.repository.ts` — one per model, Mongoose only.
- `server/services/school.service.ts`, `schoolYear.service.ts`, `gradingPeriod.service.ts` — business logic, including `getActiveSchoolYear()` (used internally by every future SY-scoped query, not just the `/active` route).
- `src/types/school.ts`, `schoolYear.ts`, `gradingPeriod.ts` — Zod schemas + inferred types, shared by client and server.

`getActiveSchoolYear()` and a `useSchoolYear()` client hook are Prompt 2.4,
built on top of this contract, not part of this document's endpoint list.

---

## 5. Open questions

**#1 — GradingPeriod status: 3 states or 5? RESOLVED 2026-08-13 → 3 states.**
The design tokens (`irmmhs-design-tokens.json` →
`color.domain.gradingPeriodState`) define `notStarted / open / submitted /
approved / locked` as one enum, captioned "drives the quarter selector and
the teacher's encoding screen."

Recommendation: **keep GradingPeriod itself at 3 states**
(`notStarted / open / locked`) — that's the registrar's action on the
period as a whole. `submitted` and `approved` describe a _teacher's class
record_ for one section within an open period (Phase 11's
submit-for-approval workflow, which doesn't exist yet) — not the period
itself. Two sections in the same open Q2 can be in different submission
states simultaneously, which a period-level 3-value field can't represent
but a 3-state period + a per-submission `submitted`/`approved` state can.
The design tokens' 5-value palette isn't wrong — it's shared across two
different UI contexts (the admin's period-wide view and the teacher's
per-section view), and both contexts still exist, just on different models.

If you'd rather the period itself carry all 5 states (and push the
per-section nuance elsewhere later), say so now — it changes the enum in
the schema above before any code exists, which is exactly what this step
is for.

**#2 — Auto-create quarters with a school year, or always a separate step?**
Recommendation: `schoolYear.service.ts` gets a convenience
`createSchoolYearWithPeriods(input, periods[])` for the common case
(JHS: 4 quarters, generated by the seed script in Prompt 2.5), but
`POST /api/school-years` itself only creates the year — periods are always
added via the grading-periods endpoint. Keeps the two concerns separable
for ALS or any future track with a different periodization, per D6.

**#3 — `officialName`/`logoUrl` nullability.**
Both are modeled nullable because Phase 0 fieldwork (the exact DepEd name
string, the real logo) hasn't happened. Nothing in Phase 2 blocks on this —
but Phase 13 (report generation) can't render a form masthead until
`officialName` is set, and Phase 4 can't consume the real palette until
`logoUrl`'s source image is sampled. Flagging so it isn't forgotten, not
because it needs a decision now.

---

## 6. Out of scope for this contract

Grading scheme / component weights / transmutation table (Phase 9).
Sections, subjects, curriculum (Phase 7). Enrollment (Phase 8). Any role
or permission enforcement (Phase 3). The `useSchoolYear()` client hook and
the admin school-years list page (Prompts 2.4 and 2.6 — separate prompts,
once this contract and its models exist).
