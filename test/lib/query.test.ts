import { describe, expect, it } from 'vitest';

import {
  getBoolean,
  getEnum,
  getInt,
  getIsoDate,
  getNumber,
  getString,
  requireString,
  toParams,
} from '../../src/lib/query.js';
import { HttpError } from '../../src/lib/errors.js';

describe('getString', () => {
  it('returns undefined for missing values', () => {
    expect(getString({}, 'q')).toBeUndefined();
  });

  it('trims and returns the value', () => {
    expect(getString({ q: '  environment ' }, 'q')).toBe('environment');
  });

  it('returns undefined for blank values', () => {
    expect(getString({ q: '   ' }, 'q')).toBeUndefined();
  });

  it('rejects repeated parameters', () => {
    expect(() => getString({ q: ['a', 'b'] }, 'q')).toThrow(HttpError);
    expect(() => getString({ q: ['a', 'b'] }, 'q')).toThrow(/at most once/);
  });
});

describe('requireString', () => {
  it('returns the value when present', () => {
    expect(requireString({ band: '7' }, 'band')).toBe('7');
  });

  it('throws when absent', () => {
    expect(() => requireString({}, 'band')).toThrow(/is required/);
  });
});

describe('getInt', () => {
  it('falls back when absent', () => {
    expect(getInt({}, 'limit', 1, 100, 20)).toBe(20);
  });

  it('parses valid integers', () => {
    expect(getInt({ limit: '50' }, 'limit', 1, 100, 20)).toBe(50);
  });

  it('rejects non-integers', () => {
    expect(() => getInt({ limit: '5.5' }, 'limit', 1, 100, 20)).toThrow(/must be an integer/);
  });

  it('rejects out-of-range values', () => {
    expect(() => getInt({ limit: '0' }, 'limit', 1, 100, 20)).toThrow(/between 1 and 100/);
    expect(() => getInt({ limit: '101' }, 'limit', 1, 100, 20)).toThrow(/between 1 and 100/);
  });
});

describe('getNumber', () => {
  it('returns undefined when absent', () => {
    expect(getNumber({}, 'score', 0, 100)).toBeUndefined();
  });

  it('parses decimals', () => {
    expect(getNumber({ score: '7.5' }, 'score', 0, 9)).toBe(7.5);
    expect(getNumber({ score: '.5' }, 'score', 0, 9)).toBe(0.5);
  });

  it('rejects non-numbers', () => {
    expect(() => getNumber({ score: 'abc' }, 'score', 0, 9)).toThrow(/must be a number/);
  });

  it('rejects out-of-range values', () => {
    expect(() => getNumber({ score: '10' }, 'score', 0, 9)).toThrow(/between 0 and 9/);
  });
});

describe('getEnum', () => {
  const allowed = ['asc', 'desc'] as const;

  it('returns undefined when absent', () => {
    expect(getEnum({}, 'order', allowed)).toBeUndefined();
  });

  it('returns the matching member', () => {
    expect(getEnum({ order: 'desc' }, 'order', allowed)).toBe('desc');
  });

  it('rejects unknown values', () => {
    expect(() => getEnum({ order: 'sideways' }, 'order', allowed)).toThrow(/must be one of: asc, desc/);
  });
});

describe('getBoolean', () => {
  it('falls back when absent', () => {
    expect(getBoolean({}, 'verbose', true)).toBe(true);
    expect(getBoolean({}, 'verbose', false)).toBe(false);
  });

  it('accepts the truthy spellings', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
      expect(getBoolean({ verbose: value }, 'verbose', false)).toBe(true);
    }
  });

  it('accepts the falsy spellings', () => {
    for (const value of ['0', 'false', 'FALSE', 'no', 'off']) {
      expect(getBoolean({ verbose: value }, 'verbose', true)).toBe(false);
    }
  });

  it('rejects anything else', () => {
    expect(() => getBoolean({ verbose: 'maybe' }, 'verbose', true)).toThrow(/must be a boolean/);
  });
});

describe('getIsoDate', () => {
  it('falls back to the provided default', () => {
    expect(getIsoDate({}, 'date', '2024-01-01')).toBe('2024-01-01');
  });

  it('accepts a valid calendar date', () => {
    expect(getIsoDate({ date: '2024-02-29' }, 'date', '2024-01-01')).toBe('2024-02-29');
  });

  it('rejects a malformed value', () => {
    expect(() => getIsoDate({ date: '2024-1-1' }, 'date', '2024-01-01')).toThrow(/ISO date/);
  });

  it('rejects an impossible calendar date', () => {
    expect(() => getIsoDate({ date: '2023-02-29' }, 'date', '2024-01-01')).toThrow(/valid calendar date/);
  });
});

describe('toParams', () => {
  it('records single values as strings', () => {
    expect(toParams(new URL('http://x.test/?q=abc&limit=2'))).toEqual({ q: 'abc', limit: '2' });
  });

  it('records repeated values as arrays', () => {
    expect(toParams(new URL('http://x.test/?tag=a&tag=b'))).toEqual({ tag: ['a', 'b'] });
  });
});
