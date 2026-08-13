import { describe, expect, it } from 'vitest';

import { roleInputSchema, roleUpdateSchema } from './role';

describe('roleInputSchema', () => {
  it('accepts a well-formed role', () => {
    const result = roleInputSchema.safeParse({
      name: 'Registrar',
      permissions: ['school-year:read', 'grading-period:read'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a permission outside the known taxonomy', () => {
    const result = roleInputSchema.safeParse({
      name: 'Registrar',
      permissions: ['not-a-real-permission'],
    });
    expect(result.success).toBe(false);
  });

  it('does not accept isSystem — only the seed script can create a system role', () => {
    const parsed = roleInputSchema.parse({
      name: 'Registrar',
      permissions: [],
      isSystem: true,
    });
    expect(parsed).not.toHaveProperty('isSystem');
  });
});

describe('roleUpdateSchema', () => {
  it('every field is optional — PATCH semantics', () => {
    expect(roleUpdateSchema.safeParse({}).success).toBe(true);
  });
});
