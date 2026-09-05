import { describe, expect, it } from 'vitest';

import {
  analyseText,
  countSyllables,
  COMPLEX_WORD_SYLLABLES,
  MAX_TEXT_LENGTH,
  normaliseParagraphs,
  normaliseText,
  round,
  splitSentences,
  tokenizeWords,
} from '../../src/lib/text.js';

describe('normaliseText', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normaliseText('  a \n\t b  ')).toBe('a b');
  });

  it('returns an empty string for blank input', () => {
    expect(normaliseText('   \n  ')).toBe('');
  });
});

describe('normaliseParagraphs', () => {
  it('keeps blank lines between paragraphs', () => {
    expect(normaliseParagraphs('one   line\n\n\n  two  line ')).toBe('one line\n\ntwo line');
  });

  it('normalises CRLF and lone CR line endings', () => {
    expect(normaliseParagraphs('a\r\n\r\nb\r\rc')).toBe('a\n\nb\n\nc');
  });

  it('drops empty paragraphs', () => {
    expect(normaliseParagraphs('\n\n  \n\n a \n\n')).toBe('a');
  });
});

describe('splitSentences', () => {
  it('splits on terminators and collapses runs', () => {
    expect(splitSentences('One. Two!! Three?  ')).toEqual(['One', 'Two', 'Three']);
  });

  it('treats unterminated text as a single sentence', () => {
    expect(splitSentences('no terminator here')).toEqual(['no terminator here']);
  });

  it('returns an empty list for punctuation only', () => {
    expect(splitSentences('... !!')).toEqual([]);
  });

  it('splits on newlines', () => {
    expect(splitSentences('a\nb')).toEqual(['a', 'b']);
  });
});

describe('tokenizeWords', () => {
  it('lower-cases and keeps internal apostrophes and hyphens', () => {
    expect(tokenizeWords("Don't STOP state-of-the-art")).toEqual(["don't", 'stop', 'state-of-the-art']);
  });

  it('ignores digits and punctuation', () => {
    expect(tokenizeWords('42 -- 3.14 ;')).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(tokenizeWords('')).toEqual([]);
  });
});

describe('countSyllables', () => {
  it('returns 0 for a token with no letters', () => {
    expect(countSyllables('123')).toBe(0);
  });

  it('returns 1 for short words', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('a')).toBe(1);
  });

  it('counts vowel groups', () => {
    expect(countSyllables('environment')).toBe(4);
    expect(countSyllables('beautiful')).toBe(3);
  });

  it('strips a silent trailing e', () => {
    expect(countSyllables('house')).toBe(1);
  });

  it('handles -es and -ed inflections that add no syllable', () => {
    expect(countSyllables('houses')).toBe(1);
    expect(countSyllables('walked')).toBe(1);
  });

  it('never returns 0 for a long word with no vowel group left', () => {
    expect(countSyllables('rhythms')).toBeGreaterThanOrEqual(1);
    // No vowel group survives stripping, so the floor of one syllable applies.
    expect(countSyllables('crwths')).toBe(1);
    expect(countSyllables('yyyy')).toBe(1);
  });

  it('treats a leading y as a consonant', () => {
    expect(countSyllables('yellow')).toBe(2);
  });
});

describe('analyseText', () => {
  it('computes every count for a simple text', () => {
    const stats = analyseText('The cat sat. The dog ran quickly.');
    expect(stats.sentences).toBe(2);
    expect(stats.words).toBe(7);
    expect(stats.uniqueWords).toBe(6);
    expect(stats.monosyllables).toBe(6);
    expect(stats.wordsPerSentence).toBeCloseTo(3.5);
    expect(stats.characters).toBe(33);
  });

  it('counts complex words at the documented threshold', () => {
    const stats = analyseText('Environment');
    expect(COMPLEX_WORD_SYLLABLES).toBe(3);
    expect(stats.complexWords).toBe(1);
  });

  it('never divides by zero for wordless input', () => {
    const stats = analyseText('!!!');
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(1);
    expect(stats.wordsPerSentence).toBe(0);
    expect(stats.syllablesPerWord).toBe(0);
    expect(stats.lettersPerWord).toBe(0);
  });

  it('counts letters excluding apostrophes', () => {
    expect(analyseText("don't").letters).toBe(4);
  });
});

describe('round', () => {
  it('rounds to two places by default', () => {
    expect(round(1.23456)).toBe(1.23);
  });

  it('honours an explicit precision', () => {
    expect(round(1.23456, 4)).toBe(1.2346);
  });

  it('never returns negative zero', () => {
    expect(Object.is(round(-0.0001), 0)).toBe(true);
  });
});

describe('MAX_TEXT_LENGTH', () => {
  it('is the documented input budget', () => {
    expect(MAX_TEXT_LENGTH).toBe(5000);
  });
});
