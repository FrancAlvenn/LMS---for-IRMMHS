import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { connect } from '@/server/db/connect';
import { fail, ok } from '@/server/lib/apiResponse';
import { HttpError } from '@/server/lib/errors';

/**
 * Every route handler in this project wraps its body in this: connects to
 * the DB, runs the handler, and turns whatever comes out into the
 * { data, error } shape with the right HTTP status. Keeps individual route
 * files down to parse -> authorize -> call service -> serialize, with no
 * repeated try/catch boilerplate. See CLAUDE.md conventions.
 */
export async function handleRoute<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    await connect();
    const data = await fn();
    return NextResponse.json(ok(data));
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((issue) => issue.message).join('; ');
      return NextResponse.json(fail(message, 'VALIDATION_ERROR'), { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json(fail(err.message, err.code), { status: err.status });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json(fail(message, 'INTERNAL_ERROR'), { status: 500 });
  }
}
