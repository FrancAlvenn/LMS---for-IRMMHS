/**
 * Seed script (playbook Prompt 2.5, extended by v2 Phase 2.3/2.7): IRMMHS
 * profile + the current school year with its 4 quarters, plus (new) the
 * two platform tenants. Idempotent — safe to re-run; it skips anything
 * that already exists instead of erroring or duplicating.
 *
 * Run with: npm run seed
 * (invokes `tsx --env-file=.env.local scripts/seed.ts` — .env.local must
 * have a real MONGODB_URI. See .env.example.)
 *
 * ⚠️ The school profile fields below are the "What I found about the
 * school" hypothesis from playbook §0 — public web sources, NOT confirmed
 * by the principal/registrar. officialName and logoUrl are deliberately
 * null until Phase 0 fieldwork replaces this with the real thing. Same
 * status as the design tokens' UNVERIFIED PALETTE — a starting point, not
 * a fact.
 *
 * The school year below is SY 2026-2027, not the "SY 2025-2026" the
 * playbook's Phase 2 text illustrates — because by this repo's actual
 * build date (2026-08-13), SY 2025-2026 has already ended and 2026-2027
 * is the one actually in progress. Quarter dates are placeholders
 * (evenly-spaced guesses), not the real DepEd school calendar.
 *
 * Phase 3 addition: also seeds the "Admin" system role and one admin user
 * (username "admin"). The admin's password is randomly generated and
 * printed ONCE, only on the run that creates it — there is no default
 * password anywhere in this repo. mustChangePassword is true, so it must
 * be changed on first login regardless.
 *
 * v2 platform pivot addition (Phase 2.3/2.7): seeds two `Tenant` platform
 * records — IRMMHS (tenant A, the reference school this repo is built
 * for) and a fictional "Meridian International School" (tenant C from
 * the playbook's reference table: trimesters, 4.0 GPA, no LRN, no DepEd
 * forms, pass mark 50 — chosen over tenant B per contract §4 open
 * question #5, since it's the reference school most likely to expose
 * hard-coded assumptions early). Per Habit 4, this is now the permanent
 * two-tenant development setup future phases build against.
 *
 * IMPORTANT — nothing below this point is tenant-scoped yet. `School`,
 * `SchoolYear`, `GradingPeriod`, `User`, and `Role` are still the
 * pre-pivot, single-tenant models (v2 Phase 3 and Phase 4 rebuild them).
 * The two tenants seeded here exist as platform records only; nothing
 * links IRMMHS's `School` document to the IRMMHS `Tenant` document yet.
 */
import { randomBytes } from 'node:crypto';

import { disconnect } from '@/server/db/connect';
import { createSchool, getSchool } from '@/server/services/school.service';
import {
  activateSchoolYear,
  createSchoolYearWithPeriods,
  findSchoolYearByLabel,
} from '@/server/services/schoolYear.service';
import { ensureAdminRole } from '@/server/services/role.service';
import { ensureActiveTenant } from '@/server/services/tenant.service';
import { changeOwnPassword, createUser, findUserByUsername } from '@/server/services/user.service';

async function main() {
  console.log('Seeding IRMMHS SMS...\n');

  const irmmhsTenant = await ensureActiveTenant(
    {
      slug: 'irmmhs',
      displayName: 'IRMMHS',
      officialName: null, // Phase 0: confirm the exact DepEd-register string
      locale: 'en-PH',
      timezone: 'Asia/Manila',
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      externalIds: { depedSchoolId: '306715' },
    },
    null,
  );
  console.log(`- Tenant "${irmmhsTenant.slug}" ready (${irmmhsTenant.displayName}).`);

  const meridianTenant = await ensureActiveTenant(
    {
      slug: 'meridian-intl',
      displayName: 'Meridian International School',
      officialName: 'Meridian International School',
      locale: 'en',
      // Fictional — deliberately not Asia/Manila, since the whole point of
      // this tenant is to be the reference school least like IRMMHS.
      timezone: 'UTC',
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      externalIds: {}, // no LRN, no DepEd forms — nothing DepEd-shaped to record
    },
    null,
  );
  console.log(`- Tenant "${meridianTenant.slug}" ready (${meridianTenant.displayName}).`);

  let school = await getSchool();
  if (school) {
    console.log(`- School profile already exists (${school.name}), skipping.`);
  } else {
    school = await createSchool({
      depedSchoolId: '306715',
      name: 'Iluminada Roxas-Mendoza Memorial High School',
      officialName: null, // Phase 0: confirm the exact DepEd-register string
      address: {
        barangay: 'Sulucan',
        municipality: 'Bocaue',
        province: 'Bulacan',
        region: 'Region III (Central Luzon)',
      },
      division: 'Bulacan',
      principalName: 'Romhel C. Odtohan',
      principalTitle: 'Principal II',
      logoUrl: null, // Phase 0: obtain the real logo, sample the palette from it
    });
    console.log(`- Created school profile: ${school.name} (DepEd ID ${school.depedSchoolId})`);
  }

  const label = '2026-2027';
  let schoolYear = await findSchoolYearByLabel(label);
  if (schoolYear) {
    console.log(`- School year ${label} already exists, skipping creation.`);
  } else {
    const { schoolYear: created, gradingPeriods } = await createSchoolYearWithPeriods(
      {
        label,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-03-31'),
      },
      [
        {
          sequence: 1,
          label: 'Quarter 1',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-08-15'),
        },
        {
          sequence: 2,
          label: 'Quarter 2',
          startDate: new Date('2026-08-16'),
          endDate: new Date('2026-10-31'),
        },
        {
          sequence: 3,
          label: 'Quarter 3',
          startDate: new Date('2026-11-01'),
          endDate: new Date('2027-01-31'),
        },
        {
          sequence: 4,
          label: 'Quarter 4',
          startDate: new Date('2027-02-01'),
          endDate: new Date('2027-03-31'),
        },
      ],
      null, // no auth yet — see src/server/lib/session.ts
    );
    schoolYear = created;
    console.log(
      `- Created school year ${schoolYear.label} with ${gradingPeriods.length} quarters.`,
    );
  }

  if (schoolYear.status !== 'active') {
    await activateSchoolYear(schoolYear.id, null);
    console.log(`- Activated school year ${schoolYear.label}.`);
  } else {
    console.log(`- School year ${schoolYear.label} is already active.`);
  }

  const adminRole = await ensureAdminRole();
  console.log(`- Admin role ready (${adminRole.permissions.length} permissions).`);

  const adminUsername = 'admin';
  const existingAdmin = await findUserByUsername(adminUsername);
  if (existingAdmin) {
    console.log(`- Admin user "${adminUsername}" already exists, skipping.`);
  } else {
    const temporaryPassword = randomBytes(9).toString('base64url');
    const admin = await createUser(
      {
        username: adminUsername,
        displayName: 'Admin',
        password: temporaryPassword,
        roleId: adminRole.id,
      },
      null,
    );
    console.log(`- Created admin user "${admin.username}".`);
    console.log(`\n  TEMPORARY PASSWORD (shown once): ${temporaryPassword}\n`);
    console.log('  You will be forced to change it on first login.');
  }

  // Dev/test-only fixture — see .env.example. The real admin's password
  // is random and shown once, so the E2E suite needs its own account
  // with a known, fixed password. mustChangePassword is flipped to false
  // immediately: this user's purpose is testing *other* flows, not the
  // forced-change flow (the real admin already covers that manually).
  const e2ePassword = process.env.E2E_TEST_PASSWORD;
  if (e2ePassword) {
    const e2eUsername = 'e2e-test';
    const existingE2EUser = await findUserByUsername(e2eUsername);
    if (existingE2EUser) {
      console.log(`- E2E test user "${e2eUsername}" already exists, skipping.`);
    } else {
      const e2eUser = await createUser(
        {
          username: e2eUsername,
          displayName: 'E2E Test',
          password: e2ePassword,
          roleId: adminRole.id,
        },
        null,
      );
      await changeOwnPassword(e2eUser.id, { newPassword: e2ePassword });
      console.log(
        `- Created E2E test user "${e2eUser.username}" (password from env, not printed).`,
      );
    }
  } else {
    console.log('- E2E_TEST_PASSWORD not set, skipping E2E test user (its spec will skip itself).');
  }

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
