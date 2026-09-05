import { describe, expect, it } from 'vitest';

import {
  MAX_TEXT_LENGTH,
  countSyllables,
  countText,
  diversity,
  mtld,
  readability,
  sentenceStats,
  splitSentences,
  tokenize,
  topFrequencies,
} from '../../src/lib/text.js';

const SAMPLE =
  'Education is essential. However, universities must remain accessible; otherwise inequality grows. ' +
  'Governments therefore subsidise tuition, and students repay contributions gradually!';

describe('tokenize', () => {
  it('lower-cases and keeps internal apostrophes', () => {
    expect(tokenize("Don't STOP believing")).toEqual(["don't", 'stop', 'believing']);
  });

  it('normalises typographic apostrophes', () => {
    expect(tokenize('it\u2019s')).toEqual(["it's"]);
  });

  it('drops digits and punctuation', () => {
    expect(tokenize('42 apples, 7 pears.')).toEqual(['apples', 'pears']);
  });

  it('returns an empty list for text without words', () => {
    expect(tokenize('123 !!! ---')).toEqual([]);
  });
});

describe('splitSentences', () => {
  it('splits on terminal punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toHaveLength(3);
  });

  it('splits on newlines', () => {
    expect(splitSentences('One\nTwo')).toHaveLength(2);
  });

  it('discards fragments without letters', () => {
    expect(splitSentences('Real sentence. ... 123')).toEqual(['Real sentence.']);
  });

  it('returns an empty list for empty input', () => {
    expect(splitSentences('')).toEqual([]);
  });
});

describe('countSyllables', () => {
  it('returns zero for input without letters', () => {
    expect(countSyllables('1234')).toBe(0);
  });

  it('treats short words as monosyllabic', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('a')).toBe(1);
  });

  it('counts vowel groups in longer words', () => {
    expect(countSyllables('education')).toBeGreaterThanOrEqual(3);
    expect(countSyllables('university')).toBeGreaterThanOrEqual(4);
  });

  it('handles a consonant + le ending', () => {
    expect(countSyllables('little')).toBe(2);
    expect(countSyllables('table')).toBe(2);
  });

  it('strips a leading y', () => {
    expect(countSyllables('yellow')).toBe(2);
  });

  it('never returns less than one for a real word', () => {
    expect(countSyllables('rhythms')).toBeGreaterThanOrEqual(1);
  });

  it('counts a vowel-less word as one syllable', () => {
    expect(countSyllables('crwths')).toBe(1);
  });
});

describe('countText', () => {
  it('counts words, types, sentences and syllables', () => {
    const counts = countText(SAMPLE);
    expect(counts.words).toBeGreaterThan(15);
    expect(counts.types).toBeLessThanOrEqual(counts.words);
    expect(counts.sentences).toBe(3);
    expect(counts.syllables).toBeGreaterThan(counts.words);
    expect(counts.polysyllables).toBeGreaterThan(0);
    expect(counts.longWords).toBeGreaterThan(0);
    expect(counts.characters).toBeGreaterThan(0);
  });

  it('returns zeros for text without words', () => {
    expect(countText('!!!')).toEqual({
      characters: 0,
      words: 0,
      types: 0,
      sentences: 0,
      syllables: 0,
      polysyllables: 0,
      longWords: 0,
    });
  });
});

describe('readability', () => {
  it('produces finite scores for real text', () => {
    const scores = readability(countText(SAMPLE));
    for (const value of Object.values(scores)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(scores.fleschReadingEase).toBeLessThan(80);
    expect(scores.consensusGrade).toBeGreaterThan(5);
  });

  it('returns zeros rather than NaN for empty text', () => {
    const scores = readability(countText(''));
    expect(Object.values(scores).every((value) => value === 0)).toBe(true);
  });

  it('rates simple prose as easier than academic prose', () => {
    const simple = readability(countText('The cat sat. The dog ran. We had fun.'));
    const academic = readability(countText(SAMPLE));
    expect(simple.fleschReadingEase).toBeGreaterThan(academic.fleschReadingEase);
  });
});

describe('mtld', () => {
  it('returns zero for no tokens', () => {
    expect(mtld([])).toBe(0);
  });

  it('is higher for diverse text than for repetitive text', () => {
    const repetitive = Array.from({ length: 100 }, () => 'the');
    const diverse = Array.from({ length: 100 }, (_unused, index) => `word${String(index)}`);
    expect(mtld(diverse)).toBeGreaterThan(mtld(repetitive));
  });

  it('falls back to the sequence length when no factor completes', () => {
    expect(mtld(['alpha', 'beta'], 0)).toBe(2);
  });
});

describe('diversity', () => {
  it('returns zeros for no tokens', () => {
    const scores = diversity([]);
    expect(scores.tokens).toBe(0);
    expect(scores.typeTokenRatio).toBe(0);
    expect(scores.hapaxLegomena).toBe(0);
  });

  it('guards the undefined single-type case', () => {
    const scores = diversity(['only']);
    expect(scores.logTypeTokenRatio).toBe(0);
    expect(scores.maasIndex).toBe(0);
  });

  it('computes the standard indices', () => {
    const scores = diversity(tokenize(SAMPLE));
    expect(scores.typeTokenRatio).toBeGreaterThan(0);
    expect(scores.rootTypeTokenRatio).toBeGreaterThan(1);
    expect(scores.logTypeTokenRatio).toBeGreaterThan(0);
    expect(scores.maasIndex).toBeGreaterThanOrEqual(0);
    expect(scores.lexicalDensity).toBeGreaterThan(0);
    expect(scores.hapaxLegomena).toBeGreaterThan(0);
  });
});

describe('topFrequencies', () => {
  it('sorts by count then alphabetically', () => {
    const rows = topFrequencies(['b', 'a', 'a', 'c'], 3);
    expect(rows[0]).toEqual({ word: 'a', count: 2, share: 0.5 });
    expect(rows[1]?.word).toBe('b');
    expect(rows[2]?.word).toBe('c');
  });

  it('respects the limit and tolerates empty input', () => {
    expect(topFrequencies(['a', 'b', 'c'], 1)).toHaveLength(1);
    expect(topFrequencies([], 5)).toEqual([]);
  });
});

describe('sentenceStats', () => {
  it('summarises sentence length', () => {
    const stats = sentenceStats('One two three. Four five.');
    expect(stats.count).toBe(2);
    expect(stats.meanLength).toBe(2.5);
    expect(stats.shortest).toBe(2);
    expect(stats.longest).toBe(3);
    expect(stats.lengthStandardDeviation).toBe(0.5);
  });

  it('returns zeros for text without sentences', () => {
    expect(sentenceStats('')).toEqual({
      count: 0,
      meanLength: 0,
      lengthStandardDeviation: 0,
      shortest: 0,
      longest: 0,
    });
  });
});

describe('constants', () => {
  it('publishes a maximum text length', () => {
    expect(MAX_TEXT_LENGTH).toBe(20000);
  });
});
