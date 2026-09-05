import { describe, expect, it } from 'vitest';

import {
  COMPLEX_WORD_SYLLABLES,
  MIN_READABILITY_WORDS,
  READABILITY_FORMULAE,
  countSentences,
  countSyllables,
  describeReadingEase,
  sentenceSpans,
  measureText,
  splitParagraphs,
  stripMarkup,
  tokenize,
} from '../../src/lib/text.js';

describe('stripMarkup', () => {
  it('removes tags, decodes entities and collapses whitespace', () => {
    expect(stripMarkup('<p>Tom  &amp; Jerry</p>\n<b>run</b>')).toBe('Tom & Jerry run');
  });

  it('decodes every supported entity', () => {
    expect(stripMarkup('&nbsp;&quot;&#39;&lt;&gt;')).toBe('"\'<>');
  });

  it('decodes in a single pass, so entities are never double-unescaped', () => {
    expect(stripMarkup('&amp;lt;')).toBe('&lt;');
    expect(stripMarkup('&amp;amp;')).toBe('&amp;');
  });

  it('handles a long run of unclosed angle brackets in linear time', () => {
    const started = Date.now();
    expect(stripMarkup(`${'<'.repeat(50_000)}x`)).toBe(`${'<'.repeat(50_000)}x`);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

describe('sentenceSpans', () => {
  it('splits on terminator runs followed by whitespace', () => {
    expect(sentenceSpans('One. Two!! Three?')).toEqual(['One.', 'Two!!', 'Three?']);
  });

  it('does not split inside a decimal number', () => {
    expect(sentenceSpans('Pi is 3.14 exactly.')).toEqual(['Pi is 3.14 exactly.']);
  });

  it('keeps a trailing fragment with no terminator', () => {
    expect(sentenceSpans('One. and a tail')).toEqual(['One.', 'and a tail']);
  });

  it('drops empty spans and returns nothing for punctuation only', () => {
    expect(sentenceSpans('   ')).toEqual([]);
    expect(sentenceSpans('. . .')).toEqual(['.', '.', '.']);
  });

  it('handles a long run of terminators in linear time', () => {
    const started = Date.now();
    expect(sentenceSpans('!'.repeat(50_000))).toEqual(['!'.repeat(50_000)]);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

describe('tokenize', () => {
  it('keeps apostrophes and hyphens inside words', () => {
    expect(tokenize("don't state-of-the-art 1984 ok")).toEqual(["don't", 'state-of-the-art', 'ok']);
  });

  it('returns an empty list when there are no words', () => {
    expect(tokenize('123 --- !!!')).toEqual([]);
  });
});

describe('countSentences', () => {
  it('counts terminators', () => {
    expect(countSentences('One. Two! Three?')).toBe(3);
  });

  it('never returns fewer than one', () => {
    expect(countSentences('no terminator here')).toBe(1);
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(splitParagraphs('a\n\n  \n\nb\n')).toEqual(['a', 'b']);
  });

  it('returns an empty list for blank input', () => {
    expect(splitParagraphs('   ')).toEqual([]);
  });
});

describe('countSyllables', () => {
  it.each([
    ['cat', 1],
    ['water', 2],
    ['education', 4],
    ['make', 1],
    ['little', 2],
    ['see', 1],
    ['bye', 1],
    ['rhythm', 1],
    ['e', 1],
  ])('counts %s as %i syllables', (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});

describe('measureText', () => {
  const passage = [
    'The city council approved a new transport plan.',
    'Residents welcomed the decision because congestion had become intolerable.',
    'Nevertheless, several businesses objected to the additional restrictions on delivery vehicles.',
  ].join(' ');

  it('returns null when there are no words', () => {
    expect(measureText('123 !!!')).toBeNull();
  });

  it('measures a passage', () => {
    const measurement = measureText(passage);
    expect(measurement).not.toBeNull();
    const result = measurement as NonNullable<typeof measurement>;
    expect(result.sentences).toBe(3);
    expect(result.paragraphs).toBe(1);
    expect(result.words).toBeGreaterThan(MIN_READABILITY_WORDS);
    expect(result.reliable).toBe(true);
    expect(result.complexWords).toBeGreaterThan(0);
    expect(result.syllables).toBeGreaterThan(result.words);
    expect(result.typeTokenRatio).toBeLessThanOrEqual(1);
    expect(result.meanGradeLevel).toBeGreaterThan(0);
  });

  it('counts paragraphs separated by blank lines', () => {
    const measurement = measureText('First paragraph here.\n\nSecond paragraph here.');
    expect((measurement as NonNullable<typeof measurement>).paragraphs).toBe(2);
  });

  it('flags short samples as unreliable', () => {
    const measurement = measureText('Too short.');
    expect((measurement as NonNullable<typeof measurement>).reliable).toBe(false);
  });

  it('reproduces the pipeline used for the practice-test index', () => {
    // Hand-checked against scripts/extract_practice_tests.py for the same input.
    const measurement = measureText('The cat sat on the mat. The dog ran away.');
    const result = measurement as NonNullable<typeof measurement>;
    expect(result.words).toBe(10);
    expect(result.sentences).toBe(2);
    expect(result.avgSentenceLength).toBe(5);
    expect(result.avgSyllablesPerWord).toBe(1.1);
    expect(result.fleschReadingEase).toBe(108.7);
  });
});

describe('describeReadingEase', () => {
  it.each([
    [95, 'very easy'],
    [85, 'easy'],
    [75, 'fairly easy'],
    [65, 'plain English'],
    [55, 'fairly difficult'],
    [40, 'difficult'],
    [10, 'very difficult'],
    [-50, 'very difficult'],
  ])('describes %i as %s', (ease, label) => {
    expect(describeReadingEase(ease).label).toBe(label);
    expect(describeReadingEase(ease).cefr).toMatch(/^[ABC][12]/);
  });
});

describe('constants', () => {
  it('publishes a citation for every reported formula', () => {
    expect(Object.keys(READABILITY_FORMULAE)).toHaveLength(6);
    for (const citation of Object.values(READABILITY_FORMULAE)) {
      expect(citation.length).toBeGreaterThan(20);
    }
    expect(COMPLEX_WORD_SYLLABLES).toBe(3);
  });
});
