# IRMMHS School Management System — Project Playbook

**A working plan for building the system in small, promptable steps.**

This document is the thing you keep open. It is not the system spec — it is the *method* for producing the system spec, phase by phase, prompt by prompt.

---

## 0. What I found about the school

Worth reading before any architecture decisions, because a few of these facts change the build.

| | |
|---|---|
| **Full name** | Iluminada Roxas-Mendoza Memorial High School |
| **DepEd School ID** | 306715 |
| **Location** | Sulucan, Bocaue, Bulacan — Region III (Central Luzon) |
| **Founded** | Started 2008 as an annex of Taal High School, operating out of borrowed classrooms at Biñang Elementary School; moved to its own site in October 2008 with 142 freshmen |
| **Named for** | Iluminada R. Mendoza, a teacher at Lolomboy Elementary School; land donated by the Roxas-Mendoza family |
| **Catchment** | Bambang, Sulucan, Biñang, Bunlo, Antipona and nearby barangays of Bocaue |
| **First principal** | Teresita D. de Martin |
| **Current principal** | Romhel C. Odtohan, Principal II (as of Aug 2025) |
| **Offerings** | Junior High School, plus an ALS Senior High School program (enrollment for ALS SHS was being run for CY 2024–2025) |
| **Online presence** | Two Facebook pages — a "DepEd Tayo" official page (~2,900 followers) and a school page. No website. |

### Three things in there that actually change your build

**1. There is a name/legal-entity ambiguity you must resolve.** DepEd's own school register lists ID 306715 as *"Bambang National High School (Iluminada Mendoza-Roxas Memorial High School)"* — and there is a Senate act from 2009 establishing a national high school in Barangay Bambang, Bocaue, to be known as Bambang National High School. So the community name and the official DepEd name may not match. **Every printed form your system generates carries a school name in the header.** Get the exact string DepEd expects, from the principal, before you print anything. This is a Phase 0 question, not a Phase 11 surprise.

**2. It runs ALS Senior High alongside regular JHS.** ALS (Alternative Learning System) has a different learner profile, different enrollment cadence, and different record-keeping from the regular K-12 track. If your data model assumes "everyone is in a section, in a grade level, taking a fixed subject load," ALS will break it. You do not have to build ALS in v1 — but the schema must not make it impossible.

**3. The school is small, young, and resource-constrained.** ~500 students, no website, PTA funding CCTV upgrades. This is not a school with an IT department. Whatever you build, *someone else maintains it after you*, on a shared computer, over school Wi-Fi, possibly on a phone. That constraint should win arguments against clever architecture, every time.

> Everything above came from public web sources of varying reliability (blog posts by student teachers, Facebook, a school-directory site). **Treat it as a starting hypothesis, not fact.** Phase 0 is where you replace it with what the school actually tells you.

---

## 1. The three forces this system has to serve

Almost every design argument you'll have with yourself reduces to one of these.

### Force 1 — DepEd compliance is the actual product

An LMS that can't print a valid SF9 is a toy. The school's real, non-negotiable, legally-mandated outputs are DepEd School Forms:

| Form | What it is | Priority |
|---|---|---|
| **SF9** | Learner's Progress Report Card (the old Form 138) | **Must have** |
| **SF10** | Learner's Permanent Academic Record (the old Form 137) | **Must have** |
| **SF1** | School Register | **Must have** |
| **SF2** | Daily Attendance Report of Learners | **Must have** |
| **SF5** | Report on Promotion & Learning Progress and Achievement | **Must have** |
| **SF6** | Summarized Report on Promotion | Should have |
| **SF7** | School Personnel Assignment List | Nice to have |
| **SF4** | Monthly Learner Movement and Attendance | Nice to have |
| **SF8** | Learner Basic Health Profile | Nice to have |

Also load-bearing:
- **LRN** — the 12-digit Learner Reference Number is the learner's national identity. It is not your primary key, but it is a unique, indexed, validated field from day one.
- **LIS / EBEIS** — DepEd's national Learner Information System. Your system does not replace it. Your system must **export into it** or at minimum not create data that contradicts it. Ask the registrar what their LIS upload workflow looks like.

**Grading (DepEd Order No. 8, s. 2015)** — grades are computed from three components with subject-dependent weights:

| Subject group | Written Work | Performance Task | Quarterly Assessment |
|---|---|---|---|
| Languages, AP, EsP (JHS) | 30% | 50% | 20% |
| Science, Math (JHS) | 40% | 40% | 20% |
| MAPEH, EPP/TLE (JHS) | 20% | 60% | 20% |
| SHS Core | 25% | 50% | 25% |
| SHS Academic track | 25% | 45% | 30% |
| SHS TVL / Sports / Arts | 20% | 60% | 20% |

Then a **transmutation table** maps the initial grade onto a 60–100 scale, and descriptors apply: 90–100 Outstanding, 85–89 Very Satisfactory, 80–84 Satisfactory, 75–79 Fairly Satisfactory, below 75 Did Not Meet Expectations. Passing is 75.

⚠️ **Verify all of this against the current DepEd order before you code it.** The MATATAG curriculum rollout has been changing assessment and grading policy on a rolling basis. The numbers above are the DO 8 s. 2015 baseline — they may already be superseded for some grade levels.

**And that is precisely the argument for your configurability requirement.** Not "wouldn't it be nice if" — but "DepEd will change this again and the school cannot afford to hire a developer when they do."

### Force 2 — Configurability, but only where change actually happens

Full configurability everywhere is a trap. It produces a system so abstract that nobody, including you in six months, can reason about it. Draw the line explicitly:

**Configure (stored as data, editable by an admin in the UI):**
- School year and grading periods (start/end dates, which quarter is open for encoding)
- Grading schemes — component weights, transmutation table, passing mark, descriptor bands
- Curriculum: subjects, subject groups, grade-level subject loads, units
- Sections, advisers, capacity, room
- Roles and permissions
- Announcement categories and audiences
- School profile: name, ID, address, division, region, principal, logo
- Module toggles (turn Attendance on, leave Library off)

**Hard-code (change requires a deploy, and that's fine):**
- What a School Form looks like
- Authentication mechanics
- The shape of the audit log
- Anything that has never changed and won't

**The single most important schema decision:** *nearly every record is scoped to a School Year.* Enrollments, section rosters, teacher assignments, grades, attendance, subject offerings, even a student's grade level. A student is not "in Grade 9" — a student **was in Grade 9 during SY 2025–2026**. Get this wrong and Year 2 forces a rewrite. Get it right and Year 2 is a button called "Roll Over School Year."

Second most important: **grading scheme snapshots.** When a grade is finalized, store the scheme that produced it *on the grade record*. If the school changes weights in 2027, the 2026 report cards must not silently change. Historical records are immutable; configuration is not retroactive.

### Force 3 — The realities of a Bocaue public high school

These are requirements, not garnish:

- **Mobile-first.** Teachers will encode grades on a phone. Design the grade-entry screen for a phone first and a desktop second, not the reverse.
- **Bad connections.** Grade entry must tolerate a dropped connection mid-encoding. Local draft state, explicit save, clear sync status. Losing a quarter of encoded grades to a Wi-Fi hiccup will kill adoption permanently.
- **Excel is the incumbent.** Teachers already keep class records in Excel; DepEd forms *are* Excel templates. Import and export are not nice-to-haves — they're the migration path and the trust-builder. "You can still work in Excel, just upload it" beats "please retype everything."
- **Language.** UI should be English with Filipino/Taglish where it's actually clearer. "Isumite" over "Submit" only if that's genuinely how the teachers there talk about it. Ask, don't assume.
- **Data Privacy Act (RA 10173).** You are processing personal data of minors at scale. Parental consent, a privacy notice, role-scoped access, an audit trail, and a retention policy are legal obligations, not features. If the school is a Personal Information Controller processing sensitive data on 1,000+ individuals (500 students + parents + staff will get close), NPC registration may apply. Flag it to the principal early; don't discover it at launch.
- **Cheap to run.** Vercel hobby/pro + MongoDB Atlas M0/M2 + a free-tier object store will carry 500 students comfortably. Budget for the school being able to pay ₱0–1,500/month, forever.

### The look and feel — "friendly and homey"

Concrete direction so this doesn't drift into generic SaaS:

- **Pull the palette from the school itself** — the actual logo, the uniform colors, the school banner. Do not invent a brand. Get the logo file from the school in Phase 0.
- Warm neutrals as the base (warm grays, off-white/cream — not cold slate), one confident school-color accent, one supporting accent.
- Generous spacing, rounded corners (not pill-shaped), soft shadows over hard borders.
- Humanist sans for UI. Consider a slightly characterful face for headings only.
- **Real photos of the school and its students** where imagery appears — not stock 3D illustrations, not corporate abstract gradients.
- Microcopy that sounds like a person: "Wala pang bagong announcement" over "No records found."
- Explicitly **not**: purple gradients, glassmorphism, dense enterprise data grids, dark mode as the default.

---

## 2. Decisions to lock before you write a line of code

Six decisions. Every downstream prompt depends on them. Make them consciously.

| # | Decision | My recommendation | Why |
|---|---|---|---|
| **D1** | Is this a real deployment with real student data, or a portfolio/proposal build? | **Decide now, out loud.** | Real data ⇒ RA 10173, MOA with the school, backups, an actual handover plan. Portfolio ⇒ synthetic data, ship faster, no legal surface. The plan below assumes *real, eventually*. |
| **D2** | JavaScript or TypeScript? | **TypeScript.** | You asked for JS. I'd push back on exactly this one. Across dozens of AI-assisted sessions, types are how the model stays consistent with decisions made three weeks ago — they're a machine-checkable contract that a prompt can't quietly violate. This is the highest-leverage change available to you. **If you stay on JS:** use Zod for runtime validation on every API boundary and JSDoc typedefs on every model. Non-negotiable either way. |
| **D3** | Separate Node/Express backend, or Next.js Route Handlers? | **One Next.js app, with a hard-boundaried `src/server/` layer.** | You said "Node backend via API calls." Next.js Route Handlers *are* Node — you get the same API surface with one deploy, one repo, one auth session. Put all business logic in `src/server/services/` and `src/server/repositories/`; make route handlers thin (parse → authorize → call service → serialize). You keep the separation you wanted and can extract to Express later if you ever need to. Two deploys for a 500-student school is cost you don't need. |
| **D4** | Multi-tenant or single-school? | **Single-school, tenant-shaped.** | Build for IRMMHS only. But put a `schoolId` on root records and keep the school profile in the DB rather than in env vars. If another Bocaue school asks for it in 2027, that's a migration, not a rewrite. |
| **D5** | Auth strategy? | **Credentials + role, with Auth.js (NextAuth).** Google sign-in optional for staff. | Students may not have email. Design for admin-provisioned accounts with LRN-based usernames and a forced first-login password change. Do **not** require students to have email addresses. |
| **D6** | JHS only in v1, or JHS + ALS SHS? | **JHS in v1, ALS-compatible schema.** | Ship something the school can use this school year. But don't model "grade level" as a hard enum of 7–10. |

---

## 3. The prompting method

This is the part you asked for. The failure mode you're avoiding — "make me a school management system" and getting 4,000 lines of plausible garbage — is avoided by three habits.

### Habit 1 — The Project Constitution

Create `PROJECT.md` at the repo root. It is short (under 200 lines), it is **pasted or referenced at the start of every session**, and it is the answer to "why did you do it that way?"

If you're using Claude Code, name it `CLAUDE.md` and it gets picked up automatically. If you're using claude.ai, make it a **Project** and put this in the Project Knowledge — then every chat in that Project starts with it loaded. (You already have a "requirements documentation" Project set up; same pattern, new Project.)

<details>
<summary><strong>PROJECT.md starter template — copy this</strong></summary>

```markdown
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
- Tailwind CSS + shadcn/ui
- Auth.js (credentials provider, admin-provisioned accounts)
- Zod at every API boundary
- [TypeScript | JavaScript + JSDoc]  <- fill in your D2 answer

## Conventions
- Folder structure: [paste the tree once Phase 1 establishes it]
- Naming: [fill in]
- Every model gets: schoolYearId, createdAt, updatedAt, createdBy, updatedBy
- Soft delete via `archivedAt`, never hard delete academic records
- API responses: { data, error } — never bare arrays

## Design language
Warm neutrals, school-color accent (from the official logo), rounded, generous
spacing, humanist sans, real photography. NOT: purple gradients, dark-mode
default, dense enterprise grids. Microcopy is warm and human, English with
Filipino where it reads more naturally.

## Out of scope for v1
[Keep this list ruthlessly current. It is the main defence against scope creep.]

## Decision log
[Append every architectural decision here: date, decision, why, alternatives rejected]
```

</details>

### Habit 2 — One vertical slice per prompt

A prompt should produce **one thing that works end to end**, not one layer across many things.

- ❌ "Build all the Mongoose models"
- ✅ "Build the Section model, its repository, its create/list service functions, the POST/GET route handlers, and a minimal admin page to create and list sections. Seed 3 sections."

Because you can *see* a vertical slice working. You cannot see whether twelve models are right until three weeks later.

**Rules of thumb:**
- A prompt touches ≤ 5 files. If it wants more, split it.
- A prompt is done when you can click something and observe the result.
- If you can't state the acceptance criteria in one sentence, the prompt isn't ready.

### Habit 3 — Contracts before implementation

For anything non-trivial, spend one prompt on the *contract* and a separate prompt on the *code*:

1. **Prompt A:** "Design the schema and API contract for X. Output the Mongoose schema, the Zod validators, the endpoint list with request/response shapes, and the open questions. Do not write route handlers or UI yet."
2. **You review it.** This is where you actually catch the mistakes — reviewing a 40-line contract is tractable; reviewing 400 lines of implementation is not.
3. **Prompt B:** "Implement the contract from [paste]. Do not deviate; if something doesn't work, stop and tell me instead of improvising."

This is the difference between the project staying yours and the project becoming something you're archaeologically excavating.

### The prompt template

Use this shape. Every time.

```
CONTEXT
[One or two lines. What exists already. Reference PROJECT.md.]

TASK
[One vertical slice. Concrete. Bounded.]

CONSTRAINTS
- [Follow the conventions in PROJECT.md]
- [Reuse X, don't create a parallel Y]
- [Specific things you know it'll get wrong otherwise]

ACCEPTANCE
[How I'll know it worked. One or two checkable statements.]

OUT OF SCOPE
[The adjacent things it will be tempted to also build. Name them.]
```

The `OUT OF SCOPE` block is the one people skip and the one that does the most work.

### Guardrails — things to never let a prompt do

- Never let it invent DepEd rules. If it doesn't have the real transmutation table or the real SF9 layout, it will make up something plausible. Feed it the real artifact or tell it to stop.
- Never let it hard-code a grading weight, a subject list, a grade level, or a school year.
- Never let it silently refactor files outside the stated scope.
- Never accept "I've also added..." — that's how you get four competing date utilities.
- Never let a grade write bypass the audit log.
- When it says "this is a simplified version for now," that TODO is now yours forever. Either accept it into the decision log explicitly, or reject it.

### Session hygiene

- One phase per chat session, roughly. When the context gets long and the model starts contradicting earlier decisions, that's the signal to start a fresh session — re-paste PROJECT.md and a short "here's where we are."
- End every session by asking: *"Summarize what we built, what decisions we made, and what's still open. Format it as an append to my decision log."* Paste that into `PROJECT.md`. This is the handoff between your sessions.
- Commit at the end of every prompt that works. Small commits are your undo button when a prompt goes sideways.

---

## 4. The phase roadmap

Fifteen phases in four stages. Each phase is 3–8 prompts. Do them in order — the dependency chain is real.

### Stage A — Foundation (get the machine running)

| Phase | Name | Outcome |
|---|---|---|
| **0** | Discovery & decisions | You have the real school data, the real forms, and D1–D6 answered. **No code.** |
| **1** | Repo & toolchain | `npm run dev` works, lint/format/git hooks in place, folder structure established, deployed to Vercel with a "Hello IRMMHS" page. |
| **2** | Config foundation | School profile, School Year, and Grading Period exist as records. Everything downstream can ask "what school year is it?" |
| **3** | Identity & access | Users, roles, permissions, login, protected routes, session. An admin can create a teacher account. |
| **4** | Design system & app shell | Tailwind theme with the school palette, shadcn components installed, the nav shell, the layout patterns. Every later screen is assembly, not invention. |

### Stage B — Core records (who is here)

| Phase | Name | Outcome |
|---|---|---|
| **5** | Learner records | Student profile with LRN, demographics, guardian info. Create, search, view, edit, archive. Excel import. |
| **6** | Personnel records | Teacher/staff profiles, linked to user accounts. Advisory and teaching load. |
| **7** | Academic structure | Subjects, subject groups, curriculum per grade level, sections, section-subject-teacher assignments — all scoped to a school year. |
| **8** | Enrollment & sectioning | Enroll a learner into a school year + grade level + section. Bulk sectioning. Transfer in/out. This is where SF1 becomes possible. |

### Stage C — The academic engine (the actual value)

| Phase | Name | Outcome |
|---|---|---|
| **9** | Grading scheme configuration | Admin can define component weights per subject group, the transmutation table, passing mark, descriptor bands — all as editable data, versioned per school year. |
| **10** | Grade computation engine | A pure, heavily-tested function: raw scores + scheme → initial grade → transmuted grade → descriptor. **This is the highest-risk code in the project. Test it like it matters, because it does.** |
| **11** | Grade entry UX | Teacher's class record: enter WW/PT/QA scores per learner, per quarter. Mobile-first. Offline-tolerant drafts. Excel import/export. Submit-for-approval workflow. |
| **12** | Attendance | Daily/period attendance per section. Mobile-first. Feeds SF2 and the SF9 attendance block. |
| **13** | Report generation | SF9, SF10, SF1, SF2, SF5 as pixel-faithful printable/exportable documents. Print preview. Batch printing per section. |

### Stage D — Operations & growth

| Phase | Name | Outcome |
|---|---|---|
| **14** | Announcements & comms | Post announcements scoped by audience (school-wide, grade level, section). Read receipts. Optionally SMS/Messenger later. |
| **15** | Admin console & hardening | Every config surfaced in a UI. Audit log viewer. Backup/restore. Seed & demo data. School Year rollover. Handover documentation. |
| **16+** | Modern features | Learning materials, assignments, parent portal, analytics dashboards, SMS notifications, QR attendance, biometric integration. **Nothing here until Stage C ships.** |

---

## 5. Phase 0 — Discovery (do this before any code)

No prompts. This is fieldwork. Get answers to these, from actual people at the school:

**From the principal / head teacher:**
1. What is the *exact* official school name DepEd expects on printed forms? (Resolve the Bambang NHS / IRMMHS ambiguity.)
2. Exact School ID, Division, Region, District, and complete address as they appear on official forms.
3. Current enrollment by grade level. Number of sections per grade level. Number of teaching personnel.
4. Is the school under MATATAG curriculum for any grade levels? Which?
5. Is there any appetite for actually adopting this? Who would own it? **If the answer is nobody, build it as a portfolio piece and stop optimizing for handover.**
6. What is the ALS SHS program's relationship to the main school administratively?

**From the registrar:**
7. **Blank copies of every School Form they currently use.** The actual Excel files. This is the single most valuable artifact you can obtain.
8. How do they currently produce SF9 and SF10? Excel? By hand?
9. What is their LIS upload workflow, and when in the year does it happen?
10. Where does learner data live today, and can you get an export?

**From two or three teachers:**
11. Show me how you keep your class record right now. (Watch them do it. Don't ask them to describe it.)
12. What takes the longest at the end of a quarter?
13. Do you encode grades on a phone or a computer? Whose computer?
14. What would make you stop using a new system after one week?

**Assets:**
15. The school logo, in the highest resolution available. School colors. The school hymn/motto if there's one worth putting on the login page.

**Deliverable of Phase 0:** a filled-in `PROJECT.md`, D1–D6 answered, and a folder of real DepEd form templates. Then, and only then, Phase 1.

---

## 6. Phase 1 — Repo & toolchain (copy-paste ready)

Five prompts. Run them in order, in one session, committing after each.

---

### Prompt 1.1 — Scaffold

```
CONTEXT
Starting a new project: a school management system for a Philippine public
high school (~500 students). Solo developer. Will be maintained by
non-technical school staff eventually. See PROJECT.md.

TASK
Give me the exact commands to scaffold a Next.js App Router project named
`irmmhs-sms`, with Tailwind CSS, ESLint, and the src/ directory. Then give me
the folder structure I should create inside src/, with a one-line explanation
of what belongs in each folder.

CONSTRAINTS
- Single Next.js app. No separate Express server.
- Server-side business logic must live in src/server/, structured as
  services/ and repositories/, so route handlers stay thin.
- Assume MongoDB + Mongoose, Auth.js, Zod, shadcn/ui are coming next —
  leave the right holes for them.
- Use [TypeScript | JavaScript]  <- your D2 answer

ACCEPTANCE
I can run the commands, `npm run dev` serves a page, and I have a folder tree
I can commit as the project skeleton.

OUT OF SCOPE
Do not install shadcn, Mongoose, or Auth.js yet. Do not write any models,
routes, or components. Structure only.
```

---

### Prompt 1.2 — Conventions & tooling

```
CONTEXT
Fresh Next.js project scaffolded per Prompt 1.1. Folder structure is:
[paste your tree]

TASK
Set up the code-quality toolchain: Prettier with a Tailwind class-sorting
plugin, ESLint rules appropriate for this project, absolute imports via `@/`,
and Husky + lint-staged so nothing unformatted gets committed. Also give me a
.env.example with every environment variable this project will eventually
need, commented.

CONSTRAINTS
- Config should be strict enough to catch real mistakes, not so strict it
  fights me on every save.
- .env.example should anticipate: Mongo connection, Auth.js secret and URL,
  and a placeholder for file storage.

ACCEPTANCE
`npm run lint` and `npm run format` both work. A deliberately badly-formatted
file gets fixed on commit.

OUT OF SCOPE
Testing setup — that's the next prompt. No application code.
```

---

### Prompt 1.3 — Database connection

```
CONTEXT
Next.js App Router project with the toolchain from 1.2 in place.

TASK
Set up the MongoDB connection layer:
1. A connection helper at src/server/db/connect.js that caches the connection
   across hot reloads (the standard Next.js dev-mode global pattern) so I
   don't exhaust the Atlas connection pool.
2. A base schema options object that every model will spread in: timestamps,
   and a toJSON transform that renames _id to id and strips __v.
3. A health-check route handler at /api/health that pings the DB and returns
   { data: { status, dbConnected } }.

CONSTRAINTS
- Mongoose. Connection string from process.env.MONGODB_URI.
- API responses everywhere in this project use the shape { data, error }.
  Establish that here with a small helper.
- Explain the hot-reload caching pattern in a comment — I want to understand
  it, not just have it.

ACCEPTANCE
With a valid Atlas URI in .env.local, GET /api/health returns dbConnected: true,
and hitting save repeatedly in dev doesn't spawn new connections.

OUT OF SCOPE
No models. No auth. No UI.
```

---

### Prompt 1.4 — Testing setup

```
CONTEXT
Project with DB connection working. The riskiest code in this project will be
the DepEd grade computation engine (weighted components -> initial grade ->
transmutation -> descriptor). It needs real test coverage.

TASK
Set up Vitest for unit testing. Configure it for this Next.js project, add
npm scripts (test, test:watch, test:coverage), and write one trivial example
test so I can confirm the harness works.

CONSTRAINTS
- Vitest, not Jest — better ESM and Next.js compatibility here.
- Keep it minimal. I want unit tests on pure business logic (the grading
  engine, validators, date/term helpers), not component or E2E tests.

ACCEPTANCE
`npm test` runs and passes.

OUT OF SCOPE
Component testing, Playwright, CI configuration.
```

---

### Prompt 1.5 — Deploy the skeleton

```
CONTEXT
Working local project with health check and tests.

TASK
Walk me through deploying this to Vercel and connecting MongoDB Atlas:
Atlas cluster creation (free tier), database user, network access
configuration for Vercel, and which environment variables to set in the
Vercel dashboard. Then tell me exactly how to verify the deployment is
actually talking to the database.

CONSTRAINTS
- Free/cheap tiers throughout — this school has almost no budget.
- Call out the Atlas network-access setting that catches everyone.
- Note anything about the free tier that will become a problem at ~500
  students with several years of history, so I know when to plan for it.

ACCEPTANCE
The deployed /api/health returns dbConnected: true.

OUT OF SCOPE
Custom domain, CI/CD pipelines, staging environments.
```

**End of Phase 1.** Commit. Then run the session-summary prompt and append the result to `PROJECT.md`.

---

## 7. Phase 2 — Config foundation (prompt outline)

The first phase that touches the domain. This is where your configurability requirement is either established or lost.

- **2.1** — *Contract prompt.* Design the schema for `School`, `SchoolYear`, and `GradingPeriod`. Output schemas, Zod validators, endpoint list, and open questions. **No implementation.** Review this yourself carefully — it constrains everything after it.
- **2.2** — Implement the models, repositories, and services from the 2.1 contract.
- **2.3** — Route handlers for school-year CRUD + "set active school year," with role checks stubbed as a TODO.
- **2.4** — A `getActiveSchoolYear()` server helper and a `useSchoolYear()` client hook. Establish the pattern that *every* subsequent query is school-year-scoped.
- **2.5** — Seed script: create IRMMHS with real data from Phase 0, plus SY 2025–2026 with four quarters.
- **2.6** — A bare admin page listing school years with an "activate" action. Ugly is fine — Phase 4 makes it pretty.

**Acceptance for the whole phase:** you can create a school year, activate it, and any server code can ask "what school year is it right now?" and get an answer.

---

## 8. Phases 3–16 (prompt titles)

Expand each phase into full prompts when you get to it — writing all of them now would be guessing at decisions you haven't made yet.

<details>
<summary><strong>Phase 3 — Identity & access</strong></summary>

3.1 Contract: User, Role, Permission schema + the permission taxonomy · 3.2 Implement models & services · 3.3 Auth.js credentials provider + session · 3.4 Middleware for route protection · 3.5 `requirePermission()` server helper · 3.6 Login page (functional, unstyled) · 3.7 Admin: create/deactivate user, assign role · 3.8 Forced password change on first login
</details>

<details>
<summary><strong>Phase 4 — Design system & app shell</strong></summary>

4.1 Tailwind theme from the school palette (from the real logo) · 4.2 Install shadcn + configure the base component set · 4.3 App shell: sidebar/nav, role-aware menu, mobile drawer · 4.4 Page-layout primitives (PageHeader, DataCard, EmptyState, LoadingState) · 4.5 Form primitives wired to react-hook-form + Zod · 4.6 Toast/confirm patterns · 4.7 Restyle the login page — the first screen anyone sees, make it feel like the school
</details>

<details>
<summary><strong>Phase 5 — Learner records</strong></summary>

5.1 Contract: Learner schema (LRN validation, guardians, address, DepEd-required fields) · 5.2 Implement · 5.3 List with search/filter/pagination · 5.4 Create & edit forms · 5.5 Profile view · 5.6 Archive/restore (never hard delete) · 5.7 Excel import with row-level validation and an error report
</details>

<details>
<summary><strong>Phase 6 — Personnel records</strong></summary>

6.1 Contract: Personnel schema, link to User · 6.2 Implement + CRUD · 6.3 Teaching load & advisory views
</details>

<details>
<summary><strong>Phase 7 — Academic structure</strong></summary>

7.1 Contract: Subject, SubjectGroup, Curriculum, Section, ClassOffering — all SY-scoped · 7.2 Implement · 7.3 Subject & subject-group admin · 7.4 Curriculum builder (subject load per grade level) · 7.5 Section management + adviser assignment · 7.6 Class offering: assign teacher to section+subject · 7.7 Conflict detection (double-booked teacher)
</details>

<details>
<summary><strong>Phase 8 — Enrollment & sectioning</strong></summary>

8.1 Contract: Enrollment schema (learner + SY + grade level + section + status) · 8.2 Implement · 8.3 Single enrollment flow · 8.4 Bulk enroll & auto-section · 8.5 Transfer in / transfer out / drop with status history · 8.6 Enrollment dashboard by grade level and section
</details>

<details>
<summary><strong>Phase 9 — Grading scheme configuration</strong></summary>

9.1 Contract: GradingScheme, ComponentWeight, TransmutationTable, DescriptorBand — versioned per SY · 9.2 Implement · 9.3 Admin UI: weights per subject group with a validation that they sum to 100 · 9.4 Transmutation table editor + import · 9.5 Descriptor band editor · 9.6 Seed with the current DepEd defaults
</details>

<details>
<summary><strong>Phase 10 — Grade computation engine</strong> ⚠️ highest risk</summary>

10.1 Contract: the pure computation function signature and every edge case (missing scores, zero total, incomplete quarter, rounding rules) · 10.2 Implement as a pure function with zero DB access · 10.3 **Exhaustive test suite** — hand-compute a dozen cases from real DepEd examples and assert against them · 10.4 Grade record schema *with embedded scheme snapshot* · 10.5 Final-grade and general-average computation · 10.6 Promotion/retention determination
</details>

<details>
<summary><strong>Phase 11 — Grade entry UX</strong></summary>

11.1 Class record data contract · 11.2 Mobile-first grade-entry grid · 11.3 Local draft persistence + explicit save + visible sync status · 11.4 Live computed-grade preview as scores are entered · 11.5 Excel export of the class record template · 11.6 Excel import back into the class record · 11.7 Submit-for-approval workflow + lock on approval · 11.8 Audit log on every grade write
</details>

<details>
<summary><strong>Phase 12 — Attendance</strong></summary>

12.1 Contract: Attendance schema, daily vs per-period · 12.2 Implement · 12.3 Mobile-first attendance taking · 12.4 Monthly summary per section · 12.5 Absence-pattern flagging
</details>

<details>
<summary><strong>Phase 13 — Report generation</strong></summary>

13.1 Print/PDF strategy decision · 13.2 SF9 Report Card — pixel-faithful to the real template · 13.3 SF10 Permanent Record · 13.4 SF1 School Register · 13.5 SF2 Daily Attendance · 13.6 SF5 Report on Promotion · 13.7 Batch print per section · 13.8 LIS-compatible export
</details>

<details>
<summary><strong>Phase 14 — Announcements & comms</strong></summary>

14.1 Contract: Announcement, audience scoping, categories · 14.2 Implement · 14.3 Compose with rich text + attachments · 14.4 Audience-filtered feed · 14.5 Read tracking · 14.6 Notification preferences
</details>

<details>
<summary><strong>Phase 15 — Admin console & hardening</strong></summary>

15.1 Unified settings console surfacing every config · 15.2 Audit log viewer with filters · 15.3 Module toggles (feature flags as data) · 15.4 Backup/export of all school data · 15.5 **School Year rollover** — the feature that proves your SY-scoping was right · 15.6 Demo/seed data generator · 15.7 Handover documentation for school staff · 15.8 Privacy notice, consent capture, retention policy
</details>

---

## 9. How to know it's going well

Four checkpoints. If you fail one, stop and fix it before proceeding.

1. **End of Phase 2:** Ask yourself "what happens in June when the new school year starts?" If the answer isn't "click one button," the SY scoping is wrong. Fix it now — it costs a day now and a rewrite later.
2. **End of Phase 10:** Hand-compute five report cards from real DepEd examples. If the engine disagrees with the hand computation by even one point, the project has no value. Everything else is UI around this number.
3. **End of Phase 11:** Give it to one actual teacher with one actual class, on their actual phone, on school Wi-Fi. Watch silently. Don't help. Whatever they struggle with is the real backlog.
4. **End of Phase 13:** Print an SF9 and put it next to a real one. If a registrar can tell them apart at a glance, it isn't done.

---

## 10. Your immediate next three moves

1. **Answer D1–D6.** Especially D1 (real deployment vs. portfolio) and D2 (TypeScript vs. JavaScript). Everything branches off these.
2. **Do Phase 0 fieldwork.** Message the school's Facebook page or go in person. The blank School Form templates are the highest-value thing you can walk out with.
3. **Write PROJECT.md** from the template in §3, then run Prompt 1.1.

Come back when you've done Phase 0 and we'll write the Phase 2 contract prompt against your real school data instead of my assumptions.
