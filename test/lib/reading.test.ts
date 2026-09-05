import { describe, expect, it } from 'vitest';

import {
  gradeReading,
  MAX_READING_ANSWER_LENGTH,
  normalizeReadingAnswer,
  parseReadingSubmission,
} from '../../src/lib/reading.js';

const ids = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

describe('reading answer normalization', () => {
  it('normalizes canonical Unicode, case and whitespace without semantic guessing', () => {
    expect(normalizeReadingAnswer('  NOT\u00a0\tGIVEN\n')).toBe('not given');
    expect(normalizeReadingAnswer('CAFE\u0301')).toBe('café');
    expect(normalizeReadingAnswer(' 15.5% ')).toBe('15.5%');
    expect(normalizeReadingAnswer("learner's")).toBe("learner's");
    expect(normalizeReadingAnswer('not_given')).toBe('not_given');
    expect(normalizeReadingAnswer('café')).not.toBe(normalizeReadingAnswer('cafe'));
    expect(normalizeReadingAnswer('-7')).not.toBe(normalizeReadingAnswer('7'));
  });
});

describe('strict reading submissions', () => {
  it.each([
    undefined,
    null,
    true,
    42,
    'answers',
    [],
    {},
    { other: [] },
    { answers: {} },
    { answers: null },
    { answers: [], learnerId: 'do-not-collect' },
  ])('rejects an invalid outer shape: %j', (body) => {
    expect(() => parseReadingSubmission(body, ids)).toThrow('only an answers array');
  });

  it.each([
    null,
    [],
    'B',
    {},
    { questionId: 'q1' },
    { questionId: 'q1', other: 'B' },
    { answer: 'B', other: 'q1' },
    { questionId: 1, answer: 'B' },
    { questionId: 'q1', answer: 2 },
    { questionId: 'q1', answer: null },
    { questionId: 'q1', answer: ['B'] },
    { questionId: 'q1', answer: 'B', extra: true },
  ])('rejects an invalid answer shape: %j', (answer) => {
    expect(() => parseReadingSubmission({ answers: [answer] }, ids)).toThrow(
      'only string questionId and answer',
    );
  });

  it('rejects unknown, duplicate and excessive responses instead of awarding partial results', () => {
    for (const questionId of ['q0', 'q999', '__proto__', 'constructor']) {
      expect(() => parseReadingSubmission({ answers: [{ questionId, answer: 'B' }] }, ids)).toThrow(
        'unknown question',
      );
    }
    expect(() =>
      parseReadingSubmission(
        {
          answers: [
            { questionId: 'q1', answer: 'B' },
            { questionId: 'q1', answer: 'C' },
          ],
        },
        ids,
      ),
    ).toThrow('at most once');
    expect(() =>
      parseReadingSubmission(
        { answers: Array.from({ length: 7 }, () => ({ questionId: 'q1', answer: 'B' })) },
        ids,
      ),
    ).toThrow('more submitted answers than questions');
  });

  it('accepts empty submissions and enforces a code-point, not byte, answer limit', () => {
    expect(parseReadingSubmission({ answers: [] }, ids)).toEqual({ answers: [] });
    const answer = '🌱'.repeat(MAX_READING_ANSWER_LENGTH);
    expect(parseReadingSubmission({ answers: [{ questionId: 'q1', answer }] }, ids).answers[0]!.answer).toBe(
      answer,
    );
    expect(() =>
      parseReadingSubmission({ answers: [{ questionId: 'q1', answer: `${answer}x` }] }, ids),
    ).toThrow('256 characters');
  });
});

describe('deterministic reading feedback', () => {
  it('distinguishes correct, incorrect, unanswered and over-limit answers', () => {
    const body = {
      answers: [
        { questionId: 'q1', answer: ' b ' },
        { questionId: 'q2', answer: 'A' },
        { questionId: 'q3', answer: 'FALSE' },
        { questionId: 'q4', answer: 'not   given' },
        { questionId: 'q5', answer: 'seven days' },
        { questionId: 'q6', answer: '\t\n ' },
      ],
    };
    const result = gradeReading('library-of-things', body);
    expect(result).toMatchObject({
      exerciseId: 'library-of-things',
      correct: 3,
      incorrect: 2,
      unanswered: 1,
      total: 6,
      percentage: 50,
    });
    expect(result.feedback.map((item) => item.outcome)).toEqual([
      'correct',
      'incorrect',
      'correct',
      'correct',
      'word-limit-exceeded',
      'unanswered',
    ]);
    expect(result).toEqual(gradeReading('library-of-things', body));
    expect(result).toEqual(gradeReading('library-of-things', { answers: [...body.answers].reverse() }));
    expect(result).not.toHaveProperty('band');
    expect(result.feedback[3]).toMatchObject({ acceptedAnswers: ['NOT GIVEN'], evidenceParagraphs: [2] });
  });

  it('gives omitted questions zero marks and rounds percentages to two decimal places', () => {
    expect(gradeReading('library-of-things', { answers: [] })).toMatchObject({
      correct: 0,
      incorrect: 0,
      unanswered: 6,
      percentage: 0,
    });
    expect(gradeReading('library-of-things', { answers: [{ questionId: 'q5', answer: '7' }] })).toMatchObject(
      { correct: 1, unanswered: 5, percentage: 16.67 },
    );
  });

  it('accepts only listed variants and option IDs, without stripping meaningful characters', () => {
    for (const answer of ['7.', '-7', 'seven!', 'sevn']) {
      expect(gradeReading('library-of-things', { answers: [{ questionId: 'q5', answer }] }).correct).toBe(0);
    }
    expect(
      gradeReading('library-of-things', {
        answers: [{ questionId: 'q1', answer: 'An adult who shows a library card' }],
      }).correct,
    ).toBe(0);
    expect(
      gradeReading('library-of-things', { answers: [{ questionId: 'q4', answer: 'not_given' }] }).correct,
    ).toBe(0);
  });

  it('does not echo submitted text and cannot mutate later feedback', () => {
    const result = gradeReading('library-of-things', {
      answers: [{ questionId: 'q1', answer: 'private-sentinel-answer' }],
    });
    expect(JSON.stringify(result)).not.toContain('private-sentinel-answer');
    result.feedback[0]!.acceptedAnswers[0] = 'mutated';
    expect(gradeReading('library-of-things', { answers: [] }).feedback[0]!.acceptedAnswers).toEqual(['B']);
  });
});
