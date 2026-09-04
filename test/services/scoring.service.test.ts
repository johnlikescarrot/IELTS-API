import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/lib/errors.js';
import {
  fullTable,
  isScoreModule,
  overallBand,
  rawToBand
} from '../../src/services/scoring.service.js';

describe('isScoreModule', () => {
  it('accepts known modules and rejects others', () => {
    expect(isScoreModule('listening')).toBe(true);
    expect(isScoreModule('reading-academic')).toBe(true);
    expect(isScoreModule('reading-general-training')).toBe(true);
    expect(isScoreModule('writing')).toBe(false);
  });
});

describe('rawToBand', () => {
  it('converts listening raw scores', () => {
    expect(rawToBand('listening', 34).band).toBe(7.5);
    expect(rawToBand('listening', 39).band).toBe(9);
    expect(rawToBand('listening', 0).band).toBe(1);
  });

  it('converts academic and general training reading differently', () => {
    expect(rawToBand('reading-academic', 15).band).toBe(5);
    expect(rawToBand('reading-general-training', 15).band).toBe(4);
  });

  it('includes the accuracy disclaimer', () => {
    expect(rawToBand('listening', 30).disclaimer).toContain('Approximate');
  });

  it('rejects invalid raw scores', () => {
    expect(() => rawToBand('listening', -1)).toThrow(ValidationError);
    expect(() => rawToBand('listening', 41)).toThrow(ValidationError);
    expect(() => rawToBand('listening', 7.5)).toThrow(ValidationError);
  });
});

describe('fullTable', () => {
  it('maps every raw score 0-40 for every module', () => {
    for (const module of ['listening', 'reading-academic', 'reading-general-training'] as const) {
      const table = fullTable(module);
      expect(table).toHaveLength(41);
      expect(table[0]?.raw).toBe(0);
      expect(table[40]?.raw).toBe(40);
      expect(table.every((row) => row.band >= 1 && row.band <= 9)).toBe(true);
    }
  });

  it('produces monotonically non-decreasing bands', () => {
    const table = fullTable('reading-academic');
    for (let i = 1; i < table.length; i++) {
      expect(table[i]?.band).toBeGreaterThanOrEqual(table[i - 1]?.band as number);
    }
  });
});

describe('overallBand', () => {
  it('keeps means that are already half bands', () => {
    expect(overallBand({ listening: 7, reading: 6.5, writing: 6, speaking: 6.5 }).overall).toBe(
      6.5
    );
    expect(overallBand({ listening: 9, reading: 9, writing: 9, speaking: 9 }).overall).toBe(9);
  });

  it('rounds .25 means up to .5', () => {
    // (7 + 7 + 6 + 5) / 4 = 6.25 -> 6.5
    expect(overallBand({ listening: 7, reading: 7, writing: 6, speaking: 5 }).overall).toBe(6.5);
  });

  it('rounds .75 means up to the next whole band', () => {
    // (7 + 7 + 7 + 6) / 4 = 6.75 -> 7
    expect(overallBand({ listening: 7, reading: 7, writing: 7, speaking: 6 }).overall).toBe(7);
  });

  it('rounds .125 means down', () => {
    // (7 + 6 + 6 + 6) / 4 = 6.25 -> wait: this is 6.25 -> 6.5. Use (6+6+6+6.5)/4 = 6.125 -> 6.0
    expect(overallBand({ listening: 6, reading: 6, writing: 6, speaking: 6.5 }).overall).toBe(6);
  });

  it('returns the exact mean and the rounding rule', () => {
    const result = overallBand({ listening: 6, reading: 6, writing: 6, speaking: 7 });
    expect(result.mean).toBe(6.25);
    expect(result.roundingRule).toContain('.25 rounds up');
  });

  it('rejects out-of-range or non-half-step inputs for every skill', () => {
    expect(() => overallBand({ listening: 9.25, reading: 6, writing: 6, speaking: 6 })).toThrow(
      ValidationError
    );
    expect(() => overallBand({ listening: 6, reading: -0.5, writing: 6, speaking: 6 })).toThrow(
      ValidationError
    );
    expect(() => overallBand({ listening: 6, reading: 6, writing: 9.5, speaking: 6 })).toThrow(
      ValidationError
    );
    expect(() => overallBand({ listening: 6, reading: 6, writing: 6, speaking: 12 })).toThrow(
      ValidationError
    );
    expect(() =>
      overallBand({ listening: Number.NaN, reading: 6, writing: 6, speaking: 6 })
    ).toThrow(ValidationError);
    expect(() =>
      overallBand({ listening: 6, reading: Number.POSITIVE_INFINITY, writing: 6, speaking: 6 })
    ).toThrow(ValidationError);
  });

  it('reports the failing skill in the error details', () => {
    try {
      overallBand({ listening: 6, reading: 6, writing: 6, speaking: 8.7 });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ValidationError).details).toEqual({ value: 8.7 });
    }
  });
});

describe('module guard', () => {
  it('raises NotFoundError for an unknown module via rangesFor', () => {
    expect(() => rawToBand('speaking' as never, 10)).toThrow(NotFoundError);
  });
});
