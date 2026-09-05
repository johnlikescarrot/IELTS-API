import { describe, expect, it } from 'vitest';

import {
  GET_TEXT_MAX_CHARACTERS,
  GRADE_TO_CEFR,
  MTLD_FACTOR_THRESHOLD,
  POLYSYLLABLE_MIN_SYLLABLES,
  POST_TEXT_MAX_CHARACTERS,
  analyzeText,
  countParagraphs,
  countSentences,
  countSyllables,
  countText,
  gradeToCefr,
  letterCount,
  lexicalDiversity,
  median,
  normalizeToken,
  readabilityScores,
  round2,
  round4,
  tokenize,
} from '../../src/lib/textMetrics.js';

describe('rounding helpers', () => {
  it('round to fixed precision', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(2.5)).toBe(2.5);
    expect(round4(0.12345)).toBe(0.1235);
  });

  it('collapse negative zero', () => {
    expect(Object.is(round2(-0.001), 0)).toBe(true);
    expect(Object.is(round4(-0.00001), 0)).toBe(true);
  });
});

describe('tokenize', () => {
  it('extracts word tokens in order', () => {
    expect(tokenize('Hello, world!')).toEqual(['Hello', 'world']);
  });

  it('keeps internal apostrophes and hyphens', () => {
    expect(tokenize("don't state-of-the-art rock’n’roll e-mail")).toEqual([
      "don't",
      'state-of-the-art',
      'rock’n’roll',
      'e-mail',
    ]);
  });

  it('drops pure digit runs and surrounding punctuation', () => {
    expect(tokenize('In 2024, 3.5 percent rose.')).toEqual(['In', 'percent', 'rose']);
  });

  it('returns an empty list for text without letters', () => {
    expect(tokenize('... 42 ---')).toEqual([]);
  });

  it('handles accented letters', () => {
    expect(tokenize('Café naïve')).toEqual(['Café', 'naïve']);
  });
});

describe('normalizeToken and letterCount', () => {
  it('folds accents and case', () => {
    expect(normalizeToken('Café')).toBe('cafe');
    expect(normalizeToken('ÉCOLE')).toBe('ecole');
  });

  it('counts letters only', () => {
    expect(letterCount("don't")).toBe(4);
    expect(letterCount('state-of-the-art')).toBe(13);
    expect(letterCount('Café')).toBe(4);
  });
});

describe('countSyllables', () => {
  it('counts vowel groups', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('beautiful')).toBe(3);
    expect(countSyllables('information')).toBe(4);
    expect(countSyllables('university')).toBe(5);
  });

  it('applies the silent-final-e correction', () => {
    expect(countSyllables('cake')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  it('keeps syllabic -le, -ee and -ye endings', () => {
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('free')).toBe(1);
    expect(countSyllables('dye')).toBe(1);
  });

  it('never returns less than one', () => {
    expect(countSyllables('brrr')).toBe(1);
  });

  it('ignores apostrophes and hyphens', () => {
    expect(countSyllables("don't")).toBe(1);
  });
});

describe('countSentences', () => {
  it('counts terminal punctuation runs', () => {
    expect(countSentences('One. Two! Three?')).toBe(3);
  });

  it('counts a trailing sentence without a terminator', () => {
    expect(countSentences('One. Two')).toBe(2);
    expect(countSentences('One. Two!')).toBe(2);
  });

  it('counts a bare sentence', () => {
    expect(countSentences('hello')).toBe(1);
  });

  it('returns zero for empty or whitespace-only text', () => {
    expect(countSentences('')).toBe(0);
    expect(countSentences('   \n\t ')).toBe(0);
  });

  it('treats punctuation runs as one boundary', () => {
    expect(countSentences('Wait... What?!')).toBe(2);
  });
});

describe('countParagraphs', () => {
  it('counts blank-line-separated blocks', () => {
    expect(countParagraphs('a\n\nb')).toBe(2);
    expect(countParagraphs('a\n\n\n b \n\n\nc')).toBe(3);
  });

  it('counts one block for an unbroken text', () => {
    expect(countParagraphs('one line')).toBe(1);
    expect(countParagraphs('one\ntwo')).toBe(1);
  });

  it('returns zero for empty text', () => {
    expect(countParagraphs('')).toBe(0);
    expect(countParagraphs('   ')).toBe(0);
  });
});

describe('countText', () => {
  it('aggregates every count in one pass', () => {
    const counts = countText('The quick brown fox jumps over the lazy dog. The dog barked loudly.');
    expect(counts).toEqual({
      characters: 67,
      words: 13,
      uniqueWords: 10,
      sentences: 2,
      paragraphs: 1,
      letters: 53,
      syllables: 17,
      polysyllabicWords: 0,
    });
  });

  it('counts polysyllabic words', () => {
    const counts = countText('Universities internationalise curricula.');
    expect(counts.polysyllabicWords).toBe(3);
  });
});

describe('median', () => {
  it('takes the middle of odd lists', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the middle pair of even lists', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('lexicalDiversity', () => {
  it('returns zeros for an empty token list', () => {
    expect(lexicalDiversity([])).toEqual({
      typeTokenRatio: 0,
      rootTtr: 0,
      mtld: 0,
      hapaxLegomena: 0,
      hapaxRatio: 0,
    });
  });

  it('computes TTR, root TTR and hapax measures', () => {
    const diversity = lexicalDiversity(['the', 'the', 'dog']);
    expect(diversity.typeTokenRatio).toBe(0.6667);
    expect(diversity.rootTtr).toBe(1.1547);
    expect(diversity.hapaxLegomena).toBe(1);
    expect(diversity.hapaxRatio).toBe(0.5);
  });

  it('reports the token count for fully diverse short texts (MTLD upper bound)', () => {
    const diversity = lexicalDiversity(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    expect(diversity.mtld).toBe(10);
    expect(diversity.typeTokenRatio).toBe(1);
  });

  it('closes full factors for repetitive texts', () => {
    const diversity = lexicalDiversity(Array.from({ length: 10 }, () => 'same'));
    expect(diversity.mtld).toBe(2);
  });

  it('handles an exact factor boundary at the end of the text', () => {
    const diversity = lexicalDiversity(['a', 'b', 'a', 'b', 'a', 'b']);
    expect(diversity.mtld).toBe(3);
  });

  it('normalises accents before counting types', () => {
    const diversity = lexicalDiversity(['cafe', 'Café']);
    expect(diversity.hapaxLegomena).toBe(0);
  });
});

describe('readabilityScores', () => {
  it('anchors the six formulae on a known text', () => {
    const counts = countText('The quick brown fox jumps over the lazy dog. The dog barked loudly.');
    const scores = readabilityScores(counts);
    expect(scores).toEqual({
      fleschReadingEase: 89.61,
      fleschKincaidGrade: 2.38,
      gunningFog: 2.6,
      smogIndex: 3.13,
      colemanLiauIndex: 3.62,
      automatedReadabilityIndex: 1.02,
      consensusGrade: 2.6,
    });
  });

  it('scores dense academic prose as university-level', () => {
    const counts = countText(
      'Global warming represents an unprecedented environmental challenge. ' +
        'Governments worldwide must implement comprehensive sustainability policies immediately. ' +
        'Universities should prioritise interdisciplinary research collaborations.',
    );
    const scores = readabilityScores(counts);
    expect(scores.fleschReadingEase).toBe(-82.27);
    expect(scores.consensusGrade).toBe(27.56);
  });

  it('clamps the consensus grade at zero', () => {
    const counts = countText('Cat sat. Dog ran. Mat red. Big top. Sun up.');
    expect(readabilityScores(counts).consensusGrade).toBe(0);
  });
});

describe('gradeToCefr', () => {
  it('maps the documented thresholds', () => {
    expect(gradeToCefr(-2)).toBe('A2');
    expect(gradeToCefr(4)).toBe('A2');
    expect(gradeToCefr(4.5)).toBe('B1');
    expect(gradeToCefr(6)).toBe('B1');
    expect(gradeToCefr(9)).toBe('B2');
    expect(gradeToCefr(12)).toBe('C1');
    expect(gradeToCefr(12.5)).toBe('C2');
    expect(gradeToCefr(99)).toBe('C2');
  });

  it('exposes the threshold table for the reference endpoint', () => {
    expect(GRADE_TO_CEFR).toEqual([
      { maxGrade: 4, cefr: 'A2' },
      { maxGrade: 6, cefr: 'B1' },
      { maxGrade: 9, cefr: 'B2' },
      { maxGrade: 12, cefr: 'C1' },
    ]);
  });
});

describe('analyzeText', () => {
  it('returns null metrics for text without words', () => {
    const analysis = analyzeText('... 42 ---');
    expect(analysis.counts.words).toBe(0);
    expect(analysis.averages).toBeNull();
    expect(analysis.lexical).toBeNull();
    expect(analysis.readability).toBeNull();
    expect(analysis.cefr).toBeNull();
  });

  it('returns null metrics for an empty string', () => {
    const analysis = analyzeText('');
    expect(analysis.counts.characters).toBe(0);
    expect(analysis.readability).toBeNull();
  });

  it('analyses a full text end to end', () => {
    const analysis = analyzeText('The quick brown fox jumps over the lazy dog. The dog barked loudly.');
    expect(analysis.averages).toEqual({ wordLength: 4.08, sentenceLength: 6.5, syllablesPerWord: 1.31 });
    expect(analysis.cefr).toBe('A2');
    expect(analysis.lexical?.mtld).toBeGreaterThan(0);
    expect(analysis.readability?.consensusGrade).toBe(2.6);
  });

  it('maps dense prose to C2', () => {
    const analysis = analyzeText(
      'Global warming represents an unprecedented environmental challenge. ' +
        'Governments worldwide must implement comprehensive sustainability policies immediately.',
    );
    expect(analysis.cefr).toBe('C2');
  });

  it('exposes the document limits', () => {
    expect(GET_TEXT_MAX_CHARACTERS).toBe(8000);
    expect(POST_TEXT_MAX_CHARACTERS).toBe(50000);
    expect(MTLD_FACTOR_THRESHOLD).toBe(0.72);
    expect(POLYSYLLABLE_MIN_SYLLABLES).toBe(3);
  });
});
