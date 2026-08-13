import { describe, expect, it } from 'vitest';

import { fail, ok } from './apiResponse';

describe('apiResponse', () => {
  it('ok() wraps data with a null error', () => {
    expect(ok({ hello: 'world' })).toEqual({ data: { hello: 'world' }, error: null });
  });

  it('fail() wraps a message with null data', () => {
    expect(fail('nope', 'SOME_CODE')).toEqual({
      data: null,
      error: { message: 'nope', code: 'SOME_CODE' },
    });
  });
});
