import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/lib/errors.js';
import {
  getSublist,
  getWord,
  listSublists,
  randomWords,
  searchWords
} from '../../src/services/awl.service.js';

describe('listSublists', () => {
  it('summarises all ten sublists with official word counts', () => {
    const sublists = listSublists();
    expect(sublists).toHaveLength(10);
    expect(sublists.map((s) => s.wordCount)).toEqual([60, 60, 60, 60, 60, 60, 60, 60, 60, 30]);
  });
});

describe('getSublist', () => {
  it('returns words with sublist-local and global indices', () => {
    const words = getSublist(1);
    expect(words[0]).toEqual({ word: 'sector', sublist: 1, indexInSublist: 1, globalIndex: 1 });
  });

  it('returns the 30 words of sublist 10', () => {
    const words = getSublist(10);
    expect(words).toHaveLength(30);
    expect(words[0]?.word).toBe('whereby');
  });

  it('rejects out-of-range and non-integer sublists', () => {
    for (const bad of [0, 11, -1, 1.5]) {
      expect(() => getSublist(bad)).toThrow(NotFoundError);
    }
  });
});

describe('getWord', () => {
  it('looks a word up case-insensitively', () => {
    expect(getWord('ANALYSIS')?.sublist).toBe(1);
    expect(getWord('analysis')?.indexInSublist).toBe(48);
  });

  it('returns null for unknown words', () => {
    expect(getWord('notaword')).toBeNull();
  });

  it('includes source attribution', () => {
    const detail = getWord('sector');
    expect(detail?.source.citation).toContain('Coxhead');
  });
});

describe('searchWords', () => {
  it('ranks prefix matches before substring matches', () => {
    const results = searchWords('an', 100);
    expect(results.length).toBeGreaterThan(0);
    const firstNonPrefix = results.findIndex((w) => !w.word.startsWith('an'));
    if (firstNonPrefix !== -1) {
      expect(results[firstNonPrefix]?.word.includes('an')).toBe(true);
      expect(results.slice(0, firstNonPrefix).every((w) => w.word.startsWith('an'))).toBe(true);
    }
  });

  it('is case-insensitive', () => {
    expect(searchWords('SECTOR', 10).map((w) => w.word)).toContain('sector');
  });

  it('limits the result count', () => {
    expect(searchWords('a', 5)).toHaveLength(5);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchWords('zzzzqqqq', 10)).toEqual([]);
  });
});

describe('randomWords', () => {
  it('is deterministic for the same seed', () => {
    const a = randomWords({ count: 5, seed: 'seed-a' });
    const b = randomWords({ count: 5, seed: 'seed-a' });
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    const a = randomWords({ count: 5, seed: 'seed-a' });
    const b = randomWords({ count: 5, seed: 'seed-b' });
    expect(a).not.toEqual(b);
  });

  it('restricts to the requested sublist', () => {
    const words = randomWords({ count: 7, sublist: 3, seed: 's3' });
    expect(words).toHaveLength(7);
    expect(words.every((w) => w.sublist === 3)).toBe(true);
  });

  it('samples from the full list without a sublist filter', () => {
    const words = randomWords({ count: 10, seed: 'full' });
    expect(words).toHaveLength(10);
    expect(new Set(words.map((w) => w.word)).size).toBe(10);
  });

  it('clamps count above the pool size', () => {
    const words = randomWords({ count: 1000, sublist: 10, seed: 'clamp' });
    expect(words).toHaveLength(30);
  });

  it('works without a seed', () => {
    expect(randomWords({ count: 3 })).toHaveLength(3);
  });
});
