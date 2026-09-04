import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, mulberry32, sample, shuffled } from '../../src/lib/random.js';

describe('hashSeed', () => {
  it('is deterministic and input-sensitive', () => {
    expect(hashSeed('test')).toBe(hashSeed('test'));
    expect(hashSeed('test')).not.toBe(hashSeed('test2'));
  });

  it('returns a 32-bit unsigned integer', () => {
    const hash = hashSeed('anything');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('handles the empty string', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
  });
});

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a()]).not.toEqual([b(), b()]);
  });
});

describe('createRng', () => {
  it('is deterministic with a seed', () => {
    const seeded = createRng('fixed-seed');
    expect(seeded()).toBe(createRng('fixed-seed')());
  });

  it('works without a seed', () => {
    const rng = createRng();
    const value = rng();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe('shuffled', () => {
  it('returns a permutation without mutating the input', () => {
    const rng = createRng('perm');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const snapshot = [...input];
    const result = shuffled(input, rng);
    expect([...result].sort((a, b) => a - b)).toEqual(snapshot);
    expect(input).toEqual(snapshot);
  });

  it('is deterministic for a seeded generator', () => {
    const a = shuffled([1, 2, 3, 4, 5], createRng('same'));
    const b = shuffled([1, 2, 3, 4, 5], createRng('same'));
    expect(a).toEqual(b);
  });

  it('handles the empty array and single element', () => {
    expect(shuffled([], createRng('e'))).toEqual([]);
    expect(shuffled(['only'], createRng('s'))).toEqual(['only']);
  });
});

describe('sample', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('returns exactly count items with no duplicates', () => {
    const result = sample(items, 3, createRng('three'));
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
    for (const item of result) {
      expect(items).toContain(item);
    }
  });

  it('clamps count above the pool size to the pool size', () => {
    const result = sample(items, 100, createRng('big'));
    expect(result).toHaveLength(5);
    expect(new Set(result).size).toBe(5);
  });

  it('returns an empty array for zero or negative counts', () => {
    expect(sample(items, 0, createRng('zero'))).toEqual([]);
    expect(sample(items, -5, createRng('neg'))).toEqual([]);
  });

  it('is deterministic for a seed', () => {
    expect(sample(items, 2, createRng('det'))).toEqual(sample(items, 2, createRng('det')));
  });
});
