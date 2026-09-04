/**
 * A typed error that carries an HTTP status code and a stable error code
 * string so clients can handle failures programmatically.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Build a 400 "bad_request" error. */
export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, "bad_request", message, details);
}

/** Build a 404 "not_found" error. */
export function notFound(message = "The requested resource was not found."): ApiError {
  return new ApiError(404, "not_found", message);
}

/** Build a 405 "method_not_allowed" error. */
export function methodNotAllowed(message = "That HTTP method is not allowed here."): ApiError {
  return new ApiError(405, "method_not_allowed", message);
}

/** Build a 500 "internal_error" error. */
export function internalError(message = "An unexpected internal error occurred."): ApiError {
  return new ApiError(500, "internal_error", message);
}

/** True when {@link error} is (or wraps) an {@link ApiError}. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
