/**
 * Every API route in this project responds with this shape — never a bare
 * array, never a bare object. { data, error } is a small, boring contract
 * that the client can always destructure the same way. See CLAUDE.md.
 */

export type ApiError = {
  message: string;
  code?: string;
};

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function fail(message: string, code?: string): ApiFailure {
  return { data: null, error: { message, code } };
}
