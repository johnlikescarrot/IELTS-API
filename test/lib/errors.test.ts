import { describe, expect, it } from 'vitest';
import { AppError, ConfigError, NotFoundError, ValidationError } from '../../src/lib/errors.js';

describe('AppError', () => {
  it('stores status code, code and message', () => {
    const error = new AppError(418, 'teapot', 'I am a teapot');
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('teapot');
    expect(error.message).toBe('I am a teapot');
    expect(error.name).toBe('AppError');
    expect(error.details).toBeUndefined();
  });

  it('stores optional details', () => {
    const error = new AppError(400, 'bad', 'nope', { hint: 'try again' });
    expect(error.details).toEqual({ hint: 'try again' });
  });

  it('is an instanceof Error', () => {
    expect(new AppError(500, 'x', 'y')).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('formats a 404 message from resource and identifier', () => {
    const error = new NotFoundError('Sublist', '99');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('Sublist not found: 99');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('defaults to a generic message', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.message).toBe('Request validation failed');
  });

  it('accepts a custom message and details', () => {
    const error = new ValidationError('Bad query', { issues: [] });
    expect(error.message).toBe('Bad query');
    expect(error.details).toEqual({ issues: [] });
  });
});

describe('ConfigError', () => {
  it('is a 500 config_error', () => {
    const error = new ConfigError('broken env');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('config_error');
    expect(error.message).toBe('broken env');
    expect(error.name).toBe('ConfigError');
  });
});
