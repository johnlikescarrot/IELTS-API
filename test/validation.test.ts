import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  coerceNumber,
  isValidBand,
  parseBand,
  parseCorrectCount,
  parseOptionalNonNegativeInteger,
  parseOptionalString,
  parseReadingModule,
} from '../src/services/validation.js';

describe('coerceNumber', () => {
  it('passes numbers through', () => {
    expect(coerceNumber(7)).toBe(7);
    expect(coerceNumber(7.5)).toBe(7.5);
  });

  it('parses numeric strings', () => {
    expect(coerceNumber(' 32 ')).toBe(32);
    expect(coerceNumber('6.5')).toBe(6.5);
  });

  it('returns NaN for empty or non-numeric values', () => {
    expect(coerceNumber('')).toBeNaN();
    expect(coerceNumber('   ')).toBeNaN();
    expect(coerceNumber('abc')).toBeNaN();
    expect(coerceNumber(undefined)).toBeNaN();
    expect(coerceNumber(null)).toBeNaN();
    expect(coerceNumber({})).toBeNaN();
  });
});

describe('parseCorrectCount', () => {
  it('accepts a valid integer within range', () => {
    expect(parseCorrectCount('32', 40)).toBe(32);
    expect(parseCorrectCount(0, 40)).toBe(0);
    expect(parseCorrectCount(40, 40)).toBe(40);
  });

  it('rejects non-numeric values', () => {
    expect(() => parseCorrectCount('abc', 40)).toThrow(ValidationError);
    expect(() => parseCorrectCount(undefined, 40)).toThrow(ValidationError);
  });

  it('rejects non-integers', () => {
    expect(() => parseCorrectCount('32.5', 40)).toThrow(/integer/);
  });

  it('rejects values outside the range', () => {
    expect(() => parseCorrectCount('-1', 40)).toThrow(/between/);
    expect(() => parseCorrectCount('41', 40)).toThrow(/between/);
  });

  it('rejects values outside a custom max', () => {
    expect(() => parseCorrectCount('5', 3)).toThrow(/between/);
  });
});

describe('isValidBand', () => {
  it('accepts integer and half bands', () => {
    expect(isValidBand(0)).toBe(true);
    expect(isValidBand(0.5)).toBe(true);
    expect(isValidBand(6.5)).toBe(true);
    expect(isValidBand(9)).toBe(true);
  });

  it('rejects invalid bands', () => {
    expect(isValidBand(-1)).toBe(false);
    expect(isValidBand(10)).toBe(false);
    expect(isValidBand(6.3)).toBe(false);
    expect(isValidBand(Number.NaN)).toBe(false);
    expect(isValidBand(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('parseBand', () => {
  it('accepts a valid band', () => {
    expect(parseBand('6.5')).toBe(6.5);
    expect(parseBand(9)).toBe(9);
  });

  it('rejects a non-number', () => {
    expect(() => parseBand('x', 'band')).toThrow(ValidationError);
  });

  it('rejects an invalid band', () => {
    expect(() => parseBand('8.3', 'writing')).toThrow(/half bands/);
    expect(() => parseBand('10', 'listening')).toThrow(/half bands/);
  });
});

describe('parseReadingModule', () => {
  it('defaults to academic when absent', () => {
    expect(parseReadingModule(undefined)).toBe('academic');
    expect(parseReadingModule(null)).toBe('academic');
    expect(parseReadingModule('')).toBe('academic');
    expect(parseReadingModule('   ')).toBe('academic');
  });

  it('parses recognised modules', () => {
    expect(parseReadingModule('academic')).toBe('academic');
    expect(parseReadingModule('general-training')).toBe('general-training');
  });

  it('rejects unknown modules', () => {
    expect(() => parseReadingModule('foo')).toThrow(ValidationError);
    expect(() => parseReadingModule(5)).toThrow(ValidationError);
  });
});

describe('parseOptionalString', () => {
  it('returns an empty string for non-strings', () => {
    expect(parseOptionalString(undefined)).toBe('');
    expect(parseOptionalString(5)).toBe('');
  });

  it('trims string values', () => {
    expect(parseOptionalString('  education ')).toBe('education');
  });
});

describe('parseOptionalNonNegativeInteger', () => {
  it('returns undefined when absent or empty', () => {
    expect(parseOptionalNonNegativeInteger(undefined, 100, 'page')).toBeUndefined();
    expect(parseOptionalNonNegativeInteger(null, 100, 'page')).toBeUndefined();
    expect(parseOptionalNonNegativeInteger('', 100, 'page')).toBeUndefined();
  });

  it('parses a valid integer', () => {
    expect(parseOptionalNonNegativeInteger('2', 100, 'page')).toBe(2);
  });

  it('rejects invalid integers', () => {
    expect(() => parseOptionalNonNegativeInteger('1.5', 100, 'page')).toThrow(/integer/);
    expect(() => parseOptionalNonNegativeInteger('101', 100, 'page')).toThrow(/between/);
  });
});
