import { describe, expect, it } from 'vitest';

import {
  frequentWords,
  lexicalReport,
  MATTR_WINDOW,
  movingAverageTtr,
  STOP_WORDS,
} from '../../src/lib/lexical.js';
import { tokenizeWords } from '../../src/lib/text.js';

const HEADWORDS: ReadonlySet<string> = new Set(['environment', 'sustainable', 'policy']);

describe('STOP_WORDS', () => {
  it('contains closed-class function words only', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('however')).toBe(false);
    expect(STOP_WORDS.has('environment')).toBe(false);
  });
});

describe('movingAverageTtr', () => {
  it('returns 0 for empty input', () => {
    expect(movingAverageTtr([])).toBe(0);
  });

  it('falls back to plain TTR when shorter than the window', () => {
    expect(movingAverageTtr(['a', 'b', 'a', 'c'])).toBe(0.75);
  });

  it('returns 1 when every token in every window is distinct', () => {
    const tokens = Array.from({ length: MATTR_WINDOW + 10 }, (_unused, index) => `w${index}`);
    expect(movingAverageTtr(tokens)).toBe(1);
  });

  it('averages over sliding windows for long input', () => {
    const tokens = Array.from({ length: MATTR_WINDOW + 4 }, () => 'same');
    expect(movingAverageTtr(tokens)).toBeCloseTo(1 / MATTR_WINDOW, 10);
  });

  it('honours an explicit window size', () => {
    expect(movingAverageTtr(['a', 'a', 'b', 'b'], 2)).toBeCloseTo((0.5 + 1 + 0.5) / 3, 10);
  });
});

describe('frequentWords', () => {
  it('excludes stop words and very short words', () => {
    const words = frequentWords(tokenizeWords('the the of an ox ox policy policy policy'), 5);
    expect(words.map((entry) => entry.word)).toEqual(['policy']);
  });

  it('ranks by count then alphabetically', () => {
    const words = frequentWords(['beta', 'beta', 'alpha', 'alpha', 'gamma'], 5);
    expect(words.map((entry) => entry.word)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('limits the result to the requested size', () => {
    expect(frequentWords(['alpha', 'beta', 'gamma'], 2)).toHaveLength(2);
  });

  it('reports the share of all tokens', () => {
    const [top] = frequentWords(['alpha', 'alpha', 'the', 'the'], 1);
    expect(top?.count).toBe(2);
    expect(top?.ratio).toBe(0.5);
  });

  it('returns an empty list for empty input', () => {
    expect(frequentWords([], 5)).toEqual([]);
  });
});

describe('lexicalReport', () => {
  it('measures diversity and Cambridge coverage', () => {
    const report = lexicalReport('The environment and the sustainable policy.', HEADWORDS);
    expect(report.tokens).toBe(6);
    expect(report.types).toBe(5);
    expect(report.cambridgeMatches).toBe(3);
    expect(report.cambridgeCoverage).toBe(0.5);
  });

  it('reports the length-corrected diversity variants', () => {
    const report = lexicalReport('alpha beta gamma delta', HEADWORDS);
    expect(report.typeTokenRatio).toBe(1);
    expect(report.rootTypeTokenRatio).toBe(2);
    expect(report.correctedTypeTokenRatio).toBeCloseTo(4 / Math.sqrt(8), 3);
  });

  it('handles empty input without dividing by zero', () => {
    const report = lexicalReport('', HEADWORDS);
    expect(report.tokens).toBe(0);
    expect(report.typeTokenRatio).toBe(0);
    expect(report.movingAverageTypeTokenRatio).toBe(0);
    expect(report.cambridgeCoverage).toBe(0);
    expect(report.meanWordLength).toBe(0);
    expect(report.frequentWords).toEqual([]);
  });

  it('computes the content-word ratio', () => {
    expect(lexicalReport('the policy', HEADWORDS).contentWordRatio).toBe(0.5);
  });

  it('computes mean word length excluding apostrophes', () => {
    expect(lexicalReport("don't", HEADWORDS).meanWordLength).toBe(4);
  });

  it('honours the requested number of frequent words', () => {
    const text = 'alpha beta gamma delta epsilon zeta';
    expect(lexicalReport(text, HEADWORDS, 2).frequentWords).toHaveLength(2);
    expect(lexicalReport(text, HEADWORDS).frequentWords).toHaveLength(6);
  });

  it('is deterministic', () => {
    const text = 'Sustainable policy protects the environment.';
    expect(lexicalReport(text, HEADWORDS)).toEqual(lexicalReport(text, HEADWORDS));
  });
});
