import type { FastifyBaseLogger, FastifyReply } from 'fastify';
import { ValidationError } from '../services/validation.js';

/**
 * A minimal reply surface used so the handler can be unit-tested without a
 * running server. `FastifyReply` is structurally compatible.
 */
export interface ErrorReply {
  code(statusCode: number): ErrorReply;
  send(payload: unknown): ErrorReply;
}

/**
 * Map thrown errors to HTTP responses. Validation failures become 400; any
 * unexpected error is logged by the caller and returns a generic 500.
 */
export function handleError(error: unknown, reply: ErrorReply): ErrorReply {
  if (error instanceof ValidationError) {
    return reply.code(400).send({ error: { code: error.code, message: error.message } });
  }
  return reply.code(500).send({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' },
  });
}

/**
 * Build a fastify error handler bound to the instance's logger.
 */
export function errorHandler(app: {
  log: FastifyBaseLogger;
}): (error: unknown, _request: unknown, reply: FastifyReply) => void {
  return (error, _request, reply) => {
    if (!(error instanceof ValidationError)) {
      app.log.error(error);
    }
    handleError(error, reply);
  };
}
