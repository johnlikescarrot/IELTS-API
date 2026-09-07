import { describe, expect, it } from 'vitest';

import { analysePhonetics, simulateLearning } from '../../src/lib/phonetics.js';

describe('analysePhonetics', () => {
  it('analyses single word', () => {
    const report = analysePhonetics('atmosphere');
    expect(report.tokens).toEqual(['atmosphere']);
    expect(report.totalSyllables).toBeGreaterThan(0);
    expect(report.details[0]?.phonetic).not.toBeNull();
    expect(report.avgSyllables).toBeGreaterThan(0);
    expect(['easy', 'moderate', 'hard (polysyllabic)', 'hard (consonant-dense)']).toContain(
      report.difficulty,
    );
  });

  it('analyses phrase', () => {
    const report = analysePhonetics('Hello world');
    expect(report.tokens).toEqual(['hello', 'world']);
    expect(report.details).toHaveLength(2);
    expect(report.totalSyllables).toBe(3);
  });

  it('handles unknown word (no phonetic)', () => {
    const report = analysePhonetics('zzzzunknown');
    expect(report.details[0]?.phonetic).toBeNull();
  });

  it('classifies difficulty correctly', () => {
    expect(analysePhonetics('a').difficulty).toBe('easy');
    expect(analysePhonetics('hello world').difficulty.length).toBeGreaterThan(0);
    const long = analysePhonetics('environmental extracurricular');
    expect(long.difficulty.startsWith('hard')).toBe(true);
  });

  it('counts consonant clusters', () => {
    const report = analysePhonetics('strengths');
    expect(report.details[0]?.consonantClusters).toBeGreaterThanOrEqual(1);
  });

  it('handles hyphenated and apostrophes via wordsOf', () => {
    const report = analysePhonetics('well-known');
    expect(report.tokens).toContain('well-known');
  });

  it('covers polysyllabic difficulty and empty tokens', () => {
    const empty = analysePhonetics('123 456');
    expect(empty.tokens).toEqual([]);
    expect(empty.totalSyllables).toBe(0);
    expect(empty.avgSyllables).toBe(0);
    expect(empty.difficulty).toBe('easy');
    const polysyllabic = analysePhonetics('aiaia aiaia aiaia');
    // 3 tokens, each 1 vowel group? total 3? need >4 without clusters
    // Use many simple vowel-only tokens to exceed 4 syllables without clusters
    const polysyllabic2 = analysePhonetics('area idea area idea area');
    expect(polysyllabic.difficulty).toBeDefined();
    expect(polysyllabic2.totalSyllables).toBeGreaterThan(4);
    expect(polysyllabic2.difficulty).toBe('hard (polysyllabic)');
  });

  it('handles moderate difficulty', () => {
    const moderate = analysePhonetics('hello world hi');
    // hello(2) world(1) hi(1) =4 -> moderate
    expect(moderate.totalSyllables).toBe(4);
    expect(moderate.difficulty).toBe('moderate');
  });

  it('handles consonant-only tokens (zero vowel groups)', () => {
    const report = analysePhonetics('bcdfg bcd');
    expect(report.tokens).toEqual(['bcdfg', 'bcd']);
    // syllablesOf returns at least 1 per token even with no vowel groups
    expect(report.totalSyllables).toBe(2);
    expect(report.details[0]?.vowelGroups).toBe(0);
    expect(report.details[0]?.consonantClusters).toBeGreaterThan(0);
    expect(report.avgSyllables).toBe(1);
  });

  it('handles hard consonant-dense difficulty', () => {
    const dense = analysePhonetics('environmental extracurricular strengths');
    expect(dense.totalSyllables).toBeGreaterThan(4);
    expect(dense.difficulty).toBe('hard (consonant-dense)');
  });
});

describe('simulateLearning', () => {
  it('simulates trajectory with correct length and values', () => {
    const points = simulateLearning(10, 5, 7, 0.5);
    expect(points).toHaveLength(6); // 0..5
    expect(points[0]?.day).toBe(0);
    expect(points[0]?.newWords).toBe(0);
    expect(points[5]?.newWords).toBe(50);
    expect(points[5]?.retained).toBeGreaterThan(0);
  });

  it('uses strength to affect retention', () => {
    const low = simulateLearning(10, 7, 2, 0.5);
    const high = simulateLearning(10, 7, 30, 0.5);
    expect(high[7]?.retained).toBeGreaterThanOrEqual(low[7]?.retained as number);
  });

  it('rejects invalid inputs', () => {
    expect(() => simulateLearning(0, 5, 7, 0.5)).toThrow();
    expect(() => simulateLearning(51, 5, 7, 0.5)).toThrow();
    expect(() => simulateLearning(10, 0, 7, 0.5)).toThrow();
    expect(() => simulateLearning(10, 121, 7, 0.5)).toThrow();
    expect(() => simulateLearning(10, 5, 0, 0.5)).toThrow();
    expect(() => simulateLearning(10, 5, 400, 0.5)).toThrow();
  });

  it('handles threshold edges', () => {
    const zero = simulateLearning(10, 3, 7, 0);
    const one = simulateLearning(10, 3, 7, 1);
    expect(zero[3]?.retained).toBeGreaterThanOrEqual(one[3]?.retained as number);
  });
});
