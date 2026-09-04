import { describe, expect, it } from 'vitest';

import { hashString, mulberry32, seededIndices } from '../../src/lib/rng.js';

describe('hashString', () => {
  it('is deterministic and unsigned', () => {
    expect(hashString('ielts')).toBe(hashString('ielts'));
    expect(hashString('ielts')).not.toBe(hashString('toefl'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashString('ielts-api'))).toBe(true);
  });
});

describe('mulberry32', () => {
  it('produces the same stream for the same seed', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('stays inside [0, 1)', () => {
    const random = mulberry32(7);
    for (let index = 0; index < 100; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('seededIndices', () => {
  it('returns nothing for empty populations or counts', () => {
    expect(seededIndices('seed', 0, 5)).toEqual([]);
    expect(seededIndices('seed', 10, 0)).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    expect(seededIndices('2024-01-01', 1000, 5)).toEqual(seededIndices('2024-01-01', 1000, 5));
  });

  it('returns distinct, in-range, ascending indices', () => {
    const indices = seededIndices('2024-06-01', 200, 7);
    expect(indices).toHaveLength(7);
    expect(new Set(indices).size).toBe(7);
    expect(Math.min(...indices)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...indices)).toBeLessThan(200);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('caps the sample at the population size', () => {
    expect(seededIndices('seed', 3, 10)).toHaveLength(3);
  });
});
