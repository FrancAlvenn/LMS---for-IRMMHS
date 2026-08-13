import { describe, expect, it } from 'vitest';

import { schoolInputSchema } from './school';

describe('schoolInputSchema', () => {
  const valid = {
    depedSchoolId: '306715',
    name: 'IRMMHS',
    officialName: null,
    address: {
      barangay: 'Sulucan',
      municipality: 'Bocaue',
      province: 'Bulacan',
      region: 'Region III (Central Luzon)',
    },
    division: 'Bulacan',
    principalName: 'Romhel C. Odtohan',
    principalTitle: 'Principal II',
    logoUrl: null,
  };

  it('accepts a well-formed school profile', () => {
    expect(schoolInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-numeric depedSchoolId', () => {
    expect(schoolInputSchema.safeParse({ ...valid, depedSchoolId: 'BNHS-306715' }).success).toBe(
      false,
    );
  });

  it('rejects an address missing a required field', () => {
    const addressWithoutRegion: Partial<typeof valid.address> = { ...valid.address };
    delete addressWithoutRegion.region;
    const result = schoolInputSchema.safeParse({ ...valid, address: addressWithoutRegion });
    expect(result.success).toBe(false);
  });

  it('accepts officialName and logoUrl as explicitly null (Phase 0 not done yet)', () => {
    const result = schoolInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
