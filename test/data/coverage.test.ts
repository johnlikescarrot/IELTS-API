import { describe, expect, it } from 'vitest';

import {
  CROSS_VOLUME_MIN_VOLUMES,
  MAX_OUT_OF_LIST_WORDS,
  VOCABULARY_TIERS,
  tierForToken,
  vocabularyCoverage,
} from '../../src/data/coverage.js';

describe('tierForToken', () => {
  it('classifies headwords listed in several volumes as cross-volume', () => {
    expect(tierForToken('abnormal')).toBe('cross-volume'); // volumes 1, 17, 21
  });

  it('classifies single-volume headwords', () => {
    expect(tierForToken('abandon')).toBe('single-volume'); // volume 18 only
    expect(tierForToken('environment')).toBe('single-volume'); // volume 1 only
  });

  it('classifies unknown tokens as out-of-list', () => {
    expect(tierForToken('definitelynotaword')).toBe('out-of-list');
  });
});

describe('vocabularyCoverage', () => {
  it('returns zeros for an empty token list', () => {
    const coverage = vocabularyCoverage([]);
    expect(coverage.totalWords).toBe(0);
    expect(coverage.uniqueWords).toBe(0);
    expect(coverage.coverage).toBe(0);
    expect(coverage.topOutOfList).toEqual([]);
    expect(coverage.tiers.map((tier) => tier.share)).toEqual([0, 0, 0]);
  });

  it('profiles a mixed text across the three tiers', () => {
    const coverage = vocabularyCoverage(['abnormal', 'abandon', 'abandon', 'unlisted']);
    expect(coverage.totalWords).toBe(4);
    expect(coverage.uniqueWords).toBe(3);
    expect(coverage.coverage).toBe(0.75);
    const [cross, single, out] = coverage.tiers;
    expect(cross).toMatchObject({ tier: 'cross-volume', words: 1, unique: 1, share: 0.25 });
    expect(single).toMatchObject({ tier: 'single-volume', words: 2, unique: 1, share: 0.5 });
    expect(out).toMatchObject({ tier: 'out-of-list', words: 1, unique: 1, share: 0.25 });
  });

  it('lists the tenth tier descriptions in reference order', () => {
    expect(VOCABULARY_TIERS.map((tier) => tier.tier)).toEqual([
      'cross-volume',
      'single-volume',
      'out-of-list',
    ]);
    expect(CROSS_VOLUME_MIN_VOLUMES).toBe(2);
    expect(MAX_OUT_OF_LIST_WORDS).toBe(10);
  });

  it('ranks out-of-list words by frequency, then alphabetically', () => {
    const tokens = ['zztop', 'apple-pie', 'zztop', 'apple-pie', 'boffin'];
    const coverage = vocabularyCoverage(tokens, 1);
    expect(coverage.topOutOfList).toEqual([{ word: 'apple-pie', count: 2 }]);

    const full = vocabularyCoverage(tokens);
    expect(full.topOutOfList).toEqual([
      { word: 'apple-pie', count: 2 },
      { word: 'zztop', count: 2 },
      { word: 'boffin', count: 1 },
    ]);
  });

  it('truncates the out-of-list digest to the requested size', () => {
    const tokens = Array.from({ length: 25 }, (_, index) => `unlisted-${String(index).padStart(2, '0')}`);
    const coverage = vocabularyCoverage(tokens);
    expect(coverage.topOutOfList).toHaveLength(MAX_OUT_OF_LIST_WORDS);
    expect(coverage.topOutOfList[0]).toEqual({ word: 'unlisted-00', count: 1 });
  });

  it('is deterministic across calls (index caching)', () => {
    const first = vocabularyCoverage(['abandon', 'unknownword']);
    const second = vocabularyCoverage(['abandon', 'unknownword']);
    expect(second).toEqual(first);
  });
});
