import { describe, expect, it } from 'vitest';

import {
  countWords,
  expandKey,
  foldSpelling,
  markAnswer,
  markSheet,
  normalise,
  withinOneEdit,
} from '../../src/lib/marking.js';

describe('normalise', () => {
  it('lower-cases, strips punctuation and collapses whitespace', () => {
    expect(normalise('  The  River,  Bank. ')).toBe('the river bank');
  });

  it('folds typographic quotes onto their ASCII equivalents before stripping them', () => {
    expect(normalise('\u2018doctor\u2019s\u2019')).toBe('doctor s');
    expect(normalise('\u201cyes\u201d')).toBe('yes');
  });

  it('returns an empty string for punctuation alone', () => {
    expect(normalise('  ...  ')).toBe('');
  });
});

describe('foldSpelling', () => {
  it.each([
    ['colour', 'color'],
    ['organise', 'organize'],
    ['organisation', 'organization'],
    ['organising', 'organizing'],
    ['organised', 'organized'],
    ['analyse', 'analyze'],
    ['centre', 'center'],
    ['colours', 'colors'],
    ['catalogue', 'catalog'],
    ['travelling', 'traveling'],
    ['aeon', 'eon'],
    ['oesophagus', 'esophagus'],
  ])('treats %s and %s as the same answer', (british, american) => {
    expect(foldSpelling(british)).toBe(foldSpelling(american));
  });

  it('leaves words the rules do not touch alone', () => {
    expect(foldSpelling('river bank')).toBe('river bank');
  });
});

describe('countWords', () => {
  it('counts a hyphenated compound as one word', () => {
    expect(countWords('twenty-five')).toBe(1);
  });

  it('counts a number written in digits as one word', () => {
    expect(countWords('2,000')).toBe(1);
  });

  it('counts an empty answer as zero words', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('counts ordinary words', () => {
    expect(countWords('the river bank')).toBe(3);
  });
});

describe('expandKey', () => {
  it('expands a bracketed optional word into both forms', () => {
    expect(expandKey('(the) river bank')).toEqual(['the river bank', 'river bank']);
  });

  it('expands nested and repeated brackets', () => {
    expect(expandKey('(a) big (red) box')).toEqual(['a big red box', 'a big box', 'big red box', 'big box']);
  });

  it('splits alternatives on a slash', () => {
    expect(expandKey('B/C')).toEqual(['b', 'c']);
  });

  it('splits alternatives on a standalone OR', () => {
    expect(expandKey('bicycle OR bike')).toEqual(['bicycle', 'bike']);
  });

  it('deduplicates forms that collapse onto each other', () => {
    expect(expandKey('cat/cat')).toEqual(['cat']);
  });

  it('drops empty alternatives and punctuation-only forms', () => {
    expect(expandKey('cat//,')).toEqual(['cat']);
  });
});

describe('withinOneEdit', () => {
  it('is false for identical strings', () => {
    expect(withinOneEdit('cat', 'cat')).toBe(false);
  });

  it('is true for a single substitution', () => {
    expect(withinOneEdit('cat', 'cot')).toBe(true);
  });

  it('is true for a single insertion at either end', () => {
    expect(withinOneEdit('cat', 'cats')).toBe(true);
    expect(withinOneEdit('cats', 'cat')).toBe(true);
    expect(withinOneEdit('cat', 'scat')).toBe(true);
  });

  it('is false for two edits', () => {
    expect(withinOneEdit('cat', 'dog')).toBe(false);
    expect(withinOneEdit('cat', 'catty')).toBe(false);
    expect(withinOneEdit('abcd', 'axcy')).toBe(false);
  });

  it('is true when the difference is a trailing insertion', () => {
    expect(withinOneEdit('river', 'rivers')).toBe(true);
  });
});

describe('markAnswer', () => {
  it('reports an exact match', () => {
    expect(markAnswer('true', 'true')).toMatchObject({ correct: true, reason: 'exact' });
  });

  it('accepts a different case', () => {
    expect(markAnswer('TRUE', 'true')).toMatchObject({ correct: true, reason: 'case-insensitive' });
  });

  it('accepts a later alternative from the key', () => {
    expect(markAnswer('bike', 'bicycle OR bike')).toMatchObject({
      correct: true,
      reason: 'alternative',
    });
  });

  it('accepts an omitted optional article', () => {
    expect(markAnswer('river bank', '(the) river bank')).toMatchObject({
      correct: true,
      reason: 'optional-word',
    });
    expect(markAnswer('the river bank', 'river bank')).toMatchObject({
      correct: true,
      reason: 'optional-word',
    });
  });

  it('accepts the American spelling of a British key', () => {
    expect(markAnswer('color', 'colour')).toMatchObject({
      correct: true,
      reason: 'spelling-variant',
    });
  });

  it('scores a blank answer as blank rather than incorrect', () => {
    expect(markAnswer('   ', 'cat')).toMatchObject({ correct: false, reason: 'blank' });
  });

  it('scores an over-length answer zero even when it contains the key', () => {
    expect(markAnswer('the big red box', 'red box', { wordLimit: 2 })).toMatchObject({
      correct: false,
      reason: 'over-word-limit',
    });
  });

  it('applies no word limit when none is stated', () => {
    expect(markAnswer('red box', 'red box', {})).toMatchObject({ correct: true });
    expect(markAnswer('red box', 'red box', { wordLimit: undefined })).toMatchObject({ correct: true });
  });

  it('flags a wrong answer within one edit as a near miss', () => {
    expect(markAnswer('rivers bank', '(the) river bank')).toMatchObject({
      correct: false,
      reason: 'incorrect',
      nearMiss: true,
    });
  });

  it('does not flag an unrelated wrong answer as a near miss', () => {
    expect(markAnswer('mountain', 'river bank')).toMatchObject({
      correct: false,
      nearMiss: false,
    });
  });

  it('publishes the accepted forms alongside the verdict', () => {
    expect(markAnswer('x', '(the) cat/dog').accepted).toEqual(['the cat', 'cat', 'dog']);
  });

  it('keeps an article that is the whole answer', () => {
    expect(markAnswer('the', 'the')).toMatchObject({ correct: true });
  });
});

describe('markSheet', () => {
  it('marks a whole sheet and summarises it', () => {
    const sheet = markSheet(
      ['The River Bank', 'true', 'c', 'color', 'rivers', ''],
      ['(the) river bank', 'TRUE', 'B/C', 'colour', 'river', 'cat'],
    );
    expect(sheet.questions).toBe(6);
    expect(sheet.correct).toBe(4);
    expect(sheet.incorrect).toBe(1);
    expect(sheet.blank).toBe(1);
    expect(sheet.nearMisses).toBe(1);
    expect(sheet.accuracy).toBe(0.67);
    expect(sheet.answers.map((entry) => entry.question)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('treats missing trailing answers as blanks', () => {
    const sheet = markSheet(['cat'], ['cat', 'dog', 'bird']);
    expect(sheet.blank).toBe(2);
    expect(sheet.correct).toBe(1);
    expect(sheet.answers[2]?.given).toBe('');
  });

  it('applies a word limit across the whole sheet', () => {
    const sheet = markSheet(['a very long answer'], ['answer'], { wordLimit: 2 });
    expect(sheet.answers[0]?.reason).toBe('over-word-limit');
  });

  it('reports zero accuracy for an empty key rather than dividing by zero', () => {
    const sheet = markSheet([], []);
    expect(sheet).toMatchObject({ questions: 0, correct: 0, accuracy: 0 });
  });

  it('echoes the key verbatim so a client can show the published answer', () => {
    expect(markSheet(['x'], ['(the) CAT']).answers[0]?.expected).toBe('(the) CAT');
  });
});
