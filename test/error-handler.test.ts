import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply } from 'fastify';
import { ValidationError } from '../src/services/validation.js';
import { errorHandler, handleError } from '../src/routes/error-handler.js';
import type { ErrorReply } from '../src/routes/error-handler.js';

function makeReply(): ErrorReply & { statusCode: number; payload: unknown } {
  const reply = {
    statusCode: 0,
    payload: undefined as unknown,
    code(this: { statusCode: number }, statusCode: number) {
      this.statusCode = statusCode;
      return this as unknown as ErrorReply;
    },
    send(this: { payload: unknown }, payload: unknown) {
      this.payload = payload;
      return this as unknown as ErrorReply;
    },
  };
  return reply;
}

describe('handleError', () => {
  it('returns a 400 for a ValidationError', () => {
    const reply = makeReply();
    const err = new ValidationError('nope');
    handleError(err, reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'nope' } });
  });

  it('returns a generic 500 for an unexpected error', () => {
    const reply = makeReply();
    handleError(new Error('boom'), reply);
    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' },
    });
  });
});

describe('errorHandler', () => {
  it('does not log expected validation errors', () => {
    const log = { error: vi.fn() };
    const handler = errorHandler({ log } as never);
    const reply = makeReply();
    handler(new ValidationError('bad'), undefined, reply as never as FastifyReply);
    expect(log.error).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(400);
  });

  it('logs unexpected errors before returning a 500', () => {
    const log = { error: vi.fn() };
    const handler = errorHandler({ log } as never);
    const reply = makeReply();
    handler(new Error('boom'), undefined, reply as never as FastifyReply);
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(reply.statusCode).toBe(500);
  });
});
