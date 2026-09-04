import { describe, expect, it } from 'vitest';

import {
  MAX_BAND,
  MIN_BAND,
  assertBand,
  calculateOverall,
  isValidBand,
  meanOf,
  roundBand,
  SKILLS,
} from '../../src/lib/band.js';
import { cefrForBand } from '../../src/data/bands.js';
import { HttpError } from '../../src/lib/errors.js';

describe('isValidBand', () => {
  it('accepts every half band between 0 and 9', () => {
    expect(isValidBand(0)).toBe(true);
    expect(isValidBand(6.5)).toBe(true);
    expect(isValidBand(MAX_BAND)).toBe(true);
  });

  it('rejects non-numbers, out-of-range and non-half values', () => {
    expect(isValidBand('7')).toBe(false);
    expect(isValidBand(Number.NaN)).toBe(false);
    expect(isValidBand(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidBand(MIN_BAND - 0.5)).toBe(false);
    expect(isValidBand(MAX_BAND + 0.5)).toBe(false);
    expect(isValidBand(6.25)).toBe(false);
  });
});

describe('assertBand', () => {
  it('returns valid bands unchanged', () => {
    expect(assertBand(7.5, 'listening')).toBe(7.5);
  });

  it('throws for invalid bands', () => {
    expect(() => assertBand(7.25, 'listening')).toThrow(HttpError);
    expect(() => assertBand(undefined, 'listening')).toThrow(/"listening"/);
  });
});

describe('roundBand', () => {
  it('rounds to the nearest half band', () => {
    expect(roundBand(6.1)).toBe(6);
    expect(roundBand(6.3)).toBe(6.5);
    expect(roundBand(6.9)).toBe(7);
  });

  it('rounds .25 and .75 means up', () => {
    expect(roundBand(6.25)).toBe(6.5);
    expect(roundBand(6.75)).toBe(7);
  });

  it('is immune to floating-point noise', () => {
    expect(roundBand(6.4999999999)).toBe(6.5);
    expect(roundBand(6.75000000001)).toBe(7);
  });

  it('clamps to the reportable range', () => {
    expect(roundBand(-1)).toBe(MIN_BAND);
    expect(roundBand(11)).toBe(MAX_BAND);
  });
});

describe('meanOf', () => {
  it('averages the four components', () => {
    expect(meanOf({ listening: 7, reading: 6.5, writing: 6, speaking: 7 })).toBe(6.625);
  });
});

describe('calculateOverall', () => {
  it('reports components, mean, overall, CEFR and spread', () => {
    const result = calculateOverall({ listening: 7, reading: 6.5, writing: 6, speaking: 7 }, cefrForBand);
    expect(result.overall).toBe(6.5);
    expect(result.mean).toBeCloseTo(6.625, 10);
    expect(result.cefr).toBe('B2');
    expect(result.spread).toBe(1);
    expect(result.components).toEqual({ listening: 7, reading: 6.5, writing: 6, speaking: 7 });
    expect(result.explanation).toContain('rounds to the nearest half band');
  });

  it('explains the tie-break rule when the mean ends in .25', () => {
    const result = calculateOverall({ listening: 7, reading: 6, writing: 6, speaking: 6 }, cefrForBand);
    expect(result.mean).toBe(6.25);
    expect(result.overall).toBe(6.5);
    expect(result.explanation).toContain('rounds a .25/.75 mean up');
  });

  it('explains the tie-break rule when the mean ends in .75', () => {
    const result = calculateOverall({ listening: 7, reading: 7, writing: 7, speaking: 6 }, cefrForBand);
    expect(result.mean).toBe(6.75);
    expect(result.overall).toBe(7);
    expect(result.explanation).toContain('rounds a .25/.75 mean up');
  });

  it('exposes the four skills in report order', () => {
    expect(SKILLS).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });
});
