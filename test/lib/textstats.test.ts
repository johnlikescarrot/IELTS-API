import { describe, expect, it } from 'vitest';

import {
  baseProfile,
  fleschKincaidGrade,
  fleschReadingEase,
  MAX_TEXT_LENGTH,
  meanOf,
  round1,
  round2,
  sentencesOf,
  stdevOf,
  syllablesOf,
  wordsOf,
} from '../../src/lib/textstats.js';

describe('sentencesOf', () => {
  it('splits on full stops, exclamation marks and question marks', () => {
    expect(sentencesOf('Wait! Really? Yes — one more time...')).toEqual([
      'Wait',
      'Really',
      'Yes — one more time',
    ]);
  });

  it('splits on ellipses followed by whitespace', () => {
    expect(sentencesOf('Wait... then go.')).toEqual(['Wait', 'then go']);
  });

  it('treats a final unterminated stretch as one sentence', () => {
    expect(sentencesOf('No terminator here')).toEqual(['No terminator here']);
  });

  it('returns no sentences for empty or blank text', () => {
    expect(sentencesOf('')).toEqual([]);
    expect(sentencesOf('   \n\t ')).toEqual([]);
  });

  it('drops empty fragments between terminators', () => {
    expect(sentencesOf('Stop!! ... Go.')).toEqual(['Stop', 'Go']);
  });

  it('keeps an ellipsis without trailing whitespace inside one sentence', () => {
    expect(sentencesOf('Hello...World')).toEqual(['Hello...World']);
  });

  it('does not split on terminators followed by closing punctuation', () => {
    expect(sentencesOf('He said "hi." Then left.')).toEqual(['He said "hi." Then left']);
  });

  it('scans long terminator runs in linear time', () => {
    expect(sentencesOf(`${'!'.repeat(10000)}`)).toEqual([]);
    expect(sentencesOf(`Go${'!'.repeat(10000)} now.`)).toEqual(['Go', 'now']);
  });
});

describe('wordsOf', () => {
  it('keeps apostrophes and hyphens inside tokens', () => {
    expect(wordsOf("It's a well-known fact")).toEqual(["it's", 'a', 'well-known', 'fact']);
  });

  it('handles curly apostrophes', () => {
    expect(wordsOf('don’t stop')).toEqual(['don’t', 'stop']);
  });

  it('excludes numerals and symbols', () => {
    expect(wordsOf('In 2024, sales rose 45% (!)')).toEqual(['in', 'sales', 'rose']);
  });

  it('returns an empty list when there are no words', () => {
    expect(wordsOf('123 456 !!!')).toEqual([]);
    expect(wordsOf('')).toEqual([]);
  });
});

describe('syllablesOf', () => {
  it('counts vowel groups', () => {
    expect(syllablesOf('quick')).toBe(1);
    expect(syllablesOf('over')).toBe(2);
    expect(syllablesOf('lazy')).toBe(2);
    expect(syllablesOf('environmental')).toBe(5);
  });

  it('subtracts a trailing silent e but keeps the le ending', () => {
    expect(syllablesOf('made')).toBe(1);
    expect(syllablesOf('little')).toBe(2);
  });

  it('never returns fewer than one syllable', () => {
    expect(syllablesOf('strengths')).toBe(1);
    expect(syllablesOf('a')).toBe(1);
    expect(syllablesOf('sky')).toBe(1);
    expect(syllablesOf('tsk')).toBe(1);
  });

  it('collapses adjacent vowels into one group', () => {
    expect(syllablesOf('aeiou')).toBe(1);
    expect(syllablesOf('idea')).toBe(2);
  });
});

describe('meanOf and stdevOf', () => {
  it('computes the arithmetic mean', () => {
    expect(meanOf([1, 2, 3])).toBe(2);
  });

  it('computes the population standard deviation', () => {
    expect(stdevOf([1, 2, 3])).toBeCloseTo(0.8164965, 6);
    expect(stdevOf([4, 4, 4])).toBe(0);
  });

  it('returns zero deviation for an empty sample', () => {
    expect(stdevOf([])).toBe(0);
  });
});

describe('rounding helpers', () => {
  it('rounds to two and one decimal place', () => {
    expect(round2(1.0050001)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
    expect(round1(10.14)).toBe(10.1);
    expect(round1(10.16)).toBe(10.2);
  });
});

describe('fleschReadingEase and fleschKincaidGrade', () => {
  it('reproduce the formulas on a one-sentence three-word sample', () => {
    // "Dogs run fast." -> 3 words, 3 syllables, 1 sentence.
    expect(fleschReadingEase(3, 1, 3)).toBe(119.19);
    expect(fleschKincaidGrade(3, 1, 3)).toBe(-2.62);
  });

  it('reproduce the formulas on the classic nine-word pangram', () => {
    // "The quick brown fox jumps over the lazy dog." -> 9 words, 11 syllables.
    expect(fleschReadingEase(9, 1, 11)).toBe(94.3);
    expect(fleschKincaidGrade(9, 1, 11)).toBe(2.34);
  });
});

describe('baseProfile', () => {
  it('counts words, sentences and paragraphs across blank-line breaks', () => {
    const text = 'One two three.\n\nFour five six seven eight.';
    const tokens = wordsOf(text);
    const sentences = sentencesOf(text);
    const profile = baseProfile(text, tokens, sentences);
    expect(profile.words).toBe(8);
    expect(profile.sentences).toBe(2);
    expect(profile.paragraphs).toBe(2);
    expect(profile.avgWordsPerSentence).toBe(4);
    expect(profile.avgWordLength).toBe(4);
    expect(profile.sentenceLengthStdDev).toBe(1);
    expect(profile.longWordShare).toBe(0);
    expect(profile.syllablesPerWord).toBe(1.13);
  });

  it('does not split on single newlines', () => {
    const text = 'One two.\nThree four.';
    expect(baseProfile(text, wordsOf(text), sentencesOf(text)).paragraphs).toBe(1);
  });

  it('measures long words from syllable counts', () => {
    const text = 'Researchers documented unprecedented deterioration in cities.';
    const profile = baseProfile(text, wordsOf(text), sentencesOf(text));
    expect(profile.longWordShare).toBe(0.67);
  });
});

describe('MAX_TEXT_LENGTH', () => {
  it('caps analysed input at four thousand characters', () => {
    expect(MAX_TEXT_LENGTH).toBe(4_000);
  });
});
