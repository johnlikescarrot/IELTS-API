import { describe, expect, it, vi } from 'vitest';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { createErrorHandler } from '../../src/app.js';
import { NotFoundError, ValidationError } from '../../src/lib/errors.js';

function makeContext(): {
  request: FastifyRequest;
  reply: FastifyReply;
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn();
  const code = vi.fn(() => ({ send }));
  const logError = vi.fn();
  const request = { id: 'req-42', log: { error: logError } } as unknown as FastifyRequest;
  const reply = { code } as unknown as FastifyReply;
  return { request, reply, code, send, logError };
}

describe('createErrorHandler', () => {
  it('maps AppErrors with details onto the error envelope', () => {
    const { request, reply, code, send, logError } = makeContext();
    const error = new ValidationError('Bad query', {
      issues: [{ path: 'q', message: 'required' }]
    });
    createErrorHandler()(error as FastifyError, request, reply);
    expect(code).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: {
        code: 'validation_error',
        message: 'Bad query',
        details: { issues: [{ path: 'q', message: 'required' }] }
      },
      requestId: 'req-42'
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('omits the details key when the AppError has none', () => {
    const { request, reply, send } = makeContext();
    createErrorHandler()(new NotFoundError('Word', 'zzz') as FastifyError, request, reply);
    const payload = send.mock.calls[0]?.[0] as { error: Record<string, unknown> };
    expect(payload.error.code).toBe('not_found');
    expect('details' in payload.error).toBe(false);
  });

  it('maps Fastify errors (with statusCode) to request_error and keeps their message', () => {
    const { request, reply, code, send } = makeContext();
    const error = { statusCode: 400, message: 'Body cannot be empty' } as FastifyError;
    createErrorHandler()(error, request, reply);
    expect(code).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'request_error', message: 'Body cannot be empty' },
      requestId: 'req-42'
    });
  });

  it('maps unknown errors to a masked 500 internal_error', () => {
    const { request, reply, code, send } = makeContext();
    createErrorHandler()(new Error('secret database password leaked'), request, reply);
    expect(code).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'internal_error', message: 'Internal server error' },
      requestId: 'req-42'
    });
  });

  it('treats errors without a numeric statusCode as 500', () => {
    const { request, reply, code } = makeContext();
    const error = { message: 'weird' } as unknown as FastifyError;
    createErrorHandler()(error, request, reply);
    expect(code).toHaveBeenCalledWith(500);
  });
});
