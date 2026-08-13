/**
 * Every API route in this project responds with this shape — never a bare
 * array, never a bare object. { data, error } is a small, boring contract
 * that the client can always destructure the same way. See CLAUDE.md.
 *
 * The types themselves live in src/types/api.ts (shared with client code);
 * re-exported here so existing server-side imports don't need to change.
 */
import type { ApiError, ApiFailure, ApiResponse, ApiSuccess } from '@/types/api';

export type { ApiError, ApiFailure, ApiResponse, ApiSuccess };

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function fail(message: string, code?: string): ApiFailure {
  return { data: null, error: { message, code } };
}
