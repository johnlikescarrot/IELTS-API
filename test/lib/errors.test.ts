import { describe, expect, it } from 'vitest';

import {
  HttpError,
  badRequest,
  methodNotAllowed,
  notAcceptable,
  notFound,
  unprocessable,
} from '../../src/lib/errors.js';

describe('HttpError', () => {
  it('carries status, code, message and details', () => {
    const error = new HttpError(418, 'teapot', 'I am a teapot', { brew: 'tea' });
    expect(error.status).toBe(418);
    expect(error.code).toBe('teapot');
    expect(error.message).toBe('I am a teapot');
    expect(error.details).toEqual({ brew: 'tea' });
    expect(error.name).toBe('HttpError');
    expect(error instanceof Error).toBe(true);
  });

  it('defaults details to an empty object', () => {
    expect(new HttpError(500, 'boom', 'Boom').details).toEqual({});
  });
});

describe('error factories', () => {
  it('builds bad request errors', () => {
    const error = badRequest('bad', { field: 'limit' });
    expect(error.status).toBe(400);
    expect(error.code).toBe('bad_request');
    expect(error.details).toEqual({ field: 'limit' });
  });

  it('builds not found errors', () => {
    const error = notFound('missing');
    expect(error.status).toBe(404);
    expect(error.code).toBe('not_found');
  });

  it('builds method not allowed errors', () => {
    const error = methodNotAllowed();
    expect(error.status).toBe(405);
    expect(error.details.allow).toBe('GET, HEAD, OPTIONS, POST');
    expect(methodNotAllowed('nope', 'GET').details.allow).toBe('GET');
    expect(methodNotAllowed('nope').message).toBe('nope');
  });

  it('builds not acceptable errors', () => {
    const error = notAcceptable('only json');
    expect(error.status).toBe(406);
    expect(error.code).toBe('not_acceptable');
  });

  it('builds unprocessable entity errors', () => {
    const error = unprocessable('nope', { a: 'b' });
    expect(error.status).toBe(422);
    expect(error.code).toBe('unprocessable_entity');
  });
});
