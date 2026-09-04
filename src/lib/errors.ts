/** Details attached to validation errors so clients can fix their requests. */
export interface ErrorDetail {
  param: string;
  message: string;
}

/** Body shape returned for every error response. */
export interface ErrorBody {
  error: {
    status: number;
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * An error that maps cleanly onto an HTTP response.
 * Thrown by route handlers and validation helpers.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: readonly ErrorDetail[];

  constructor(status: number, code: string, message: string, details: readonly ErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Build the JSON error payload for an {@link ApiError}. */
export function errorPayload(error: ApiError): ErrorBody {
  const base = {
    error: {
      status: error.status,
      code: error.code,
      message: error.message,
    },
  };
  if (error.details.length === 0) {
    return base;
  }
  return { error: { ...base.error, details: [...error.details] } };
}
