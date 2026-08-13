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

export class UnauthorizedError extends HttpError {
  constructor(message = 'You must be signed in to do that.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You don't have permission to do that.") {
    super(403, 'FORBIDDEN', message);
  }
}

/**
 * Thrown by TenantScopedRepository (src/server/tenancy/tenantScopedRepository.ts)
 * when a method is called without a tenantId. 500, not 400 — this signals a
 * route handler that failed to resolve a tenant before calling a service,
 * not a client mistake. See docs/contracts/phase-2.1-tenancy-foundation.md §2.5.
 */
export class TenantRequiredError extends HttpError {
  constructor() {
    super(500, 'TENANT_REQUIRED', 'A repository method was called without a tenantId.');
  }
}
