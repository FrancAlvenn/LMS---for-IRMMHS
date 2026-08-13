/**
 * Seed script (playbook Prompt 2.5): IRMMHS profile + the current school
 * year with its 4 quarters. Idempotent — safe to re-run; it skips
 * anything that already exists instead of erroring or duplicating.
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
 */
import { disconnect } from '@/server/db/connect';
import { createSchool, getSchool } from '@/server/services/school.service';
import {
  activateSchoolYear,
  createSchoolYearWithPeriods,
  findSchoolYearByLabel,
} from '@/server/services/schoolYear.service';

async function main() {
  console.log('Seeding IRMMHS SMS...\n');

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

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
