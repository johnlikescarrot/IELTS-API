import { describe, expect, it } from 'vitest';
import {
  matchesQuery,
  normalizeText,
  paginate,
  parseBoundedInt,
  parseOffset,
} from '../src/utils/query.js';

describe('normalizeText', () => {
  it('trims and lowercases strings', () => {
    expect(normalizeText('  HeLLo ')).toBe('hello');
  });

  it('returns empty string for non-strings', () => {
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(42)).toBe('');
    expect(normalizeText(null)).toBe('');
  });
});

describe('parseBoundedInt', () => {
  it('parses valid strings', () => {
    expect(parseBoundedInt('5', 20, 100)).toBe(5);
  });

  it('parses numbers directly', () => {
    expect(parseBoundedInt(7, 20, 100)).toBe(7);
  });

  it('floors fractional values', () => {
    expect(parseBoundedInt('7.9', 20, 100)).toBe(7);
  });

  it('falls back for missing values', () => {
    expect(parseBoundedInt(undefined, 20, 100)).toBe(20);
  });

  it('falls back for non-numeric strings', () => {
    expect(parseBoundedInt('abc', 20, 100)).toBe(20);
  });

  it('falls back for values below 1', () => {
    expect(parseBoundedInt('0', 20, 100)).toBe(20);
    expect(parseBoundedInt('-3', 20, 100)).toBe(20);
  });

  it('caps values above max', () => {
    expect(parseBoundedInt('500', 20, 100)).toBe(100);
  });
});

describe('parseOffset', () => {
  it('parses valid offsets', () => {
    expect(parseOffset('4')).toBe(4);
    expect(parseOffset(2)).toBe(2);
    expect(parseOffset('0')).toBe(0);
  });

  it('floors fractional offsets', () => {
    expect(parseOffset('2.7')).toBe(2);
  });

  it('returns 0 for missing or invalid values', () => {
    expect(parseOffset(undefined)).toBe(0);
    expect(parseOffset('nope')).toBe(0);
  });

  it('returns 0 for negative values', () => {
    expect(parseOffset('-5')).toBe(0);
  });
});

describe('matchesQuery', () => {
  it('matches everything on empty query', () => {
    expect(matchesQuery(['anything'], '')).toBe(true);
  });

  it('matches string fields case-insensitively', () => {
    expect(matchesQuery(['Hello World'], 'hello')).toBe(true);
    expect(matchesQuery(['Hello World'], 'GOODBYE')).toBe(false);
  });

  it('matches inside array fields', () => {
    expect(matchesQuery([['apple', 'banana']], 'nan')).toBe(true);
    expect(matchesQuery([['apple', 'banana']], 'cherry')).toBe(false);
  });

  it('checks every field', () => {
    expect(matchesQuery(['aaa', 'bbb'], 'bb')).toBe(true);
  });
});

describe('paginate', () => {
  it('slices items and reports totals', () => {
    const page = paginate([1, 2, 3, 4, 5], 2, 2);
    expect(page).toEqual({ total: 5, limit: 2, offset: 2, items: [3, 4] });
  });
});
