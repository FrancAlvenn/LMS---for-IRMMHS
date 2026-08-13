# School Management Platform — Project Playbook

**Version 2.0 — generalised.** A working plan for building a configurable school management system in small, promptable steps, with Iluminada Roxas-Mendoza Memorial High School as the first school on it.

This document is the thing you keep open. It is not the system spec — it is the *method* for producing the system spec, phase by phase, prompt by prompt.

---

## 0. What changed in v2, and what it costs you

v1 planned a system for one school. You now want one that any school can be onboarded onto. That is a different product, and it is worth being clear-eyed about the price before committing:

| | v1 (single school) | v2 (multi-school platform) |
|---|---|---|
| Phases | 15 | 19 |
| Rough build size | baseline | **+35–40%** |
| Hardest new risk | getting DepEd rules right | **cross-tenant data leakage** |
| Ways to fail catastrophically | wrong grade on a report card | wrong grade, **plus one school seeing another school's learners** |
| Who you answer to | one principal | every school on the platform |

The second row of that table is the real one. A tenancy bug that shows School A's learner records to School B is a reportable data breach involving minors under RA 10173. That risk did not exist in v1. Phase 2 exists entirely to make it structurally difficult, and it is not optional.

**The counterweight:** almost everything you already wanted was configurability — grading weights as data, subjects as data, terms as data. That work is roughly 80% of what "onboardable by any school" requires. You are not starting over. You are adding a tenancy layer underneath, an onboarding layer on top, and three new abstractions in the middle.

### The strategy: IRMMHS is school zero, not the spec

Do not build a generic platform in the abstract and hope a school fits it. Build for IRMMHS specifically, but put a seam wherever something is IRMMHS-specific rather than universal. Ship to IRMMHS. Onboard the second school only once the first is genuinely in use.

Generic-from-day-one produces a system that serves nobody in particular and never ships. Specific-with-seams produces a system that works for one school in six months and for the next one in a week.

### The generality test

Every time you are about to hard-code something, check it against three concrete reference schools. Keep these named in `PROJECT.md` — they are more useful than any abstract principle:

| | **School A — IRMMHS** | **School B — St. Something Academy** | **School C — Meridian International** |
|---|---|---|---|
| Type | PH public junior high | PH private K-12 with SHS | Non-PH international school |
| Levels | Grades 7–10 | Kinder–Grade 12, SHS strands | Years 1–13 |
| Terms | 4 quarters | Quarters for JHS, **semesters for SHS** | **3 trimesters** |
| Grading | DepEd DO 8, transmutation table | DepEd DO 8 **plus** a letter grade column | **GPA on a 4.0 scale**, no transmutation |
| Learner ID | LRN (12-digit) | LRN **plus** an internal student number | **No LRN at all** |
| Required forms | SF1, SF2, SF5, SF9, SF10 | Same, plus its own report card design | **No DepEd forms whatsoever** |
| Passing mark | 75 | 75 | 50 |

If a design choice breaks School C, it is hard-coded. Fix the seam or accept the limit explicitly in the decision log — but never by accident.

### The three abstractions that carry the generality

Almost all of the "works for any school" requirement resolves into three pluggable things. Get these right and the rest follows.

**1. Compliance Packs.** DepEd School Forms are Philippine-specific. They are not the core product — they are a pack a Philippine school installs. The core system knows about *reports*; the DepEd Pack knows about SF9. School C installs no pack and loses nothing.

**2. Grading Presets.** The DO 8 s. 2015 scheme — three weighted components, a transmutation table, five descriptor bands — is one preset among several. Generalise the transmutation table into a **scale transform** (table-based, formula-based, or identity) and the same engine computes a Philippine transmuted grade, a 4.0 GPA, and a raw percentage.

**3. Theme Packs.** The design token file becomes a *schema* with per-school values, not a constant. IRMMHS's violet-and-pink is `themes/irmmhs.json`. A new school picks a preset theme or sets their own colours in a form.

Add a fourth, smaller one: **Term Structure Presets** (quarters / semesters / trimesters / custom).

---

## 1. What I found about IRMMHS

Still relevant — it is school zero, and the concrete details are what stop this becoming vapour.

| | |
|---|---|
| **Full name** | Iluminada Roxas-Mendoza Memorial High School |
| **DepEd School ID** | 306715 |
| **Location** | Sulucan, Bocaue, Bulacan — Region III (Central Luzon) |
| **Founded** | 2008, as an annex of Taal High School in borrowed classrooms at Biñang Elementary School; moved to its own site that October with 142 freshmen |
| **Named for** | Iluminada R. Mendoza, a teacher at Lolomboy Elementary School; land donated by the Roxas-Mendoza family |
| **Catchment** | Bambang, Sulucan, Biñang, Bunlo, Antipona and nearby barangays of Bocaue |
| **Current principal** | Romhel C. Odtohan, Principal II (as of Aug 2025) |
| **Offerings** | Junior High School, plus an ALS Senior High School programme |
| **Scale** | ~500 learners per school year |
| **Online presence** | Two Facebook pages. No website. |

**Three findings that still shape the build:**

1. **A name ambiguity to resolve.** DepEd's register lists ID 306715 as *"Bambang National High School (Iluminada Mendoza-Roxas Memorial High School)"*, and a 2009 Senate act established a national high school in Barangay Bambang, Bocaue under the former name. Every printed form carries a school name in its header. Get the exact string from the principal.
2. **It runs ALS Senior High alongside regular JHS.** Different learner profile, different cadence. This is an early argument for the "programme" abstraction in Phase 8 rather than a fixed grade-level enum.
3. **No IT department.** Whatever you build, someone else maintains it, on a shared computer, over school Wi-Fi. That constraint wins arguments against clever architecture every time.

> Sourced from public web pages of mixed reliability. Treat it as a hypothesis. Phase 0 replaces it with what the school actually tells you.

---

## 2. The forces this system has to serve

### Force 1 — Compliance is the product, but it is a pack

An LMS that cannot print a valid SF9 is a toy in the Philippines. But SF9 belongs in a pack, not in the core.

**Core knows about:** learners, enrolments, terms, subjects, assessments, grades, attendance, and a *report* as a template plus a data resolver plus a renderer.

**The DepEd Pack knows about:** SF1 School Register, SF2 Daily Attendance, SF5 Report on Promotion, SF6 Summarised Promotion, SF9 Progress Report Card (old Form 138), SF10 Permanent Record (old Form 137), plus LRN validation and LIS-compatible export.

**DepEd Order No. 8, s. 2015** ships as the default Philippine grading preset — three components with subject-dependent weights:

| Subject group | Written Work | Performance Task | Quarterly Assessment |
|---|---|---|---|
| Languages, AP, EsP (JHS) | 30% | 50% | 20% |
| Science, Math (JHS) | 40% | 40% | 20% |
| MAPEH, EPP/TLE (JHS) | 20% | 60% | 20% |
| SHS Core | 25% | 50% | 25% |
| SHS Academic track | 25% | 45% | 30% |
| SHS TVL / Sports / Arts | 20% | 60% | 20% |

Then a transmutation table maps the initial grade onto a 60–100 scale, with descriptors: 90–100 Outstanding, 85–89 Very Satisfactory, 80–84 Satisfactory, 75–79 Fairly Satisfactory, below 75 Did Not Meet Expectations. Passing is 75.

⚠️ **Verify against the current DepEd order before coding.** The MATATAG rollout has been changing assessment policy on a rolling basis. Treat the numbers above as the DO 8 s. 2015 baseline that ships *as an editable preset*, not as truth burned into the engine. That is precisely why it is a preset.

### Force 2 — Configure what changes, hard-code what does not

Full configurability everywhere produces a system nobody can reason about. Draw the line explicitly.

**Configure (data, editable in the UI):** school profile and branding · school years and term structures · grading schemes, weights, scale transforms, descriptor bands, passing marks · grade levels and programmes · subjects and subject groups · curriculum per level · sections and advisers · roles and permissions · learner identifier format and custom fields · announcement categories · installed packs and feature toggles · theme tokens.

**Hard-code (a deploy is fine):** tenancy and isolation mechanics · authentication · audit log shape · the layout of a specific DepEd form inside its pack · the computation engine's structure (its *inputs* are configured, its arithmetic is not).

**The two schema decisions that matter most:**

**Everything is scoped to a tenant.** Not by convention — structurally. A repository method that can be called without a tenant id is a latent breach. Phase 2 builds the base class that makes it impossible.

**Everything academic is scoped to a school year.** A learner is not "in Grade 9"; a learner **was in Grade 9 during SY 2025–2026**. Get this wrong and year two forces a rewrite. Get it right and year two is a button called "Roll over school year."

And one rule that saves you later: **when a grade is finalised, store a snapshot of the scheme that produced it on the grade record.** If a school changes its weights in 2027, the 2026 report cards must not silently change. Configuration is never retroactive.

### Force 3 — The realities of a low-resource public school

These are requirements, not garnish. They come from IRMMHS but they hold for most schools that would ever adopt this.

- **Mobile-first.** Teachers encode grades on a phone. Design the grade-entry screen for 360px first.
- **Bad connections.** Grade entry must survive a dropped connection mid-encoding. Local draft state, explicit save, visible sync status. Losing a quarter of encoded grades to a Wi-Fi hiccup kills adoption permanently.
- **Excel is the incumbent.** Teachers keep class records in Excel and DepEd forms *are* Excel templates. Import and export are the migration path and the trust-builder.
- **Language.** English base, Filipino where it is genuinely how staff speak. Make it a per-tenant locale setting, not a hard-coded string table.
- **RA 10173 (Data Privacy Act).** Personal data of minors, at scale, across multiple schools. Parental consent, privacy notice, role-scoped access, audit trail, retention policy, and a documented breach procedure are legal obligations. Multi-tenancy raises the stakes: you are now a Personal Information Controller or Processor for several schools at once. Get this into the decision log in Phase 0 and revisit it in Phase 18.
- **Cheap to run.** Vercel plus MongoDB Atlas plus a free-tier object store carries several 500-learner schools comfortably. Budget for each school being able to pay very little, forever.

### The look and feel

The full design system is in `irmmhs-design-tokens.json` — treat that file as the **schema** and IRMMHS's violet-and-pink as **one theme instance**. Principles that hold across every theme:

- Warm neutral base, one institutional colour doing the structural work, one vibrant accent spent only on the signature treatment.
- Generous spacing, rounded but never pill-shaped, soft shadows in the neutral's hue rather than black.
- Disciplined typography — a sturdy display face used with restraint, a warm humanist sans for everything, mono for identifiers, and metric-safe system fonts for printed forms.
- Real photography. No stock illustration.
- **Not:** gradient meshes, glassmorphism, dark mode by default, dense enterprise grids, cute edtech typefaces.
- **Saturation discipline:** full brand vibrancy on identity surfaces; near-white restraint on any screen holding more than twenty rows of data.

---

## 3. Decisions to lock before you write code

Ten decisions. Every downstream prompt depends on them.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| **D1** | Real deployment with real learner data, or portfolio build? | **Decide now, out loud.** | Real ⇒ RA 10173, a MOA with each school, backups, handover. Portfolio ⇒ synthetic data, ship faster, no legal surface. Everything below assumes *real, eventually*. |
| **D2** | JavaScript or TypeScript? | **TypeScript.** | You asked for JS and I would push back on exactly this one. Across a hundred-plus AI-assisted prompts, types are how the model stays consistent with decisions made weeks ago — a machine-checkable contract a prompt cannot quietly violate. Multi-tenancy makes it stronger still: a `TenantScoped<T>` type catches at compile time what would otherwise be a runtime data breach. **If you stay on JS:** Zod at every boundary and JSDoc typedefs on every model, non-negotiable. |
| **D3** | Separate Node backend or Next.js Route Handlers? | **One Next.js app with a hard-boundaried `src/server/` layer.** | Route Handlers *are* Node. One deploy, one repo, one session, same API surface. All logic in `src/server/services/` and `src/server/repositories/`; handlers stay thin — parse, authorise, call service, serialise. Extractable to Express later if it ever earns it. |
| **D4** | Tenancy model? | **Shared database, shared schema, `tenantId` discriminator on every collection, enforced by a base repository.** | Database-per-tenant is safer by construction but multiplies migration and backup work by the number of schools — untenable solo. Shared schema plus a repository layer that *cannot* build an unscoped query gets most of the safety at a fraction of the ops cost. Compound-index every collection on `(tenantId, …)`. |
| **D5** | Tenant resolution? | **Path-based `/s/{school-slug}/…` in v1.** | Subdomains need wildcard DNS and per-tenant certificates — real cost and complexity. Paths work on a free Vercel deploy today. Keep resolution in one middleware so subdomains become a swap later, not a refactor. |
| **D6** | Auth strategy? | **Credentials via Auth.js, with a `Membership` join between user and tenant.** | Learners may not have email. Admin-provisions accounts, identifier-based usernames, forced first-login password change. A user can belong to more than one school — model that from the start rather than retrofitting it. |
| **D7** | Philippines-only or genuinely generic? | **Generic core, pluggable compliance packs.** | The academic model (terms, schemes, components, transforms) is universal. DepEd forms, LRN validation, and LIS export live in a Philippine pack. School C installs nothing and works. |
| **D8** | Who creates a new school? | **Platform-admin provisioning in v1. No self-serve signup.** | Self-serve signup for a system holding minors' records, with no identity verification, is a liability you do not want on day one. Provision manually, verify the school is real, then hand over the onboarding wizard. |
| **D9** | Theme: hard-coded or data? | **Data, from Phase 5.** | Retrofitting theming after fifty screens are built with literal colour classes is one of the most miserable refactors there is. Build every component against CSS variables from the first component. |
| **D10** | Scope for v1 launch? | **IRMMHS, JHS only, DepEd pack, one theme.** | ALS, SHS, second school, and self-serve onboarding are all v1.1. Ship something a real school uses this school year. |

---

## 4. The prompting method

The failure mode you are avoiding — "make me a school management system" returning four thousand lines of plausible garbage — is avoided by four habits.

### Habit 1 — The Project Constitution

Create `PROJECT.md` at the repo root. Keep it under 250 lines. It is loaded at the start of every session and it is the answer to "why did you do it that way?"

Using Claude Code, name it `CLAUDE.md` and it is picked up automatically. Using claude.ai, make it a **Project** and put this in the Project Knowledge so every chat starts with it loaded.

```markdown
# School Management Platform

## What this is
A multi-school management system. First and reference tenant: Iluminada
Roxas-Mendoza Memorial High School (DepEd ID 306715), Bocaue, Bulacan —
~500 junior high learners, no IT staff. Built by one developer. Must be
operable by non-technical school staff and onboardable by other schools.

## Non-negotiables
1. TENANCY: every query is tenant-scoped. A repository method that can run
   without a tenantId is a data breach involving minors. No exceptions.
2. Every academic record is scoped to a school year. No exceptions.
3. Finalised grades store a snapshot of the scheme that produced them.
4. Grading, subjects, grade levels, terms, roles, theme = DATA, not code.
5. Compliance forms live in packs. The core knows about reports, not SF9.
6. Teachers encode grades on phones, on bad Wi-Fi. Design for that first.
7. RA 10173 applies. Audit every write to a grade.

## The three reference schools
Test every design choice against all three before hard-coding anything.
- School A — IRMMHS: PH public JHS, G7-10, quarters, DepEd DO8, LRN, SF forms
- School B — private PH K-12: SHS strands, semesters for SHS, extra letter column
- School C — international: trimesters, 4.0 GPA, no LRN, no DepEd forms, pass=50
If a choice breaks School C, it is hard-coded. Fix the seam or log the limit.

## Stack
- Next.js App Router, one app, Vercel
- Server logic in src/server/ (services + repositories). Route handlers are
  thin: parse -> resolve tenant -> authorize -> call service -> serialize.
- MongoDB Atlas + Mongoose. Compound index (tenantId, ...) on every collection.
- Tailwind bound to CSS variables + shadcn/ui. No literal hex in components.
- Auth.js credentials provider, Membership joins user to tenant
- Zod at every API boundary
- [TypeScript | JavaScript + JSDoc]  <- your D2 answer

## Conventions
- Folder structure: [paste the tree once Phase 1 establishes it]
- Every model: tenantId, createdAt, updatedAt, createdBy, updatedBy
- Academic models additionally: schoolYearId
- Soft delete via archivedAt. Never hard-delete an academic record.
- API responses: { data, error } — never a bare array
- Colours come from CSS variables only. A literal hex in a component is a bug.

## Out of scope for v1
[Keep this list ruthlessly current. It is the main defence against creep.]

## Decision log
[Append every architectural decision: date, decision, why, alternatives rejected]
```

### Habit 2 — One vertical slice per prompt

A prompt produces **one thing that works end to end**, not one layer across many things.

- ❌ "Build all the Mongoose models"
- ✅ "Build the Section model, its repository, create/list services, the route handlers, and a minimal admin page. Seed three sections."

You can *see* a vertical slice working. You cannot see whether twelve models are right until three weeks later.

**Rules of thumb:** a prompt touches ≤5 files · it is done when you can click something and observe a result · if you cannot state the acceptance in one sentence, the prompt is not ready.

### Habit 3 — Contracts before implementation

For anything non-trivial, spend one prompt on the *contract* and a separate one on the *code*.

1. **Contract prompt:** "Design the schema and API contract for X. Output the Mongoose schema, Zod validators, the endpoint list with request and response shapes, index definitions, and open questions. Do not write route handlers or UI."
2. **You review it.** This is where mistakes are actually caught. Reviewing a forty-line contract is tractable; reviewing four hundred lines of implementation is not.
3. **Implementation prompt:** "Implement the contract from [paste]. Do not deviate. If something does not work, stop and tell me rather than improvising."

Every phase below marks its contract prompts. Do not skip them — they are the cheapest place to be wrong.

### Habit 4 — Always develop against two tenants

From Phase 2 onward, your seed data contains **two schools**, and you keep both open in two browser profiles. Cross-tenant leaks are invisible with one tenant and obvious with two. This single habit catches more isolation bugs than any amount of code review.

### The standing prompt preamble

Rather than repeating context in all 130 prompts below, establish these once as standing rules in `PROJECT.md`, and prefix any session with:

```
Follow PROJECT.md exactly. For this task:
- Stay within the stated scope. Do not build adjacent features.
- Every query must be tenant-scoped via the base repository.
- No literal colour values — CSS variables only.
- If the task requires a decision I have not made, stop and ask.
- Touch no more than five files. If it needs more, tell me how to split it.
```

Then paste the individual prompt. The prompts below assume this preamble is in force.

### Full prompt template

For anything complex, expand to the five-block form:

```
CONTEXT   [What exists already. Reference PROJECT.md.]
TASK      [One vertical slice. Concrete. Bounded.]
CONSTRAINTS [Reuse X, don't create a parallel Y. Things it'll get wrong otherwise.]
ACCEPTANCE  [How I'll know it worked. One or two checkable statements.]
OUT OF SCOPE [The adjacent things it will be tempted to also build. Name them.]
```

The `OUT OF SCOPE` block is the one people skip and the one that does the most work.

### Guardrails — never let a prompt do these

- Invent DepEd rules. Without the real transmutation table or the real SF9 layout it will produce something plausible and wrong. Feed it the real artefact or tell it to stop.
- Hard-code a grading weight, subject list, grade level, term count, passing mark, school year, or colour.
- Write a query that does not go through the tenant-scoped repository.
- Silently refactor files outside the stated scope.
- Add things you did not ask for. "I've also added…" is how you get four competing date utilities.
- Let a grade write bypass the audit log.
- Ship a "simplified version for now." That TODO is yours forever — either accept it into the decision log explicitly or reject it.

### Session hygiene

- Roughly one phase per session. When the model starts contradicting earlier decisions, that is the signal to start fresh — re-paste `PROJECT.md` and a short "here is where we are."
- End every session with: *"Summarise what we built, the decisions we made, and what is still open. Format it as an append to my decision log."* Paste the result into `PROJECT.md`. This is the handoff between your sessions.
- Commit after every prompt that works. Small commits are your undo button.

---

## 5. The roadmap

Nineteen phases in five stages, ~130 prompts. Do them in order — the dependency chain is real.

| Stage | Phases | Outcome |
|---|---|---|
| **A — Foundation** | 0–5 | Tenancy, config, auth, and theming exist. Nothing school-specific is hard-coded. |
| **B — Core records** | 6–9 | Learners, staff, academic structure, and enrolment. SF1 becomes possible. |
| **C — Academic engine** | 10–13 | Grading configuration, the computation engine, grade entry, attendance. The actual value. |
| **D — Output** | 14–15 | Reports, compliance packs, announcements. The school can stop using Excel. |
| **E — Platform** | 16–19 | Onboarding wizard, platform console, hardening, handover. A second school is possible. |

| Phase | Name | Prompts |
|---|---|---|
| 0 | Discovery & decisions | fieldwork |
| 1 | Repo & toolchain | 5 |
| 2 | **Tenancy foundation** | 7 |
| 3 | Config foundation | 6 |
| 4 | Identity & access | 8 |
| 5 | **Theming & design system** | 8 |
| 6 | Learner records | 8 |
| 7 | Personnel records | 5 |
| 8 | Academic structure | 8 |
| 9 | Enrolment & sectioning | 7 |
| 10 | Grading configuration | 7 |
| 11 | **Grade computation engine** | 7 |
| 12 | Grade entry UX | 9 |
| 13 | Attendance | 6 |
| 14 | **Reporting & compliance packs** | 9 |
| 15 | Announcements & comms | 6 |
| 16 | **Onboarding wizard & presets** | 8 |
| 17 | Platform console | 6 |
| 18 | Hardening & handover | 10 |
| 19+ | Growth features | list only |

Bolded phases are the ones that carry disproportionate risk or disproportionate value. Slow down in those.

---

## Stage A — Foundation

### Phase 0 — Discovery & decisions

No prompts. This is fieldwork, and skipping it means building on my guesses instead of the school's facts.

**From the principal / head teacher:**
1. The *exact* official school name DepEd expects on printed forms. Resolve the Bambang NHS / IRMMHS ambiguity.
2. Exact School ID, Division, Region, District, and complete address as they appear on official forms.
3. Current enrolment by grade level, sections per grade level, number of teaching personnel.
4. Is the school under MATATAG for any grade levels? Which?
5. Is there real appetite to adopt this, and who would own it? **If nobody, build it as a portfolio piece and stop optimising for handover.**
6. How does the ALS Senior High programme relate administratively to the main school?

**From the registrar:**
7. **Blank copies of every School Form they currently use** — the actual Excel files. The highest-value artefact you can obtain.
8. How do they produce SF9 and SF10 today? Excel? By hand?
9. What is the LIS upload workflow, and when in the year does it happen?
10. Where does learner data live now, and can you get an export?
11. What paper size do their forms print on — long bond, A4, or letter?

**From two or three teachers:**
12. Show me how you keep your class record right now. *Watch them do it. Do not ask them to describe it.*
13. What takes longest at the end of a quarter?
14. Phone or computer for encoding? Whose computer?
15. What would make you stop using a new system after one week?

**For generality — talk to one other school:**
16. Find any second school, of a different type, and ask questions 1–3 and 7. One conversation with a private school or an elementary school will surface half your hard-coded assumptions before you write them.

**Assets:** the school logo at the highest resolution available, sampled hex values for the violet and pink, and the school motto if there is one worth putting on a login page.

**Deliverable:** a filled-in `PROJECT.md`, D1–D10 answered, a folder of real DepEd form templates, and confirmed brand colours.

---

### Phase 1 — Repo & toolchain

**1.1 — Scaffold.** *Task:* Give me the exact commands to scaffold a Next.js App Router project named `sms-platform` with Tailwind, ESLint and `src/`, then the folder structure to create inside `src/` with one line explaining each folder. *Constraints:* single Next.js app, no separate Express; server logic under `src/server/` split into `services/` and `repositories/`; leave holes for Mongoose, Auth.js, Zod, shadcn; multi-tenant from the start so include a `src/server/tenancy/` folder. *Done when:* `npm run dev` serves a page and I have a tree to commit. *Out of scope:* installing anything beyond the scaffold; no models, routes or components.

**1.2 — Conventions & tooling.** *Task:* Prettier with the Tailwind class-sorting plugin, ESLint rules, absolute imports via `@/`, Husky + lint-staged, and a commented `.env.example` listing every variable this project will eventually need. *Constraints:* strict enough to catch real mistakes, not so strict it fights me on every save; `.env.example` anticipates Mongo, Auth.js secret and URL, file storage, and a platform-admin bootstrap credential. *Done when:* `npm run lint` and `npm run format` work and a badly formatted file is fixed on commit.

**1.3 — Database connection.** *Task:* A connection helper at `src/server/db/connect` that caches across hot reloads; a base schema options object every model spreads in (timestamps, and a `toJSON` transform renaming `_id` to `id` and stripping `__v`); a `/api/health` route returning `{ data: { status, dbConnected } }`. *Constraints:* Mongoose, URI from env; establish the `{ data, error }` response shape here with a small helper; explain the hot-reload caching pattern in a comment — I want to understand it, not just have it. *Done when:* `/api/health` returns `dbConnected: true` and repeated dev saves do not spawn new connections.

**1.4 — Testing setup.** *Task:* Vitest configured for this project, npm scripts for `test`, `test:watch`, `test:coverage`, and one trivial passing test. *Constraints:* Vitest not Jest — better ESM and Next compatibility. Unit tests on pure logic only; no component or E2E testing. *Done when:* `npm test` passes. *Note:* the grade engine and the tenancy isolation tests are why this exists. Both are coming.

**1.5 — Deploy the skeleton.** *Task:* Walk me through deploying to Vercel and connecting MongoDB Atlas — cluster creation, database user, network access for Vercel, environment variables, and how to verify the deployment actually reaches the database. *Constraints:* free tiers throughout; call out the Atlas network-access setting that catches everyone; tell me at what scale the free tier becomes a problem given several schools of ~500 learners with multiple years of history. *Done when:* the deployed `/api/health` returns `dbConnected: true`.

---

### Phase 2 — Tenancy foundation ⚠️

The most important phase in the project. Every later phase inherits whatever safety you build here.

**2.1 — 📐 Contract: tenancy model.** *Task:* Design the `Tenant` schema (the school as a platform record: name, slug, official name for forms, status, locale, timezone, installed packs, limits) and the tenancy strategy document — how `tenantId` attaches to every other collection, the compound index convention, and the query-scoping rule. Output schema, Zod validators, endpoint list, index definitions, and open questions. *Constraints:* no implementation; slug must be URL-safe and immutable after creation; distinguish `displayName` from `officialName` — the second is what prints on forms. *Done when:* I have a document I can review in five minutes and disagree with.

**2.2 — Base repository.** *Task:* Implement a `TenantScopedRepository` base class that every academic repository extends. Its constructor takes a model; every query method takes a `tenantId` as its first argument and injects it into the filter. Make it structurally impossible to build an unscoped query — no method exists that omits the tenant. Include `findById` (which must also verify tenant ownership), `find`, `findOne`, `create`, `updateById`, `archiveById`, `count`, and `aggregate` (with a mandatory tenant `$match` prepended). *Constraints:* if a caller passes a falsy tenantId, throw immediately — never fall through to an unfiltered query; `updateById` and `archiveById` must match on tenant, not just id. *Done when:* I can read the class and see that there is no code path producing an unscoped query.

**2.3 — Tenant model & repository.** *Task:* Implement the `Tenant` model from the 2.1 contract, plus a `TenantRepository` — note this one is *not* tenant-scoped, it is the platform-level registry. *Constraints:* unique index on slug; status enum of `active`, `suspended`, `onboarding`, `archived`. *Done when:* I can create two tenants from a script.

**2.4 — Tenant resolution.** *Task:* Middleware that resolves the tenant from a `/s/{slug}/…` path segment, rejects unknown or suspended tenants with a proper error page, and attaches the resolved tenant to the request. Plus a `getTenantContext()` server helper for use inside route handlers and server components. *Constraints:* resolution logic lives in exactly one file so switching to subdomains later is a swap, not a refactor; cache the slug-to-tenant lookup; API routes resolve the tenant the same way. *Done when:* `/s/irmmhs/...` resolves and `/s/nonsense/...` 404s.

**2.5 — Tenant context on the client.** *Task:* A `TenantProvider` React context supplying the current tenant to client components, hydrated from the server, plus a `useTenant()` hook. *Constraints:* never fetch the tenant client-side on first paint — pass it down from the server layout. *Done when:* a client component can render the school's display name without a loading state.

**2.6 — Isolation test suite.** *Task:* A Vitest suite that seeds two tenants with overlapping data and asserts isolation: reading tenant A's record with tenant B's id fails · updating across tenants fails · listing returns only own records · aggregates never cross · a missing tenantId throws rather than returning everything. *Constraints:* these tests run on every commit; write them so a future repository that bypasses the base class fails them. *Done when:* all pass, and deliberately breaking the base class makes them fail loudly.

**2.7 — Two-tenant seed.** *Task:* A seed script creating IRMMHS from the real Phase 0 data plus a second fictional school of a different type (use School B or C from the reference set). *Constraints:* idempotent — safe to re-run; the second school must differ meaningfully, not be a copy with a different name. *Done when:* I can log into two schools in two browser profiles. *This is now your permanent development setup.*

---

### Phase 3 — Config foundation

**3.1 — 📐 Contract: school year & terms.** *Task:* Design `SchoolYear` and `Term` (the generalised grading period), plus `TermStructure` as a preset describing how a year divides. Output schemas, validators, endpoints, indexes, open questions. *Constraints:* must express four quarters, two semesters, three trimesters, and a school that runs semesters for senior levels and quarters for junior levels *in the same year*; a term carries its own open/closed state for grade encoding; school years belong to a tenant and only one is active per tenant at a time. *Done when:* I can trace how all three reference schools' calendars fit the model.

**3.2 — Implement school year & terms.** *Task:* Models, repositories extending `TenantScopedRepository`, and services from the 3.1 contract. *Done when:* the isolation tests still pass with the new collections.

**3.3 — School year API.** *Task:* Route handlers for school-year CRUD plus a "set active" action, and term state transitions (open, close, reopen). *Constraints:* thin handlers; permission checks stubbed with a TODO pointing at Phase 4; closing a term must be reversible by an admin and must be audited later. *Done when:* I can create a year and activate it over HTTP.

**3.4 — The scoping helpers.** *Task:* `getActiveSchoolYear(tenantId)` server helper and a `useSchoolYear()` client hook, plus a documented convention that every academic query takes both tenant and school year. *Constraints:* establish the pattern now — every later phase follows it. *Done when:* a page can render "SY 2025–2026, Quarter 1" without extra plumbing.

**3.5 — Term structure presets.** *Task:* Ship four presets — four quarters, two semesters, three trimesters, custom — as data that a school picks when creating a year. Applying a preset generates the terms with sensible default dates. *Constraints:* presets are seed data in a `packs/` folder, not code; a school can edit terms after applying a preset. *Done when:* creating a year with the trimester preset produces three terms.

**3.6 — School year admin page.** *Task:* A minimal page listing school years with create, activate, and a term list with state toggles. *Constraints:* ugly is fine — Phase 5 makes it pretty. Use no literal colours even now. *Done when:* I can drive the whole feature from a browser.

**Phase acceptance:** create a school year, activate it, and any server code can ask "which school year is it for this tenant?" and get an answer.

---

### Phase 4 — Identity & access

**4.1 — 📐 Contract: users, memberships, roles.** *Task:* Design `User` (platform-level identity), `Membership` (user ↔ tenant ↔ role, with status), `Role` (tenant-scoped, named, with a permission set), and the permission taxonomy itself. Output schemas, validators, endpoints, indexes, and the full initial permission list grouped by domain. *Constraints:* a user can belong to several tenants with different roles; a learner may have no email — support an identifier-based login; roles are data so a school can create "Registrar" or "Guidance" itself; include a platform-level `superadmin` flag outside the tenant model. *Done when:* I can read the permission list and see every action the system will ever gate.

**4.2 — Implement identity.** *Task:* Models, repositories, and services from 4.1. *Constraints:* `User` is not tenant-scoped; `Membership` and `Role` are. Password hashing with argon2 or bcrypt, never plaintext, never reversible. *Done when:* isolation tests pass and I can create a user with memberships in both seeded tenants.

**4.3 — Auth.js wiring.** *Task:* Auth.js with a credentials provider. The session carries the user plus their memberships. Login, logout, session refresh. *Constraints:* session must not carry the full permission set if it makes the cookie large — carry role ids and resolve server-side; never trust a client-supplied tenantId. *Done when:* I can log in and read my memberships from the session.

**4.4 — Route protection.** *Task:* Middleware enforcing: authenticated for all `/s/{slug}/*` routes, and membership in *that* tenant specifically. A user with a membership in School A hitting School B's URL gets 403, not a redirect to School A. *Constraints:* one middleware file; API routes protected by the same logic. *Done when:* the cross-tenant URL attempt fails in the browser, with both seed tenants open.

**4.5 — Permission helper.** *Task:* `requirePermission(ctx, permission)` for route handlers and server components, plus a `<Can permission="…">` client component for conditional UI. *Constraints:* server checks are authoritative; the client component is convenience only and must never be the sole gate. *Done when:* a handler without the permission returns 403 and the button is hidden.

**4.6 — Login & tenant selection.** *Task:* A login page, plus a school picker for users with several memberships, plus a direct-to-school flow when a user has exactly one. *Constraints:* functional, minimally styled — Phase 5 restyles it; the school picker shows each school's display name and logo. *Done when:* a two-school user picks and lands in the right place.

**4.7 — User administration.** *Task:* Admin screens to invite or create a user, assign a role, deactivate, and reactivate, all within the current tenant. *Constraints:* creating a user in tenant A must never expose whether that email exists in tenant B; deactivation is reversible and never deletes. *Done when:* I can provision a teacher account end to end.

**4.8 — Credential lifecycle.** *Task:* Forced password change on first login, self-service password change, and admin-initiated password reset. *Constraints:* no email-based reset flow yet if the school has no mail infrastructure — admin reset with a one-time code is acceptable for v1; document the choice in the decision log. *Done when:* a newly provisioned account is forced to set its own password.

---

### Phase 5 — Theming & design system

This is where `irmmhs-design-tokens.json` becomes a schema.

**5.1 — 📐 Contract: theme as data.** *Task:* Take my design token JSON and design a `Theme` schema from it: which token groups are per-tenant configurable (palette ramps, logo, display name treatment), which are platform-fixed (spacing, radius, motion, breakpoints, print), and how a theme is stored and validated. Output the schema, a Zod validator, and the shape of a "theme pack" file. *Constraints:* a school configures a small number of inputs — two or three brand colours plus a logo — and the system *derives* the full ramps; do not ask a principal to pick eleven shades of violet. *Done when:* I can see how a new school gets a complete valid theme from three inputs.

**5.2 — Ramp generation.** *Task:* A pure function taking a base hex and producing a perceptually even 50–950 ramp, plus a function that assembles a full token set from two or three brand inputs and the platform-fixed tokens. *Constraints:* work in a perceptual colour space (OKLCH) rather than naive HSL — naive ramps go muddy in the middle; include a contrast check that warns when a generated pairing fails WCAG AA. *Done when:* feeding it the IRMMHS violet reproduces something close to my hand-tuned ramp, and feeding it a random hex produces something usable.

**5.3 — Theme to CSS variables.** *Task:* Render the active tenant's theme as CSS custom properties into the document, server-side, without a flash of unstyled or wrongly-themed content. *Constraints:* must work with server components and streaming; no client-side theme fetch. *Done when:* switching between the two seeded tenants visibly changes the colours with no flash.

**5.4 — Tailwind bound to variables.** *Task:* A Tailwind config whose colours reference the CSS variables rather than literal hex, exposing semantic utilities (`bg-surface-raised`, `text-content-primary`, `border-brand`) rather than raw palette steps. *Constraints:* the semantic layer is what components use; raw palette utilities should be awkward to reach for. *Done when:* no component can be written with a literal hex and still pass lint.

**5.5 — shadcn install & variant binding.** *Task:* Install the shadcn base set and rebind every variant to the semantic tokens — button, input, select, dialog, table, badge, tabs, toast, dropdown, card. *Constraints:* button has no pink variant; primary is the institutional colour (see the token file's rationale); input heights follow the token file's mobile values. *Done when:* the whole component set re-themes when the tenant changes.

**5.6 — App shell.** *Task:* The application shell — top bar with school branding and school-year chip, role-aware sidebar, mobile drawer and bottom nav, user menu, school switcher for multi-tenant users. *Constraints:* mobile layout designed at 360px first; the active school year chip is the Illumination signature site; nav items resolve through `<Can>`. *Done when:* the shell works on a phone and shows different menus for a teacher and an admin.

**5.7 — Layout & state primitives.** *Task:* `PageHeader`, `DataCard`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog`, and a `PageContainer` honouring the container widths. *Constraints:* empty and error states take copy as props and follow the voice rules in the token file — no "Oops!", no "No records found"; loading states are skeletons matching the eventual layout, not spinners. *Done when:* every later screen is assembly rather than invention.

**5.8 — Form primitives & theme editor.** *Task:* Form primitives wired to react-hook-form and Zod (`Field`, `TextField`, `SelectField`, `DateField`, `FormActions`, with consistent error display), plus a theme editor page where an admin sets brand colours and uploads a logo and sees a live preview. *Constraints:* forms show validation on blur and on submit, never on every keystroke; the theme editor shows a contrast warning when a chosen colour will fail. *Done when:* I can rebrand the second seeded school in under two minutes.

**Phase acceptance:** the two seeded schools look genuinely different, and no component contains a literal colour.

---

## Stage B — Core records

### Phase 6 — Learner records

**6.1 — 📐 Contract: learner.** *Task:* Design the `Learner` schema. Core fields every school needs (names, sex, birthdate, address, contact), a configurable **primary identifier** (LRN for PH schools, something else elsewhere) with per-tenant format and validation rules, guardian relationships, and a `customFields` extension mechanism so a school can add fields the core does not know about. Output schema, validators, endpoints, indexes, open questions. *Constraints:* the identifier must not be the primary key; School C has no LRN at all so the identifier must be optional at the schema level and required by tenant configuration; name fields must handle Filipino conventions — multiple given names, maternal surname, suffixes like Jr and III; `customFields` needs a per-tenant field-definition record, not a free-form blob. *Done when:* I can see how all three reference schools store a learner without schema changes.

**6.2 — Implement learner.** *Task:* Model, tenant-scoped repository, services, and the `LearnerFieldDefinition` model backing custom fields. *Constraints:* compound indexes on `(tenantId, identifier)` unique-sparse and `(tenantId, lastName, firstName)`; soft delete only. *Done when:* isolation tests pass with learner data seeded in both tenants.

**6.3 — Learner list.** *Task:* A paginated, searchable, filterable learner list — search by name and identifier, filter by grade level, section, and status. *Constraints:* server-side pagination and search, never load-all-then-filter; search must tolerate partial names and be diacritic-insensitive; table follows the token file's row heights and uses tabular figures for identifiers. *Done when:* searching 500 seeded learners feels instant on a throttled connection.

**6.4 — Learner create & edit.** *Task:* Create and edit forms rendering both core fields and the tenant's custom field definitions. *Constraints:* one form component driven by configuration, not two hand-written forms; validation messages come from the schema; mobile layout is single-column with 48px inputs. *Done when:* adding a custom field in configuration makes it appear in the form with no code change.

**6.5 — Learner profile.** *Task:* A profile view with tabs for details, enrolment history, grades, and attendance — the latter three as empty placeholders wired to real components later. *Constraints:* the placeholders must use `EmptyState` with honest copy, not fake data. *Done when:* the profile is the natural place every later feature plugs into.

**6.6 — Archive & restore.** *Task:* Archive a learner with a reason, list archived learners, restore. *Constraints:* archived learners disappear from default queries but never from academic history or generated reports; the reason is required and audited. *Done when:* an archived learner's past grades still appear on their transcript.

**6.7 — Import: mapping & validation.** *Task:* An Excel/CSV import flow — upload, preview, map spreadsheet columns to fields, validate row by row, and show an error report identifying the row and the problem. *Constraints:* nothing is written until the whole file validates or the user explicitly chooses to import only valid rows; duplicate detection on the identifier; the mapping step must handle a school's existing spreadsheet without them reformatting it — this is the migration path and the trust-builder. *Done when:* importing a deliberately messy file produces a useful error report rather than a stack trace.

**6.8 — Guardians.** *Task:* Guardian records with relationships to learners, including many-to-many for siblings, plus contact preferences and a consent flag for RA 10173. *Constraints:* one guardian record serves several learners — never duplicate per child; the consent flag records what was consented to and when. *Done when:* a parent with three children in the school appears once.

---

### Phase 7 — Personnel records

**7.1 — 📐 Contract: personnel.** *Task:* Design `Personnel` — staff profile, employment details, position, linkage to a `User` account, and a configurable custom-field mechanism mirroring the learner one. Output schema, validators, endpoints, indexes. *Constraints:* a person may exist as personnel without a user account and vice versa — model the link as optional on both sides; positions are tenant-configured data, not an enum.

**7.2 — Implement & CRUD.** *Task:* Model, repository, services, list, create, edit, archive. *Constraints:* reuse the learner list and form patterns rather than inventing new ones.

**7.3 — Account linkage.** *Task:* Link a personnel record to a user account, or provision an account directly from a personnel record. *Constraints:* provisioning inherits the credential lifecycle from 4.8; unlinking never deletes either record.

**7.4 — Load & advisory views.** *Task:* A per-teacher view of their teaching load and advisory assignment for the active school year, plus an admin view of load across all staff. *Constraints:* placeholders until Phase 8 supplies class offerings — build the shell now and wire it there.

**7.5 — Personnel import.** *Task:* Reuse the 6.7 import engine for personnel. *Constraints:* if this requires more than trivial changes, the import engine was not generic enough — fix the engine rather than forking it.

---

### Phase 8 — Academic structure

The phase where generality is won or lost. Nothing here may be an enum.

**8.1 — 📐 Contract: academic structure.** *Task:* Design `Programme` (a track a learner follows — JHS, SHS-STEM, ALS, Primary), `GradeLevel` (**tenant data, not an enum** — ordered, named, belonging to a programme), `SubjectGroup`, `Subject`, `Curriculum` (which subjects a level takes, with units and a grading scheme reference), `Section`, and `ClassOffering` (subject × section × teacher × school year). Output schemas, validators, endpoints, indexes, open questions. *Constraints:* must express IRMMHS's Grades 7–10 plus an ALS programme, School B's Kinder–12 with SHS strands, and School C's Years 1–13 — with no code change between them; `Section` belongs to a grade level and school year and has an adviser; a `ClassOffering` may have several teachers. *Done when:* I have traced all three reference schools through the model on paper.

**8.2 — Implement structure.** *Task:* All models, repositories and services from 8.1. *Constraints:* compound indexes on every collection; the referential integrity rules from the contract enforced in services, not just in the UI. *Done when:* isolation tests pass across seven new collections.

**8.3 — Programmes & grade levels.** *Task:* Admin screens to define programmes and their ordered grade levels. *Constraints:* reordering must not break existing enrolments; deleting a level with enrolments is refused with a clear explanation, not a foreign-key error. *Done when:* I can build IRMMHS's structure and School C's structure in the same UI.

**8.4 — Subjects & subject groups.** *Task:* Admin screens for subject groups and subjects, with subjects assigned to groups. *Constraints:* subject groups carry the default grading scheme reference — this is the hook Phase 10 uses; seed the DepEd JHS groups as a preset, not as code. *Done when:* the DepEd subject groups load from a pack file.

**8.5 — Curriculum builder.** *Task:* A screen defining which subjects each grade level takes in each programme, with units and per-subject grading scheme overrides. *Constraints:* copying a curriculum from a previous year or another level must be one click — schools do not want to rebuild this annually. *Done when:* I can build a Grade 7 curriculum in under five minutes.

**8.6 — Sections & advisers.** *Task:* Section management — create, name, assign grade level and adviser, set capacity and room. *Constraints:* section names are free text (Philippine schools name them after flowers, virtues, scientists); an adviser must be personnel in this tenant; capacity is advisory, not enforced. *Done when:* I can set up a school year's sections.

**8.7 — Class offerings.** *Task:* Assign teachers to subject-and-section combinations for the school year, with a bulk-assign view. *Constraints:* generating offerings automatically from a curriculum plus sections should be one action, with teachers filled in afterwards. *Done when:* one action produces every offering a grade level needs.

**8.8 — Conflict detection.** *Task:* Detect and surface conflicts — a teacher assigned beyond a configured maximum load, a section missing a subject its curriculum requires, an offering with no teacher, a section with no adviser. *Constraints:* warnings not blocks — schools operate with unresolved gaps all the time and a system that refuses to proceed will be abandoned; surface them as a dismissible checklist. *Done when:* a deliberately incomplete setup produces an accurate, non-obstructive list.

---

### Phase 9 — Enrolment & sectioning

**9.1 — 📐 Contract: enrolment.** *Task:* Design `Enrolment` (learner × school year × programme × grade level × section, with status) and `EnrolmentStatusEvent` for history. Output schema, validators, endpoints, indexes. *Constraints:* status covers enrolled, pending, transferred in, transferred out, dropped, graduated, and completed; every status change is an event with a date, reason and actor, never an overwrite; a learner has at most one active enrolment per school year per programme.

**9.2 — Implement enrolment.** *Task:* Model, repository, services, with the invariant enforced in the service layer. *Done when:* attempting a duplicate active enrolment is refused with a clear error.

**9.3 — Enrol a learner.** *Task:* The single-learner enrolment flow, from the learner profile or from an enrolment screen. *Constraints:* pick programme, level, and section, with section suggestions by remaining capacity. *Done when:* I can enrol a learner in three clicks.

**9.4 — Bulk enrolment & sectioning.** *Task:* Select many learners and enrol them into a level, then distribute across sections — evenly, alphabetically, or by a chosen balance criterion. *Constraints:* preview before commit, always; must handle 500 learners without timing out. *Done when:* I can section an entire grade level in one pass.

**9.5 — Transfers & drops.** *Task:* Transfer in, transfer out, and drop flows, each capturing a date, reason and supporting note, and each writing a status event. *Constraints:* a transferred-out learner retains all academic history and still appears on the forms covering the period they attended. *Done when:* a mid-year transfer produces a correct partial record.

**9.6 — Enrolment dashboard.** *Task:* Counts by programme, grade level, section and status for the active school year, with drill-down. *Constraints:* aggregation queries must be tenant-matched first; numbers must reconcile exactly with the learner list. *Done when:* the dashboard total matches a manual count.

**9.7 — Promotion.** *Task:* Promote a cohort from one school year to the next — carry learners forward to the next grade level, with retention and graduation handled as exceptions. *Constraints:* driven by the promotion outcomes Phase 11 produces, but usable manually before that exists; preview before commit; fully reversible within the same session. *Done when:* I can advance a grade level into a new school year and see the exceptions listed separately.

---

## Stage C — The academic engine

### Phase 10 — Grading configuration

**10.1 — 📐 Contract: grading scheme.** *Task:* Design `GradingScheme` — a named, tenant-scoped, school-year-versioned configuration containing: an ordered list of weighted `Components` (Written Work, Performance Task, Quarterly Assessment — but named and counted by the school), a `ScaleTransform`, `DescriptorBands`, a passing mark, rounding rules, and a final-grade aggregation rule across terms. Output schema, validators, endpoints, indexes, open questions. *Constraints:* the **ScaleTransform generalises transmutation** — it must support a lookup table (Philippines), a linear or piecewise formula, a letter-and-GPA mapping (School C), and identity (raw percentage); components must support two, three, or more, with weights summing to 100; descriptor bands are ordered ranges with a code, a label, and a semantic colour key that resolves through the theme. *Done when:* I can express DO 8 s. 2015, a plain percentage scheme, and a 4.0 GPA scheme in the same schema.

**10.2 — Implement grading configuration.** *Task:* Models, repositories, services, and assignment of schemes to subject groups, curriculum entries, and individual offerings with a clear precedence order. *Constraints:* precedence is offering, then curriculum entry, then subject group, then school default — document it and expose a resolver function; schemes are versioned per school year and never edited in place once grades reference them.

**10.3 — Component & weight editor.** *Task:* An admin UI to define components and their weights per subject group, with live validation that weights sum to 100 and a visual distribution bar. *Constraints:* the bar uses the `gradeComponent` swatches from the token file; blocking save on a bad sum, with the error stated in plain language. *Done when:* setting Science to 40/40/20 takes fifteen seconds.

**10.4 — Scale transform editor.** *Task:* An editor supporting all transform types — a table editor with import for lookup tables, a formula input for linear ones, a mapping editor for letter grades, and a toggle for identity. *Constraints:* the DepEd transmutation table must be importable from a pasted or uploaded table, not typed in by hand; show a live preview of what a few sample raw scores become. *Done when:* pasting the DepEd table produces a working transform in one step.

**10.5 — Descriptor bands.** *Task:* An editor for ordered descriptor bands with code, label, range, and colour key, validating that bands are contiguous and non-overlapping. *Constraints:* the accent colour is not offered as an option — the school's signature colour must never mean a grade; the passing mark must fall on a band boundary. *Done when:* a gap or overlap is refused with the specific range named.

**10.6 — Grading preset packs.** *Task:* Package four grading presets as pack files — DepEd DO 8 s. 2015 (JHS and SHS variants), simple weighted percentage, letter grade with 4.0 GPA, and pass/fail. Plus the UI to apply one to a school. *Constraints:* packs are versioned JSON in `packs/grading/`, loaded and validated at apply time, never imported as code; applying a pack creates editable school-owned records — the school owns its copy afterwards. *Done when:* a new school gets a working DepEd configuration in one click, then edits it freely.

**10.7 — Scheme resolution & preview.** *Task:* The `resolveSchemeFor(offering)` service implementing the precedence order, plus a preview screen showing which scheme applies to every subject in a grade level. *Constraints:* the preview is how a registrar catches misconfiguration before encoding starts — make the source of each resolution visible. *Done when:* I can see at a glance that every Grade 8 subject has the scheme its school intends.

---

### Phase 11 — Grade computation engine ⚠️

The highest-risk code in the project. Everything else is UI around these numbers.

**11.1 — 📐 Contract: the computation.** *Task:* Specify the pure computation function — its exact signature, inputs, outputs, and **every edge case**: a component with no assessment items, an assessment item with zero total points, a learner missing scores in one component, a partially encoded term, scores exceeding the maximum, rounding at each stage, whether rounding happens before or after transmutation, what a transform does with an out-of-range input, and what the function returns when it cannot compute. Output the signature, the full case list, and the decisions each case needs from me. *Constraints:* **no implementation** — this is a specification I must read and rule on; every ambiguity must be surfaced as a question, not silently resolved. *Done when:* I have made an explicit decision on each edge case and recorded it in the decision log.

**11.2 — Implement the engine.** *Task:* Implement as a pure function with **zero database access** — it takes raw scores plus a resolved scheme and returns component percentages, the initial grade, the transformed grade, and the descriptor. *Constraints:* no imports from repositories, models, or anything async; no side effects; deterministic; every decision from 11.1 implemented exactly as ruled, with the rule number in a comment. *Done when:* the function has no dependency on the rest of the codebase and could be extracted to a standalone package.

**11.3 — Exhaustive test suite.** *Task:* A test suite covering every case from 11.1, plus fixture-based tests for each grading preset. For the DepEd preset, use hand-computed examples from real DepEd training materials and assert exact equality. *Constraints:* **hand-compute at least twelve full cases yourself** before writing assertions — do not let the model generate both the expected values and the code that produces them, because it will agree with itself; include boundary cases at every descriptor edge and at the passing mark. *Done when:* every case passes and mutating any weight in the engine breaks a test.

**11.4 — Grade records.** *Task:* The `Grade` schema — per learner, per offering, per term — storing raw component scores, computed values, the descriptor, status, and a **full snapshot of the scheme used** at finalisation. *Constraints:* the snapshot is embedded, not referenced; a finalised grade is immutable except through an audited correction that preserves the prior value.

**11.5 — Final grades & averages.** *Task:* Aggregation across terms into a final subject grade, and across subjects into a general average, both driven by the scheme's aggregation rule. *Constraints:* weighting across terms is configuration (equal weight, or semester-weighted); a general average must state how it handles subjects with units versus without. *Done when:* changing the aggregation rule changes the average correctly for the seeded data.

**11.6 — Promotion rules.** *Task:* Promotion, retention, and remedial outcomes as configurable rules — passing mark, maximum failed subjects, whether specific subjects are mandatory to pass. *Constraints:* rules are data per school year; the outcome is computed and stored with its reasoning, so a registrar can see *why* a learner was flagged for retention. *Done when:* the reasoning string is good enough to show a parent.

**11.7 — Recomputation.** *Task:* A service that recomputes grades when a scheme or an assessment item changes, but **only for non-finalised grades**, with a preview of what would change. *Constraints:* finalised grades are never touched — this is the guarantee that historical report cards stay valid; the preview lists every affected learner before anything is written. *Done when:* editing a weight mid-quarter updates drafts and leaves last quarter's finalised grades untouched.

**Phase acceptance:** hand-compute five complete report cards from real DepEd examples. If the engine disagrees by even one point, the project has no value yet. Stop and fix it.

---

### Phase 12 — Grade entry UX

The screen teachers actually live in. Optimise it above everything else in the system.

**12.1 — 📐 Contract: class record.** *Task:* Design `AssessmentItem` (a specific quiz or task within a component, with a name, total points, date, and order) and the class-record read model — the shape a teacher's screen needs in one request. Output schemas, validators, endpoints, indexes. *Constraints:* one request must return the offering, its scheme, its assessment items, every enrolled learner, and every existing score — the mobile screen cannot make N requests; the write endpoint must accept a batch of score changes, not one per cell.

**12.2 — Assessment items.** *Task:* Create, edit, reorder, and delete assessment items within a component for an offering. *Constraints:* deleting an item with scores requires confirmation naming how many scores will be lost; total points is required and must be positive. *Done when:* a teacher can set up a quarter's columns in a couple of minutes.

**12.3 — The entry grid.** *Task:* The mobile-first grade entry grid — learners as rows, assessment items as columns, grouped by component, with a sticky learner column and sticky headers. *Constraints:* designed at 360px first; cells follow the token file's `gradeCell` spec — 48px minimum height, mono font, tabular figures; numeric keyboard on mobile; enter and tab move predictably; **a mis-tap must never silently overwrite a score**. *Done when:* I can encode a full class on a phone without zooming.

**12.4 — Draft persistence & sync.** *Task:* Local persistence of unsaved edits, an explicit save action, a permanently visible sync status indicator, and recovery of drafts after a page reload or a lost connection. *Constraints:* use IndexedDB, not localStorage — capacity and structure both matter here; dirty cells are visually distinct per the token file's `bgDirty`; the sync indicator uses the `syncStatus` tokens and is never hidden in a toast; a failed save must never lose the user's input. *Done when:* killing the network mid-encoding, reloading, and reconnecting loses nothing.

**12.5 — Live computed preview.** *Task:* Show each learner's running component percentages, initial grade, transformed grade, and descriptor, updating as scores are entered. *Constraints:* reuse the Phase 11 engine directly on the client — one implementation, never a second copy; show clearly when a grade is provisional because a component is incomplete. *Done when:* the on-screen preview matches the server's computation exactly.

**12.6 — Excel export.** *Task:* Export a class record as an Excel template matching the on-screen structure, formatted for a teacher to fill in offline. *Constraints:* include learner names and identifiers, protected; assessment columns with their total points in the header; the file must be usable on a phone or a shared computer without instructions.

**12.7 — Excel import.** *Task:* Import a filled class record back, matching learners by identifier, validating every score against its item's total, and showing a diff of what will change before committing. *Constraints:* never silently overwrite — the diff shows current value, new value, and learner name for every change; scores exceeding the total are rejected with the row named. *Done when:* the export-fill-import round trip works with a real spreadsheet.

**12.8 — Submit & approve.** *Task:* The workflow — a teacher submits a term's grades for an offering, an adviser or registrar reviews and approves or returns with a comment, and approval finalises and locks. *Constraints:* the states come from the token file's `gradingPeriodState`; a returned submission is editable again; finalisation writes the scheme snapshot from 11.4; who can approve is a permission, not a hard-coded role. *Done when:* the full loop works between two logged-in users.

**12.9 — Grade audit log.** *Task:* Every grade write records actor, timestamp, previous value, new value, and reason where applicable — including imports, batch saves, and post-finalisation corrections. *Constraints:* the audit write is in the same transaction as the grade write — never fire-and-forget; audit records are append-only and never editable. *Done when:* I can reconstruct the complete history of any single score.

---

### Phase 13 — Attendance

**13.1 — 📐 Contract: attendance.** *Task:* Design `AttendanceRecord` and the per-tenant configuration selecting daily or per-period tracking, the state set, and which states count as present for reporting. Output schema, validators, endpoints, indexes. *Constraints:* IRMMHS needs daily by section; School B may need per-period by offering; states must be configurable beyond present/absent/late/excused; storage must stay efficient at 500 learners × 200 school days.

**13.2 — Implement attendance.** *Task:* Model, repository, services, with the configuration resolver. *Constraints:* index for the two dominant queries — one section on one day, and one learner across a date range.

**13.3 — Taking attendance.** *Task:* The mobile-first attendance screen — a section's learners for a chosen date, one tap per state. *Constraints:* default everyone to present and let the teacher mark exceptions — this is how it is actually done; 44px minimum targets; today's date is the Illumination site; offline-tolerant like grade entry. *Done when:* marking a class of forty takes under thirty seconds.

**13.4 — Bulk actions & corrections.** *Task:* Mark all present, apply a state to a selection, copy yesterday's record, and correct a past date with an audited reason. *Constraints:* corrections beyond a configurable window require an elevated permission.

**13.5 — Summaries.** *Task:* Per-learner and per-section attendance summaries over a date range, in the shape the reporting phase will need. *Constraints:* counts must reconcile exactly with the raw records; compute the present/absent totals the DepEd forms expect using the tenant's own present-state configuration.

**13.6 — Absence flagging.** *Task:* Flag configurable patterns — consecutive absences, a percentage threshold over a period — surfaced to advisers. *Constraints:* thresholds are per-tenant data; a flag is informational and never automatically triggers an action. *Done when:* a seeded learner with a deliberate absence pattern appears on the adviser's list.

---

## Stage D — Output

### Phase 14 — Reporting & compliance packs

The phase that makes the platform genuinely portable. The core knows about reports; packs know about SF9.

**14.1 — 📐 Contract: the report engine.** *Task:* Design the reporting architecture — a `ReportTemplate` registry, a `DataResolver` interface (given a tenant, school year, and scope, return the data a template needs), a renderer, and a `Pack` manifest format declaring which templates and configuration a pack contributes. Output the interfaces, the manifest schema, the registration mechanism, and how a tenant's installed packs are resolved. *Constraints:* the core must contain no reference to any DepEd form; adding a pack must require no core changes; templates declare their required data so a missing prerequisite is reported before rendering rather than as a crash mid-render. *Done when:* I can see how School C runs with zero packs installed.

**14.2 — Render strategy.** *Task:* Decide and implement the render pipeline — HTML plus a print stylesheet, server-side PDF, or both — with a reasoned recommendation given Vercel's constraints and the school's printers. *Constraints:* whatever is chosen must reproduce a fixed layout on long bond paper exactly; evaluate the cost of a headless-browser PDF on serverless honestly, including cold starts and bundle limits; the print stylesheet strips every shadow, radius and background fill per the token file's print rules. *Done when:* a test page prints identically from two different browsers.

**14.3 — Generic report card.** *Task:* A school-agnostic report card template driven entirely by the tenant's configuration — its terms, its subjects, its descriptor bands, its branding. *Constraints:* works for all three reference schools with no template variants; the school's official name, address and logo come from tenant configuration. *Done when:* School C's trimester GPA report card renders correctly from the same template as IRMMHS's quarterly one.

**14.4 — Generic transcript.** *Task:* A multi-year academic record template — every school year, programme, level, subject and final grade a learner has accumulated. *Constraints:* must include years where the learner transferred in or out partway; archived learners still render.

**14.5 — DepEd Pack: SF9.** *Task:* Build the DepEd Pack scaffold and its first template — SF9, the Learner's Progress Report Card — pixel-faithful to the official file obtained in Phase 0. *Constraints:* **work from the real template file, not from a description** — if the file is not to hand, stop and tell me rather than approximating; every field position, rule weight and label must match; include the attendance block, the values-and-behaviour section, and the signature blocks.

**14.6 — DepEd Pack: SF10.** *Task:* SF10, the Learner's Permanent Academic Record, including prior-school entries and the certification block. *Constraints:* same fidelity requirement; must handle a learner with records from schools outside the system.

**14.7 — DepEd Pack: SF1, SF2, SF5.** *Task:* School Register, Daily Attendance Report, and Report on Promotion. *Constraints:* SF2's monthly summary must reconcile exactly with the Phase 13 records; SF5's promotion outcomes come from the Phase 11 rules.

**14.8 — Batch generation.** *Task:* Generate a form for an entire section or grade level as one document, with progress feedback and resumability. *Constraints:* 500 report cards must not time out a serverless function — design for chunking or a background job and say which; page breaks must land correctly between learners. *Done when:* a full grade level batch completes reliably.

**14.9 — Data export.** *Task:* Generic CSV and Excel exports of learners, enrolments, grades and attendance, plus a DepEd-Pack LIS-compatible export in whatever format the registrar confirmed in Phase 0. *Constraints:* exports are permission-gated and audited — a full learner export is a data-protection event; the generic exports live in core, the LIS format lives in the pack.

**Phase acceptance:** print an SF9 and put it beside a real one. If a registrar can tell them apart at a glance, it is not done.

---

### Phase 15 — Announcements & communication

**15.1 — 📐 Contract: announcements.** *Task:* Design `Announcement` with audience scoping (whole school, programme, grade level, section, role, or a named list), categories, scheduling, attachments, and read tracking. Output schema, validators, endpoints, indexes. *Constraints:* audience resolution must be a query, not a materialised recipient list, so a learner enrolling later still sees a standing announcement; categories are tenant data.

**15.2 — Implement announcements.** *Task:* Model, repository, services, and the audience resolver. *Constraints:* the resolver is the interesting part — test it against overlapping audiences.

**15.3 — Compose.** *Task:* The composer — title, body with basic rich text, category, audience picker, attachments, publish now or schedule. *Constraints:* the audience picker shows a live recipient count before publishing; attachments go to object storage, never into MongoDB.

**15.4 — Feed.** *Task:* The audience-filtered feed for each role, with unread indicators and a detail view. *Constraints:* a learner or guardian sees only what is addressed to them; category colours come from the token file's `announcementCategory` group.

**15.5 — Read tracking.** *Task:* Record reads and show senders a read count and, where the audience is small, a list. *Constraints:* read state is per user; showing a named list of who has not read must be permission-gated.

**15.6 — Notification adapters.** *Task:* A notification interface with a no-op default implementation, plus adapters for email and SMS behind it, and per-user notification preferences. *Constraints:* **the interface, not the integrations** — build the seam and one stub adapter, and leave a real SMS gateway for later; SMS in the Philippines is a real cost and needs the school's explicit budget decision. *Done when:* swapping in a real provider requires implementing one interface.

---

## Stage E — Platform

### Phase 16 — Onboarding wizard & preset packs

This is the phase that delivers "easily onboardable by any school." Everything before it made onboarding *possible*; this makes it *fast*.

**Target: a new school goes from an empty tenant to a usable system in under thirty minutes.** Treat that as a measurable acceptance criterion, and time yourself.

**16.1 — 📐 Contract: onboarding.** *Task:* Design the onboarding state machine — the steps, what each contributes, which are required versus skippable, how progress persists across sessions, and the "readiness" checks that determine whether a school can go live. Output the schema, the step definitions, and the readiness rule set. *Constraints:* a school must be able to leave halfway and return a week later; readiness checks are advisory for optional things and blocking for genuinely required ones — be explicit about which is which.

**16.2 — Preset pack format.** *Task:* Define the school preset pack — a single versioned file bundling a term structure, programmes and grade levels, subject groups and subjects, a curriculum, a grading configuration, a role set, and a theme. Plus a loader that validates a pack and applies it to a tenant. *Constraints:* one format for all pack types, validated with Zod on load; applying a pack creates school-owned editable records — the school never depends on the pack file afterwards; applying twice must not duplicate.

**16.3 — Build three preset packs.** *Task:* Author `ph-deped-jhs`, `ph-deped-shs`, and `generic-k12` as complete preset packs. *Constraints:* the DepEd packs encode DO 8 s. 2015 grading, the standard subject groups, quarters, and the DepEd compliance pack; `generic-k12` uses simple percentage grading, no compliance pack, and neutral terminology — it is the proof that the platform is not Philippines-only. *Done when:* applying `generic-k12` produces a working school with no Philippine terminology anywhere in the UI.

**16.4 — Wizard: identity & branding.** *Task:* Steps one and two — school profile (display name, official name for forms, address, identifiers, locale, timezone) and branding (logo upload, brand colours with live preview). *Constraints:* reuse the Phase 5 theme editor rather than building a second one; the official-name field explains why it may differ from the display name.

**16.5 — Wizard: choose a preset.** *Task:* Step three — present the available preset packs with a plain-language description of what each sets up, apply the chosen one, then show what was created with an invitation to adjust. *Constraints:* "adjust later" must be genuinely easy — link directly to each configuration screen; a school choosing nothing must still reach a usable state.

**16.6 — Wizard: import people.** *Task:* Step four — import learners and personnel using the Phase 6 and 7 import engines, embedded in the wizard flow. *Constraints:* offer downloadable template spreadsheets; a school with no data yet can skip and add people manually.

**16.7 — Wizard: structure.** *Task:* Step five — create sections, assign advisers, and generate class offerings for the first school year. *Constraints:* use the bulk tools from Phases 8 and 9 rather than wizard-only variants.

**16.8 — Readiness & go-live.** *Task:* A readiness checklist showing what is configured and what is missing, a demo-data toggle for a school that wants to try before committing real records, and the go-live action that moves the tenant from `onboarding` to `active`. *Constraints:* demo data must be removable in one action with no residue; going live is reversible back to onboarding. *Done when:* I have timed myself onboarding a fictional school start to finish and it is under thirty minutes.

---

### Phase 17 — Platform console

**17.1 — 📐 Contract: platform administration.** *Task:* Design the platform-admin layer — the superadmin identity model, tenant lifecycle states and transitions, and what a platform admin may and may not see inside a tenant. Output the schema, the permission model, and the boundary rules. *Constraints:* platform admins are outside the tenant permission system entirely; **be explicit and conservative about what they can see** — access to learner personal data must be exceptional, logged, and justified, not routine.

**17.2 — Tenant management.** *Task:* Platform screens to list, create, suspend, reactivate and archive tenants, with the counts and status that matter operationally. *Constraints:* creating a tenant provisions its first admin account and hands off to onboarding; suspension blocks access without deleting anything.

**17.3 — Support impersonation.** *Task:* The ability for a platform admin to enter a tenant as a support user, with a persistent visible banner, a required reason, a time limit, and a full audit entry. *Constraints:* impersonation is read-only by default with write access requiring separate explicit escalation; the banner cannot be dismissed; the tenant's own admins can see the impersonation log. *Done when:* every impersonation session is fully reconstructible after the fact.

**17.4 — Usage & health.** *Task:* Per-tenant metrics — learner and user counts, storage, recent activity — plus platform-wide health indicators. *Constraints:* aggregate counts only; no drill-down into personal data from this screen.

**17.5 — Pack management.** *Task:* Install, update and remove packs per tenant, with a view of what each pack contributes. *Constraints:* removing a compliance pack must not delete data the school generated with it — explain clearly what is lost and what is kept.

**17.6 — Platform audit.** *Task:* A platform-level audit view covering tenant lifecycle events, impersonations, pack changes and superadmin actions. *Constraints:* separate from tenant-level audit; append-only; retained per the retention policy.

---

### Phase 18 — Hardening & handover

**18.1 — Audit infrastructure.** *Task:* A general audit log — actor, tenant, action, entity, before, after, timestamp, IP — with a tenant-facing viewer with filters, and coverage of every write to grades, enrolments, users, roles and configuration. *Constraints:* append-only, indexed for the queries the viewer needs, and written in the same transaction as the change it records.

**18.2 — Auth hardening.** *Task:* Rate limiting on authentication and expensive endpoints, brute-force lockout with admin unlock, session timeout, and forced re-authentication for sensitive actions. *Constraints:* lockout must not become a denial-of-service against a legitimate user — pair it with admin unlock and clear messaging.

**18.3 — Backup & export.** *Task:* A complete per-tenant data export, scheduled backups, and a documented restore procedure that you have actually tested. *Constraints:* **test the restore, not just the backup** — an untested backup is not a backup; a school must be able to take its own full export at any time.

**18.4 — School year rollover.** *Task:* The one-action rollover — create the next school year, copy structure forward (programmes, levels, subjects, curriculum, sections), promote learners, and carry teacher assignments where they still apply. *Constraints:* preview everything before committing; nothing from the previous year is modified. *This is the feature that proves the school-year scoping was right.* *Done when:* rolling over the seeded school produces a correct new year in one pass.

**18.5 — Retention & erasure.** *Task:* Configurable retention policies per data category, a documented deletion procedure, and handling of erasure requests under RA 10173. *Constraints:* academic records have statutory retention obligations that override an erasure request — encode the distinction between data that must be kept and data that must be removed, and document the reasoning.

**18.6 — Privacy & consent.** *Task:* A privacy notice per tenant, consent capture for guardians, a consent status view, and the data-subject rights workflow. *Constraints:* consent records what was consented to, when, and by whom; photograph consent is tracked separately from records consent.

**18.7 — Feature flags.** *Task:* Per-tenant module toggles so a school can run without attendance, or without announcements, with navigation and permissions adapting. *Constraints:* flags are tenant data; a disabled module hides cleanly rather than erroring.

**18.8 — Observability.** *Task:* Error monitoring, structured logging with tenant context, and alerting on the failures that actually matter — failed grade saves, failed report generation, authentication anomalies. *Constraints:* **never log personal data**; log tenant and entity ids, never names or identifiers.

**18.9 — Performance pass.** *Task:* Profile the dominant queries, verify every collection's compound indexes, eliminate N+1 patterns, and load-test the grade entry and report batch paths at realistic volume. *Constraints:* test with several tenants of 500 learners and three years of history, not with the seed data.

**18.10 — Handover.** *Task:* Documentation for three audiences — a school administrator's guide, a teacher's quick-start, and a technical maintenance document covering deployment, backup, restore, adding a pack, and onboarding a school. *Constraints:* the admin guide is written for someone with no technical background and is tested by having an actual school staff member follow it; screenshots from the real system, kept current.

---

### Phase 19+ — Growth features

Nothing here begins until Stage C ships and a real school is using it daily.

Learning materials and file library · assignments and submissions · a parent and guardian portal · analytics dashboards for administrators · SMS notifications with a real gateway · QR or biometric attendance · a school calendar and events · fee and payment tracking · a library module · health records (SF8) · a public API for integrations · a mobile app wrapper · offline-first PWA · multi-language UI · a discipline and incident module · a guidance and counselling module.

Each of these is its own mini-roadmap. Add them to the decision log's "out of scope" list until a school asks for one twice.

---

## 6. Checkpoints

Six points where you stop and verify rather than proceeding. Failing one and continuing anyway is how projects die quietly.

1. **End of Phase 2.** With both seeded tenants open in two browsers, try to reach School A's data while logged into School B. Try it through the URL, through the API, and by editing a request. If any attempt succeeds, nothing else matters yet.
2. **End of Phase 3.** Ask "what happens in June when the new school year starts?" If the answer is not "click one button," the school-year scoping is wrong. Fixing it now costs a day; fixing it in Phase 12 costs a rewrite.
3. **End of Phase 5.** Rebrand the second seeded school entirely. If it takes more than two minutes or requires touching code, theming is not actually data.
4. **End of Phase 11.** Hand-compute five complete report cards from real DepEd examples. A one-point disagreement means the project has no value yet.
5. **End of Phase 12.** Give it to one real teacher, with one real class, on their own phone, on school Wi-Fi. Watch silently and do not help. Whatever they struggle with is the real backlog.
6. **End of Phase 16.** Onboard a fictional school from an empty tenant, with a stopwatch running. Over thirty minutes means the presets are not doing enough work.

---

## 7. Your immediate next three moves

1. **Answer D1–D10.** D2 (TypeScript) and D4 (tenancy model) branch the most.
2. **Do Phase 0 fieldwork**, and add the sixteenth question — talk to one school that is not IRMMHS. One conversation with a different kind of school will surface half your hard-coded assumptions before you write them.
3. **Write `PROJECT.md`** from the template in §4, including the three reference schools, then run Prompt 1.1.

A closing caution worth repeating: generality is a means, not the goal. The goal is that a real school in Bocaue stops keeping grades in a shoebox of spreadsheets. Every hour spent on the second school before the first one is live is an hour spent on nobody. Build the seams, ship to IRMMHS, and let the second school be the reward.
