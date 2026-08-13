# Phase 2.1 — Contract: Tenant model & tenancy strategy

**Status:** Approved 2026-08-13, all five open questions resolved (see §4).
Implementation began with Prompt 2.2 the same day.

**v2 platform pivot.** This is the first contract under the multi-tenant
"School Management Platform" playbook (v2), and the playbook calls this
phase — Phase 2, Tenancy foundation — "the most important phase in the
project. Every later phase inherits whatever safety you build here." Get
this wrong and the failure mode is not a UI bug, it's School A seeing
School B's learners: a reportable RA 10173 breach once real data is
involved (D1: real deployment, eventually).

This contract covers the `Tenant` model itself and the tenancy strategy —
how `tenantId` attaches to every other collection, the compound-index
convention, and the query-scoping rule that makes an unscoped query
structurally impossible to write. It does **not** cover the
`TenantScopedRepository` base class's actual code (Prompt 2.2), the tenant
resolution middleware (`/s/{slug}/…`, Prompt 2.4), the client `TenantProvider`
(Prompt 2.5), the isolation test suite (Prompt 2.6), or the two-tenant seed
script (Prompt 2.7) — those are separate implementation prompts that build
_on_ this contract once it's approved.

---

## 1. Tenant

The school as a platform record — not a school's academic data, just its
registration with the platform. One document per onboarded school.

```ts
interface Tenant {
  id: string;
  slug: string; // URL-safe, lowercase, kebab-case. Unique. IMMUTABLE
  // after creation — it appears in every /s/{slug}/… URL a
  // school's staff bookmark, emails, and prints on nothing,
  // but changing it after go-live breaks every saved link.
  displayName: string; // friendly name used throughout the UI — "IRMMHS"
  officialName: string | null; // the exact string this school's printed
  // forms expect in the masthead. NULL until
  // the school confirms it (Phase 0 for IRMMHS
  // — see the Bambang NHS / IRMMHS name
  // ambiguity in the playbook). Forms cannot
  // render a masthead while this is null.
  status: 'onboarding' | 'active' | 'suspended' | 'archived';
  locale: string; // BCP-47, e.g. "en-PH" — drives Filipino-vs-English copy
  // per tenant (playbook §2, Force 3), not a hardcoded string table
  timezone: string; // IANA, e.g. "Asia/Manila" — for date/attendance boundaries
  logoUrl: string | null; // NULL until the school's logo asset exists
  contactEmail: string | null;
  contactPhone: string | null;
  installedPacks: string[]; // pack slugs, e.g. ["ph-deped-jhs"]. Schema
  // placeholder only in this phase — no pack
  // registry exists to validate against until
  // Phase 10/14/16. Defaults to [].
  limits: {
    maxLearners: number | null;
    maxUsers: number | null;
  } | null; // advisory soft caps, unenforced in v1. See open question #4.
  externalIds: Record<string, string>; // arbitrary external-system
  // identifiers, keyed by scheme —
  // e.g. { depedSchoolId: "306715" }.
  // See open question #1: this is how
  // PH/DepEd-specific identity data
  // stays out of the core schema shape.
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy: string | null; // ref User (platform-admin) — null until
  // v2 Phase 4 rebuilds User/Membership
  updatedBy: string | null;
}
```

**Zod:**

```ts
const slugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, numbers, and hyphens only');

const tenantCreateSchema = z.object({
  slug: slugSchema,
  displayName: z.string().min(1),
  officialName: z.string().min(1).nullable().default(null),
  locale: z.string().min(2).default('en-PH'),
  timezone: z.string().min(1).default('Asia/Manila'),
  logoUrl: z.url().nullable().default(null),
  contactEmail: z.email().nullable().default(null),
  contactPhone: z.string().nullable().default(null),
  externalIds: z.record(z.string(), z.string()).default({}),
});

// slug is immutable — deliberately excluded from the update schema, not
// just conventionally avoided. status is also excluded — it only ever
// changes via the action endpoints in §3, same reasoning as SchoolYear's
// activate action in the pre-pivot Phase 2 contract: a status change here
// has a side effect (denying every user of that school access), so it
// deserves its own verb, not a generic PATCH field.
const tenantUpdateSchema = tenantCreateSchema.omit({ slug: true }).partial();
```

`installedPacks` and `limits` are deliberately absent from both schemas —
see open question #4.

---

## 2. The tenancy strategy

### 2.1 — The rule

**Every collection except `Tenant` itself carries a required `tenantId`,
and no repository method may run without one.** `Tenant` is the one
platform-level exception — it's the registry tenants are looked up _from_,
so it cannot also be scoped by the thing it defines.

### 2.2 — Compound index convention

Every tenant-scoped collection's indexes lead with `tenantId`:

- A natural-key uniqueness constraint becomes `{ tenantId: 1, <key>: 1 }`,
  unique — e.g. a future `SchoolYear.label` uniqueness constraint is
  `{ tenantId: 1, label: 1 }`, not `{ label: 1 }`. Two schools can both have
  a "2026-2027."
- The dominant list/sort query becomes `{ tenantId: 1, <sortField>: 1 }`.
- `Tenant` itself gets one index: `{ slug: 1 }`, unique.

### 2.3 — `TenantScopedRepository` (interface contract, not implementation)

Every repository except `tenant.repository.ts` extends this base class.
Implementation is Prompt 2.2; this is its public shape, fixed now so every
later repository is written against the same contract:

```ts
abstract class TenantScopedRepository<TDoc, TDto> {
  constructor(protected readonly model: Model<TDoc>) {}

  abstract toDTO(doc: TDoc): TDto;

  async findById(tenantId: string, id: string): Promise<TDto | null>;
  async find(tenantId: string, filter?: FilterQuery<TDoc>): Promise<TDto[]>;
  async findOne(tenantId: string, filter: FilterQuery<TDoc>): Promise<TDto | null>;
  async create(tenantId: string, input: Partial<TDoc>, actorId: string | null): Promise<TDto>;
  async updateById(
    tenantId: string,
    id: string,
    patch: Partial<TDoc>,
    actorId: string | null,
  ): Promise<TDto | null>;
  async archiveById(tenantId: string, id: string, actorId: string | null): Promise<TDto | null>;
  async count(tenantId: string, filter?: FilterQuery<TDoc>): Promise<number>;
  async aggregate<TResult>(tenantId: string, pipeline: PipelineStage[]): Promise<TResult[]>;

  // Every public method calls this first. Never optional, never skipped.
  protected requireTenantId(tenantId: string): void; // throws TenantRequiredError if falsy
}
```

**Non-negotiable behaviors** (verified by the Prompt 2.6 isolation suite,
not just asserted here):

- `tenantId` is every method's **first** parameter, always. A method that
  could be called without one does not exist on this class.
- A falsy `tenantId` throws `TenantRequiredError` immediately — never falls
  through to an unfiltered query. See open question #2 for its HTTP mapping.
- `findById`/`updateById`/`archiveById` match on `{ _id: id, tenantId }`
  together, not `id` alone then a separate ownership check. Requesting
  tenant B's document by id, authenticated as tenant A, returns `null` —
  indistinguishable from "doesn't exist," never a 403 that confirms the
  record exists elsewhere.
- `aggregate` always prepends `{ $match: { tenantId } }` as the pipeline's
  first stage, before anything the caller supplies — a caller cannot
  construct a pipeline that runs unscoped.
- `create` always injects `tenantId` from the parameter, never from
  `input` — a client-supplied `tenantId` in a request body is ignored, not
  trusted. (Echoes the Phase 4-to-be-rebuilt rule: never trust a
  client-supplied tenant id.)

### 2.4 — `TenantRepository` (not tenant-scoped)

`server/repositories/tenant.repository.ts` is the one repository that does
**not** extend `TenantScopedRepository` — it's the platform-level registry
tenants are resolved from, so scoping it by tenant is incoherent. Plain
Mongoose CRUD, same `toDTO()` mapper convention as every other repository
in this codebase.

### 2.5 — New error type

```ts
export class TenantRequiredError extends HttpError {
  constructor() {
    super(500, 'TENANT_REQUIRED', 'A repository method was called without a tenantId.');
  }
}
```

500, not 400 — this represents a programming error (a route handler that
failed to resolve a tenant before calling a service), not a client mistake.
It should never actually fire once Prompt 2.4's resolution middleware is in
place; it exists so a bug here fails loudly instead of leaking data
silently. `handleRoute()` gets one more `instanceof` branch for it.

---

## 3. Endpoints

**Resolved (see open question #3): deferred to Phase 17.** Platform-level
tenant management (list/create/suspend a school) is Phase 17's actual job —
the playbook puts the platform console eleven phases later on purpose,
since there's no platform-admin identity concept to gate it with yet
(v2 Phase 4 hasn't been rebuilt). Phase 2.2/2.3 build only
`tenant.repository.ts` + `tenant.service.ts` + a seed script — no HTTP
routes yet.

Kept here as the forward-looking contract Phase 17 implements against:

| Method | Path                                 | Purpose                                             |
| ------ | ------------------------------------ | --------------------------------------------------- |
| GET    | `/api/platform/tenants`              | List all tenants                                    |
| POST   | `/api/platform/tenants`              | Create a tenant (`status` defaults to `onboarding`) |
| GET    | `/api/platform/tenants/:id`          | Fetch one tenant                                    |
| PATCH  | `/api/platform/tenants/:id`          | Update fields (not `slug`, not `status`)            |
| POST   | `/api/platform/tenants/:id/activate` | `onboarding`/`suspended` → `active`                 |
| POST   | `/api/platform/tenants/:id/suspend`  | `active` → `suspended`                              |
| POST   | `/api/platform/tenants/:id/archive`  | any non-archived → `archived` (terminal)            |

Permission checks would be stubbed `// TODO(Phase 4): requirePermission('platform:tenant:write')`
or similar, matching the pre-pivot convention for shipping routes ahead of
their auth layer.

**Service/repository split**, consistent with the existing `src/server/`
boundary:

- `server/repositories/tenant.repository.ts` — plain Mongoose CRUD (§2.4).
- `server/services/tenant.service.ts` — `createTenant`, `getTenant`,
  `getTenantBySlug` (the lookup Prompt 2.4's resolution middleware calls),
  `activateTenant`, `suspendTenant`, `archiveTenant`.
- `src/types/tenant.ts` — Zod schemas + inferred types from §1.
- `src/server/tenancy/tenantScopedRepository.ts` — the base class from §2.3.

---

## 4. Open questions

**All five resolved 2026-08-13** — recommendations accepted as written,
except #3 (defer to Phase 17) which was explicitly confirmed rather than
just accepted by default. Kept below for the reasoning; treat as decided.

**#1 — Where do PH/DepEd-specific identity fields live?**
The pre-pivot `School` model (superseded contract,
`phase-2.1-config-foundation.md`) had `depedSchoolId`, `address`,
`division`, `district`, `principalName`, `principalTitle` as first-class
fields. Under D7 (generic core, pluggable compliance packs), the core
`Tenant` shouldn't structurally know about DepEd. **Recommendation:**
`officialName`, `logoUrl`, `contactEmail`/`contactPhone` stay on `Tenant`
(every school type has these). Everything DepEd-specific — `depedSchoolId`,
`division`, `district`, `address`, `principalName`/`principalTitle` — moves
into the generic `externalIds` bag (for pure identifiers like
`depedSchoolId`) or waits for a proper `DeptEdTenantProfile` sub-document
owned by the DepEd pack once Phase 14 exists, rather than living on the
core schema now. This does mean IRMMHS's address/principal/division data,
already gathered, has nowhere first-class to live until the pack exists —
acceptable, since nothing blocks on it before Phase 13/14 (report
rendering). Confirm or push back before this schema ships.

**#2 — Does `TenantRequiredError` really warrant 500?**
Argued for above as a programming-error signal, not a validation error. The
alternative is 400 (client's fault for hitting an unresolved-tenant route).
Recommendation stands at 500 unless you disagree — it should never be
user-triggerable once Prompt 2.4 ships, so its HTTP code mostly matters for
how it shows up in logs/monitoring, not for any user-facing behavior.

**#3 — Build `/api/platform/tenants*` routes now, or defer to Phase 17?**
Prompt 2.3's own acceptance criterion is "I can create two tenants **from a
script**" — no HTTP endpoints required. Building the routes now means
stubbing a permission check that gets re-stubbed again once Phase 4
rebuilds identity with `Membership`, and building UI-less routes nobody
calls until Phase 17. **Recommendation: build `tenant.repository.ts` +
`tenant.service.ts` + a seed script now (Prompts 2.2–2.3, 2.7); defer the
`/api/platform/tenants*` route handlers themselves to Phase 17**, where
they get built alongside the platform console UI that actually calls them.
The endpoint table in §3 stays as the forward-looking contract either way.
This is a deliberate deviation from the pre-pivot Phase 2's pattern (which
did build routes immediately) — flagging it explicitly since it changes
what "done" means for this phase's implementation prompts.

**#4 — `installedPacks` / `limits`: real now, or schema placeholders?**
Recommendation: placeholders only. `installedPacks` defaults to `[]` with
no validation against a pack registry (none exists before Phase 10/14/16).
`limits` is typed but unused — no enforcement logic anywhere in Phase 2.
Both are on the schema now specifically so later phases don't need a
migration to add them.

**#5 — What is tenant B, for the Prompt 2.7 two-tenant seed?**
Playbook Habit 4 requires developing against two tenants from Phase 2
onward, and Prompt 2.7 says to use "School B or C from the reference set."
**Recommendation: School C — a fictional "Meridian International School"**
(trimesters, 4.0 GPA, no LRN, no DepEd forms, pass mark 50) — not School B.
Per the playbook's own generality test, "if a design choice breaks School
C, it's hard-coded," and School C is the reference school every later
phase (grading schemes, term structures, learner identifiers) is most
likely to accidentally assume away. Seeding the _hardest_ second tenant now
surfaces those assumptions starting in Phase 3, not later. This doesn't
block Phase 2's implementation, but it does shape what Phase 3's `Term`
model needs to express, so flagging it here rather than silently deciding
it in Prompt 2.7.

---

## 5. Out of scope for this contract

The `TenantScopedRepository` class's actual code (Prompt 2.2). The tenant
resolution middleware and `/s/{slug}/…` routing (Prompt 2.4). The client
`TenantProvider`/`useTenant()` (Prompt 2.5). The isolation test suite
(Prompt 2.6). The two-tenant seed script itself (Prompt 2.7, though open
question #5 pre-answers what it should seed). Any rework of `School`/
`SchoolYear`/`GradingPeriod` into tenant-scoped `Term`s (v2 Phase 3 — its
own contract). Any rework of `User`/`Role` into `User`/`Membership`/`Role`
(v2 Phase 4 — its own contract). Platform-admin identity and the
`/api/platform/tenants*` route handlers themselves (Phase 17, per open
question #3).
