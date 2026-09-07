/**
 * Error types used across the API.
 *
 * All errors raised while handling a request are `HttpError`s so that the
 * router can turn them into a consistent JSON problem response.
 */

/** An error that maps directly onto an HTTP status code. */
export class HttpError extends Error {
  /** HTTP status code to return. */
  public readonly status: number;
  /** Machine-readable error code. */
  public readonly code: string;
  /** Extra details shown alongside the message. */
  public readonly details: Record<string, string>;

  public constructor(status: number, code: string, message: string, details: Record<string, string> = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Create a `400 Bad Request` error. */
export function badRequest(message: string, details: Record<string, string> = {}): HttpError {
  return new HttpError(400, 'bad_request', message, details);
}

/** Create a `404 Not Found` error. */
export function notFound(message: string, details: Record<string, string> = {}): HttpError {
  return new HttpError(404, 'not_found', message, details);
}

/** Create a `405 Method Not Allowed` error. */
export function methodNotAllowed(message = 'Only GET requests are supported.', allow = 'GET'): HttpError {
  return new HttpError(405, 'method_not_allowed', message, { allow });
}

/** Create a `406 Not Acceptable` error. */
export function notAcceptable(message: string): HttpError {
  return new HttpError(406, 'not_acceptable', message);
}

/** Create a `422 Unprocessable Entity` error. */
export function unprocessable(message: string, details: Record<string, string> = {}): HttpError {
  return new HttpError(422, 'unprocessable_entity', message, details);
}
