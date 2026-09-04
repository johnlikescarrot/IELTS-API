import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../src/lib/errors.js';
import {
  idParamSchema,
  paginationSchema,
  parseInput,
  seedSchema
} from '../../src/lib/validation.js';

describe('parseInput', () => {
  it('returns parsed data for valid input', () => {
    const schema = z.object({ name: z.string() });
    expect(parseInput(schema, { name: 'sector' }, 'payload')).toEqual({ name: 'sector' });
  });

  it('applies schema defaults', () => {
    expect(parseInput(paginationSchema, {}, 'query')).toEqual({ page: 1, limit: 20 });
  });

  it('throws a ValidationError with issue details on failure', () => {
    const schema = z.object({ name: z.string().min(2) });
    try {
      parseInput(schema, { name: 'x' }, 'payload');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.message).toBe('Invalid payload');
      const issues = (
        validationError.details as { issues: { path: string; message: string; code: string }[] }
      ).issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toBe('name');
      expect(issues[0]?.code).toBe('too_small');
    }
  });

  it('labels root-level failures with the (root) path', () => {
    const schema = z.object({ id: z.string() });
    try {
      parseInput(schema, 'not-an-object', 'body');
      expect.unreachable('should have thrown');
    } catch (error) {
      const issues = ((error as ValidationError).details as { issues: { path: string }[] }).issues;
      expect(issues[0]?.path).toBe('(root)');
    }
  });

  it('joins nested paths with dots', () => {
    const schema = z.object({ outer: z.object({ inner: z.number() }) });
    try {
      parseInput(schema, { outer: { inner: 'NaN' } }, 'body');
      expect.unreachable('should have thrown');
    } catch (error) {
      const issues = ((error as ValidationError).details as { issues: { path: string }[] }).issues;
      expect(issues[0]?.path).toBe('outer.inner');
    }
  });
});

describe('paginationSchema', () => {
  it('coerces strings and enforces bounds', () => {
    expect(parseInput(paginationSchema, { page: '3', limit: '50' }, 'query')).toEqual({
      page: 3,
      limit: 50
    });
    expect(() => parseInput(paginationSchema, { page: '0' }, 'query')).toThrow(ValidationError);
    expect(() => parseInput(paginationSchema, { limit: '101' }, 'query')).toThrow(ValidationError);
    expect(() => parseInput(paginationSchema, { page: '1.5' }, 'query')).toThrow(ValidationError);
  });
});

describe('seedSchema', () => {
  it('returns undefined when absent or blank after trimming', () => {
    expect(parseInput(seedSchema, undefined, 'query')).toBeUndefined();
  });

  it('trims the seed value', () => {
    expect(parseInput(seedSchema, '  my-seed  ', 'query')).toBe('my-seed');
  });

  it('rejects blank and oversized seeds', () => {
    expect(() => parseInput(seedSchema, '', 'query')).toThrow(ValidationError);
    expect(() => parseInput(seedSchema, '   ', 'query')).toThrow(ValidationError);
    expect(() => parseInput(seedSchema, 'x'.repeat(201), 'query')).toThrow(ValidationError);
  });
});

describe('idParamSchema', () => {
  it('accepts ordinary ids', () => {
    expect(parseInput(idParamSchema, { id: 'mist-001' }, 'params')).toEqual({ id: 'mist-001' });
  });

  it('rejects empty and oversized ids', () => {
    expect(() => parseInput(idParamSchema, { id: '' }, 'params')).toThrow(ValidationError);
    expect(() => parseInput(idParamSchema, { id: 'x'.repeat(121) }, 'params')).toThrow(
      ValidationError
    );
  });
});
