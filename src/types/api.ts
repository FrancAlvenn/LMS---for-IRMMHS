/**
 * The { data, error } response shape every API route uses (see
 * src/server/lib/apiResponse.ts). Lives in src/types/, not src/server/,
 * because client code (hooks, components) needs the type without ever
 * importing from the server-only layer.
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
