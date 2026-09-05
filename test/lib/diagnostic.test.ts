import { describe, expect, it } from 'vitest';

import {
  CHOICE_LETTERS,
  DEFAULT_QUESTIONS,
  DIAGNOSTIC_FORMATS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  allocateFormats,
  buildQuiz,
  evaluateQuiz,
  rateAccuracy,
  testableEntries,
  wilsonInterval,
} from '../../src/lib/diagnostic.js';

import type { DiagnosticQuiz, TestableEntry } from '../../src/lib/diagnostic.js';

/** Derive the answer string that scores full marks on a quiz. */
function correctAnswers(quiz: DiagnosticQuiz): string[] {
  const entries = testableEntries();
  return quiz.questions.map((question) => {
    const entry = entries.find((candidate) => candidate.id === question.entryId) as TestableEntry;
    if (question.format === 'spelling') {
      return entry.word;
    }
    const text = question.format === 'meaning-choice' ? entry.definition : entry.word;
    const position = (question.choices as readonly string[]).indexOf(text);
    return CHOICE_LETTERS[position] as string;
  });
}

describe('testableEntries', () => {
  it('keeps the entries with a published gloss', () => {
    const entries = testableEntries();
    expect(entries.length).toBeGreaterThan(4000);
    for (const entry of entries) {
      expect(typeof entry.definition).toBe('string');
      expect(entry.definition.length).toBeGreaterThan(0);
    }
  });
});

describe('allocateFormats', () => {
  it('splits counts by largest remainder', () => {
    expect(allocateFormats(12, [...DIAGNOSTIC_FORMATS])).toEqual({
      'meaning-choice': 4,
      'word-choice': 4,
      spelling: 4,
    });
    expect(allocateFormats(10, [...DIAGNOSTIC_FORMATS])).toEqual({
      'meaning-choice': 4,
      'word-choice': 3,
      spelling: 3,
    });
  });

  it('renormalises the shares over a subset of formats', () => {
    expect(allocateFormats(10, ['spelling'])).toEqual({
      'meaning-choice': 0,
      'word-choice': 0,
      spelling: 10,
    });
    const split = allocateFormats(7, ['meaning-choice', 'word-choice']);
    expect(split['meaning-choice'] + split['word-choice']).toBe(7);
    expect(split.spelling).toBe(0);
  });

  it('yields zeros for empty formats and empty counts', () => {
    expect(allocateFormats(10, [])).toEqual({
      'meaning-choice': 0,
      'word-choice': 0,
      spelling: 0,
    });
    expect(allocateFormats(0, [...DIAGNOSTIC_FORMATS])).toEqual({
      'meaning-choice': 0,
      'word-choice': 0,
      spelling: 0,
    });
  });
});

describe('buildQuiz', () => {
  it('is deterministic for identical inputs', () => {
    const first = buildQuiz({ seed: 'seed-1', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    const second = buildQuiz({ seed: 'seed-1', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    expect(second).toEqual(first);
  });

  it('varies with the seed', () => {
    const first = buildQuiz({ seed: 'seed-1', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    const second = buildQuiz({ seed: 'seed-2', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    expect(second).not.toEqual(first);
  });

  it('normalises the format order', () => {
    const canonical = buildQuiz({
      seed: 'order',
      count: 8,
      formats: ['meaning-choice', 'spelling'],
    });
    const reversed = buildQuiz({
      seed: 'order',
      count: 8,
      formats: ['spelling', 'meaning-choice'],
    });
    expect(reversed).toEqual(canonical);
    expect(canonical.formats).toEqual(['meaning-choice', 'spelling']);
  });

  it('samples distinct entries with well-formed questions', () => {
    const quiz = buildQuiz({ seed: 'shape', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    expect(quiz.count).toBe(12);
    expect(quiz.questions).toHaveLength(12);
    const entryIds = quiz.questions.map((question) => question.entryId);
    expect(new Set(entryIds).size).toBe(entryIds.length);
    for (const question of quiz.questions) {
      expect(question.prompt.length).toBeGreaterThan(0);
      if (question.format === 'spelling') {
        expect(question.choices).toBeNull();
        expect(question.hint).toMatch(/letters\./);
      } else {
        expect(question.hint).toBeNull();
        expect(question.choices).toHaveLength(4);
      }
    }
  });

  it('accepts the documented count range', () => {
    expect(MIN_QUESTIONS).toBe(4);
    expect(DEFAULT_QUESTIONS).toBe(12);
    expect(MAX_QUESTIONS).toBe(40);
    expect(
      buildQuiz({ seed: 'edges', count: MIN_QUESTIONS, formats: ['spelling'] }).questions,
    ).toHaveLength(MIN_QUESTIONS);
  });
});

describe('wilsonInterval', () => {
  it('returns a point interval without trials', () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 0 });
  });

  it('brackets the observed accuracy', () => {
    const interval = wilsonInterval(8, 10);
    expect(interval.lower).toBeLessThan(0.8);
    expect(interval.upper).toBeGreaterThan(0.8);
    expect(interval.lower).toBeCloseTo(0.4902, 4);
    expect(interval.upper).toBeCloseTo(0.9433, 4);
  });

  it('clamps to the unit interval at the extremes', () => {
    expect(wilsonInterval(0, 10).lower).toBe(0);
    expect(wilsonInterval(10, 10).upper).toBe(1);
  });

  it('clamps out-of-range counts', () => {
    expect(wilsonInterval(99, 10)).toEqual(wilsonInterval(10, 10));
    expect(wilsonInterval(-5, 10)).toEqual(wilsonInterval(0, 10));
  });
});

describe('rateAccuracy', () => {
  it('applies the pass and excellence thresholds', () => {
    expect(rateAccuracy(0.95)).toBe('excellent');
    expect(rateAccuracy(0.9)).toBe('excellent');
    expect(rateAccuracy(0.85)).toBe('good');
    expect(rateAccuracy(0.8)).toBe('good');
    expect(rateAccuracy(0.79)).toBe('weak');
    expect(rateAccuracy(0)).toBe('weak');
  });
});

describe('evaluateQuiz', () => {
  it('grades a perfect submission as excellent', () => {
    const quiz = buildQuiz({ seed: 'perfect', count: 12, formats: [...DIAGNOSTIC_FORMATS] });
    const report = evaluateQuiz({
      seed: 'perfect',
      count: 12,
      formats: [...DIAGNOSTIC_FORMATS],
      answers: correctAnswers(quiz),
    });
    expect(report.total).toBe(12);
    expect(report.score).toBe(12);
    expect(report.accuracy).toBe(1);
    expect(report.rating).toBe('excellent');
    expect(report.wilson95.upper).toBe(1);
    expect(report.advice).toHaveLength(2);
    expect(report.recommendation.wordsPerDay).toBe(5);
    expect(report.perFormat.reduce((sum, group) => sum + group.total, 0)).toBe(12);
  });

  it('grades an all-wrong submission as weak', () => {
    const report = evaluateQuiz({
      seed: 'weak',
      count: 8,
      formats: [...DIAGNOSTIC_FORMATS],
      answers: Array.from({ length: 8 }, () => 'zzz-no-such-answer'),
    });
    expect(report.score).toBe(0);
    expect(report.accuracy).toBe(0);
    expect(report.rating).toBe('weak');
    expect(report.advice).toHaveLength(3);
    expect(report.advice[2]).toContain('weakest format was');
    expect(report.recommendation.wordsPerDay).toBe(15);
  });

  it('grades a near-pass submission as good', () => {
    const quiz = buildQuiz({ seed: 'good', count: 10, formats: ['spelling'] });
    const answers = correctAnswers(quiz);
    answers[0] = 'zzz-no-such-word';
    answers[1] = 'zzz-no-such-word';
    const report = evaluateQuiz({ seed: 'good', count: 10, formats: ['spelling'], answers });
    expect(report.score).toBe(8);
    expect(report.accuracy).toBe(0.8);
    expect(report.rating).toBe('good');
    expect(report.recommendation.wordsPerDay).toBe(10);
  });

  it('accepts answers case-insensitively', () => {
    const quiz = buildQuiz({ seed: 'case', count: 6, formats: [...DIAGNOSTIC_FORMATS] });
    const lowered = correctAnswers(quiz).map((answer) => `  ${answer.toLowerCase()}  `);
    const report = evaluateQuiz({
      seed: 'case',
      count: 6,
      formats: [...DIAGNOSTIC_FORMATS],
      answers: lowered,
    });
    expect(report.score).toBe(6);
  });

  it('marks invalid choice letters as incorrect', () => {
    const quiz = buildQuiz({ seed: 'letters', count: 4, formats: ['meaning-choice'] });
    const answers = correctAnswers(quiz);
    answers[0] = 'E';
    const report = evaluateQuiz({
      seed: 'letters',
      count: 4,
      formats: ['meaning-choice'],
      answers,
    });
    expect(report.score).toBe(3);
    expect(report.items[0]?.correct).toBe(false);
    expect(report.items[0]?.received).toBe('E');
  });

  it('normalises the format order before grading', () => {
    const quiz = buildQuiz({ seed: 'grade-order', count: 8, formats: ['spelling', 'word-choice'] });
    const canonical = evaluateQuiz({
      seed: 'grade-order',
      count: 8,
      formats: ['word-choice', 'spelling'],
      answers: correctAnswers(quiz),
    });
    expect(canonical.score).toBe(8);
  });

  it('rejects answer strings of the wrong length', () => {
    expect(() =>
      evaluateQuiz({ seed: 'length', count: 8, formats: [...DIAGNOSTIC_FORMATS], answers: ['A'] }),
    ).toThrowError(/Expected 8 answers but received 1/);
  });

  it('tolerates formats that win no questions', () => {
    const report = evaluateQuiz({
      seed: 'single',
      count: 1,
      formats: [...DIAGNOSTIC_FORMATS],
      answers: ['A'],
    });
    expect(report.total).toBe(1);
    expect(report.perFormat).toHaveLength(3);
    expect(report.perFormat.filter((group) => group.total === 0)).toHaveLength(2);
  });

  it('grades an empty quiz as zero without advice on a weakest format', () => {
    const report = evaluateQuiz({ seed: 'empty', count: 0, formats: [], answers: [] });
    expect(report.total).toBe(0);
    expect(report.score).toBe(0);
    expect(report.accuracy).toBe(0);
    expect(report.rating).toBe('weak');
    expect(report.advice).toHaveLength(2);
    expect(report.perFormat).toEqual([]);
  });
});
