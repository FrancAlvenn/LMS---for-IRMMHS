import { describe, expect, it } from 'vitest';

import { changePasswordSchema, userCreateSchema, userUpdateSchema } from './user';

describe('userCreateSchema', () => {
  const valid = {
    username: 'jdoe',
    displayName: 'Juan Dela Cruz',
    password: 'a-decent-length-password',
    roleId: '507f1f77bcf86cd799439011',
  };

  it('accepts a well-formed create input', () => {
    expect(userCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(userCreateSchema.safeParse({ ...valid, password: 'short1' }).success).toBe(false);
  });

  it('does not require complexity (uppercase/number/symbol) — length only, per NIST 800-63B', () => {
    expect(userCreateSchema.safeParse({ ...valid, password: 'alllowercase' }).success).toBe(true);
  });

  it('email is optional — students may not have one', () => {
    expect(userCreateSchema.safeParse(valid).success).toBe(true);
  });
});

describe('userUpdateSchema', () => {
  it('every field is optional — PATCH semantics', () => {
    expect(userUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('does not accept status or password — those go through action endpoints', () => {
    const parsed = userUpdateSchema.parse({ displayName: 'New Name', status: 'disabled' });
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('password');
  });
});

describe('changePasswordSchema', () => {
  it('does not require currentPassword — see contract §6#2', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'a-new-password' });
    expect(result.success).toBe(true);
  });
});
