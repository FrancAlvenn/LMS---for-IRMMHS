/**
 * Services throw these; src/server/lib/routeHandler.ts catches them and
 * maps status + code onto the { data, error } response shape. Keeps HTTP
 * concerns out of the service layer while still letting a service say
 * "this is a 404" vs "this is a 409" vs "this is unexpected."
 */
export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, 'CONFLICT', message);
  }
}

export class InvalidTransitionError extends HttpError {
  constructor(message: string) {
    super(409, 'INVALID_TRANSITION', message);
  }
}
