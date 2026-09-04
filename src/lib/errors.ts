/**
 * Typed application errors that map onto the JSON error envelope.
 */

export type ErrorDetails = Readonly<Record<string, unknown>>;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(404, 'not_found', `${resource} not found: ${identifier}`);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details?: ErrorDetails) {
    super(400, 'validation_error', message, details);
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(500, 'config_error', message, details);
  }
}
