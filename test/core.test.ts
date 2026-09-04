import { describe, expect, it } from 'vitest';
import { marksToTarget, overallBand, rawToBand, roundToBand } from '../src/core/bands.ts';
import { bandToCefr, cefrToBand } from '../src/core/cefr.ts';
import { ApiError, unprocessable } from '../src/core/errors.ts';
import { analyzeText, countSyllables, sentences, tokenize } from '../src/core/text.ts';
import { requireEnum, requireNumber, requireObject, requireString } from '../src/core/validate.ts';
import { estimateWriting } from '../src/core/writing.ts';

describe('bands', () => {
  it('rounds to reportable half bands', () => {
    expect(roundToBand(6.1)).toBe(6);
    expect(roundToBand(6.25)).toBe(6.5);
    expect(roundToBand(6.74)).toBe(6.5);
    expect(roundToBand(6.75)).toBe(7);
    expect(roundToBand(-2)).toBe(0);
    expect(roundToBand(12)).toBe(9);
  });

  it('computes the overall band', () => {
    const result = overallBand({ listening: 6.5, reading: 6.5, writing: 5, speaking: 7 });
    expect(result.overall).toBe(6.5);
    expect(result.mean).toBeCloseTo(6.25, 4);
    expect(result.components.writing).toBe(5);
  });

  it('converts raw scores for every module and skill', () => {
    expect(rawToBand(39, 'listening').band).toBe(9);
    expect(rawToBand(30, 'listening').band).toBe(7);
    expect(rawToBand(0, 'listening').band).toBe(0);
    expect(rawToBand(30, 'reading', 'academic').band).toBe(7);
    expect(rawToBand(30, 'reading', 'general').band).toBe(6);
    expect(rawToBand(40, 'reading', 'general').band).toBe(9);
    expect(rawToBand(40, 'listening').nextBandAt).toBeNull();
    expect(rawToBand(23, 'listening').nextBandAt).toBe(26);
  });

  it('computes marks needed to reach a target', () => {
    expect(marksToTarget(30, 7, 'listening')).toBe(0);
    expect(marksToTarget(23, 7, 'listening')).toBe(7);
    expect(marksToTarget(10, 9, 'reading', 'general')).toBe(30);
    expect(marksToTarget(39, 9, 'reading', 'general')).toBe(1);
    expect(marksToTarget(40, 9.5 - 0.5, 'listening')).toBe(0);
  });

  it('needs a perfect score for band 9 in general reading', () => {
    expect(marksToTarget(0, 9, 'reading', 'general')).toBe(40);
    expect(marksToTarget(40, 9, 'reading', 'general')).toBe(0);
  });
});

describe('cefr', () => {
  it('maps bands to levels', () => {
    expect(bandToCefr(9).level).toBe('C2');
    expect(bandToCefr(7.5).level).toBe('C1');
    expect(bandToCefr(6).level).toBe('B2');
    expect(bandToCefr(4.5).level).toBe('B1');
    expect(bandToCefr(3).level).toBe('A2');
    expect(bandToCefr(1).level).toBe('A1');
    expect(bandToCefr(0).level).toBe('A1');
  });

  it('maps levels back to band ranges', () => {
    expect(cefrToBand('c1')?.minBand).toBe(7);
    expect(cefrToBand('ZZ')).toBeUndefined();
  });
});

describe('errors', () => {
  it('serialises to a stable shape', () => {
    const error = unprocessable('nope', { why: 'test' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.toJSON()).toEqual({
      error: { code: 'UNPROCESSABLE', message: 'nope', details: { why: 'test' } },
    });
    expect(new ApiError(400, 'BAD_REQUEST', 'x').details).toEqual({});
  });
});

describe('validate', () => {
  it('accepts and rejects numbers', () => {
    expect(requireNumber('5', 'x', 0, 9)).toBe(5);
    expect(() => requireNumber('abc', 'x', 0, 9)).toThrow(ApiError);
    expect(() => requireNumber(null, 'x', 0, 9)).toThrow(ApiError);
    expect(() => requireNumber(10, 'x', 0, 9)).toThrow(/between/);
  });

  it('accepts and rejects strings', () => {
    expect(requireString('hi', 'x')).toBe('hi');
    expect(() => requireString('   ', 'x')).toThrow(ApiError);
    expect(() => requireString('abcdef', 'x', 3)).toThrow(/at most/);
  });

  it('accepts and rejects enums and objects', () => {
    expect(requireEnum('a', 'x', ['a', 'b'] as const)).toBe('a');
    expect(() => requireEnum('c', 'x', ['a', 'b'] as const)).toThrow(ApiError);
    expect(requireObject({ a: 1 }, 'body')).toEqual({ a: 1 });
    expect(() => requireObject([], 'body')).toThrow(ApiError);
    expect(() => requireObject(null, 'body')).toThrow(ApiError);
  });
});

describe('text', () => {
  it('tokenises and splits sentences', () => {
    expect(tokenize('Hello, world! Fine.')).toEqual(['hello', 'world', 'fine']);
    expect(tokenize('')).toEqual([]);
    expect(sentences('One. Two! Three?')).toHaveLength(3);
    expect(sentences('')).toEqual([]);
  });

  it('counts syllables with the standard heuristic', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('water')).toBe(2);
    expect(countSyllables('education')).toBeGreaterThanOrEqual(3);
    expect(countSyllables('!!!')).toBe(0);
    expect(countSyllables('yes')).toBe(1);
    expect(countSyllables('rhythm')).toBe(1);
    expect(countSyllables('yellow')).toBe(2);
    expect(countSyllables('baked')).toBe(1);
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('brrrr')).toBe(1);
  });

  it('produces metrics for real and empty text', () => {
    const metrics = analyzeText('The city grew.\n\nThen it shrank again, slowly.');
    expect(metrics.words).toBe(8);
    expect(metrics.paragraphs).toBe(2);
    expect(metrics.sentences).toBe(2);
    expect(metrics.typeTokenRatio).toBeGreaterThan(0);

    const empty = analyzeText('   ');
    expect(empty.words).toBe(0);
    expect(empty.typeTokenRatio).toBe(0);
    expect(empty.longWordRatio).toBe(0);
    expect(empty.averageSyllablesPerWord).toBe(0);
  });
});

const strongEssay = `Universities occupy a central place in modern economies, and the question of who should pay for them is significant. In my view, a mixed model is the most sustainable answer.

On the one hand, advocates of free tuition argue that education is a public good. Consequently, when access depends on family wealth, talented students are excluded, and the economy loses the skills it needs. Moreover, countries which fund higher education from general taxation report broader participation.

On the other hand, universal free provision is expensive. Governments must therefore fund infrastructure, research and teaching simultaneously, whereas budgets are finite. For instance, several systems that abolished fees later reduced places, which harmed the very students the policy was meant to help.

In conclusion, although free tuition is attractive, a graduate contribution linked to income seems fairer. Nevertheless, governments should mitigate hardship through grants, because otherwise inequality will inevitably persist.`;

const extendedEssay = `${strongEssay}

Comparative evidence reinforces this position. Nordic administrations subsidise tuition generously, yet their participation gap between richer and poorer households narrowed only marginally, because bottlenecks appear earlier, during secondary schooling. Australia, by contrast, introduced deferred repayment loans; enrolment expanded rapidly among first-generation applicants, since nobody paid anything upfront. Such comparisons suggest that repayment timing matters more than headline pricing, and that targeted maintenance support outperforms blanket subsidy.

Critics reasonably worry about lifelong indebtedness, particularly where interest accrues faster than wages rise. That risk deserves regulation: thresholds should track median earnings, balances ought to expire after two decades, and part-time learners must not face harsher terms. With those safeguards, contribution schemes remain progressive while protecting research budgets, laboratory equipment, library provision, and the salaries of the teaching staff whose expertise ultimately determines whether graduates flourish.`;

describe('writing', () => {
  it('scores a strong essay highly', () => {
    const result = estimateWriting(strongEssay, 2);
    expect(result.task).toBe(2);
    expect(result.estimatedBand).toBeGreaterThanOrEqual(6);
    expect(result.cohesiveDevicesUsed.length).toBeGreaterThan(4);
    expect(result.academicWordsUsed).toContain('sustainable');
    expect(result.feedback).toHaveLength(1);
    expect(result.disclaimer).toMatch(/Indicative/);
  });

  it('flags weaknesses in a short, repetitive answer', () => {
    const result = estimateWriting('I like it. I like it. I like it.', 1);
    expect(result.task).toBe(1);
    expect(result.estimatedBand).toBeLessThan(6);
    expect(result.feedback.join(' ')).toMatch(/at least 150/);
    expect(result.feedback.join(' ')).toMatch(/three paragraphs/);
    expect(result.feedback.join(' ')).toMatch(/cohesive devices/);
    expect(result.feedback.join(' ')).toMatch(/repetitive/);
  });

  it('flags over-long sentences', () => {
    const long = `${Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ')}.`;
    const result = estimateWriting(long, 2);
    expect(result.feedback.join(' ')).toMatch(/very long/);
  });

  it('rewards paragraphing and caps criteria at band 9', () => {
    const big = `${strongEssay}\n\n${strongEssay}\n\n${strongEssay}`;
    const result = estimateWriting(big, 2);
    expect(result.criteria.coherenceAndCohesion).toBeLessThanOrEqual(9);
    expect(result.criteria.taskAchievement).toBeGreaterThanOrEqual(7);
  });

  it('reports healthy surface features for a complete essay', () => {
    const result = estimateWriting(extendedEssay, 2);
    expect(result.metrics.words).toBeGreaterThanOrEqual(250);
    expect(result.feedback).toEqual([
      'Surface features look healthy. Focus next on argument depth and accuracy.',
    ]);
  });

  it('gives partial credit for two or three paragraphs', () => {
    const two = 'However, cities grow.\n\nMoreover, they change quickly.';
    const one = 'However, cities grow quickly.';
    expect(estimateWriting(two, 2).criteria.coherenceAndCohesion).toBeGreaterThanOrEqual(
      estimateWriting(one, 2).criteria.coherenceAndCohesion,
    );
  });

  it('defaults to task 2', () => {
    expect(estimateWriting(strongEssay).task).toBe(2);
  });
});
