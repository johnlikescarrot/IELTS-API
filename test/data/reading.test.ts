import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { READING_CONTENT } from '../../src/data/reading-content.js';
import {
  READING_DATASET,
  READING_LEVELS,
  READING_QUESTION_TYPES,
  READING_TOPICS,
  readingEntry,
  readingExercise,
  readingStats,
  searchReading,
} from '../../src/data/reading.js';
import { gradeReading, normalizeReadingAnswer } from '../../src/lib/reading.js';

const entries = READING_CONTENT;

describe('original reading collection integrity', () => {
  it('pins actual counts, levels, types, topics and the complete content hash', () => {
    expect(readingStats()).toEqual({
      exercises: 6,
      questions: 36,
      byLevel: { foundation: 2, intermediate: 2, advanced: 2 },
      byQuestionType: { 'single-choice': 12, 'true-false-not-given': 12, 'short-answer': 12 },
    });
    expect(READING_DATASET.sha256).toBe(createHash('sha256').update(JSON.stringify(entries)).digest('hex'));
    expect(READING_DATASET.license).toBe('CC-BY-4.0');
    expect(READING_DATASET.limitation).toContain('uncalibrated');
    expect(READING_TOPICS).toEqual([
      'community',
      'education',
      'environment',
      'science',
      'technology',
      'transport',
    ]);
    expect(new Set(entries.map(({ exercise }) => exercise.id)).size).toBe(entries.length);
  });

  for (const { exercise, solutions } of entries) {
    it(`${exercise.id}: has unique IDs, valid keys and genuine paragraph evidence`, () => {
      expect(exercise.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(READING_LEVELS).toContain(exercise.level);
      expect(exercise.suggestedMinutes).toBeGreaterThan(0);
      expect(exercise.paragraphs.length).toBeGreaterThan(1);
      expect(exercise.questions).toHaveLength(6);
      expect(solutions).toHaveLength(exercise.questions.length);
      expect(new Set(exercise.questions.map((question) => question.id)).size).toBe(exercise.questions.length);
      expect(new Set(solutions.map((solution) => solution.questionId)).size).toBe(solutions.length);
      expect(solutions.map((solution) => solution.questionId)).toEqual(
        exercise.questions.map((question) => question.id),
      );
      for (const question of exercise.questions) {
        expect(question.prompt.length).toBeGreaterThan(10);
        expect(READING_QUESTION_TYPES).toContain(question.type);
        const solution = solutions.find((item) => item.questionId === question.id)!;
        expect(solution.acceptedAnswers.length).toBeGreaterThan(0);
        expect(solution.explanation.length).toBeGreaterThan(30);
        expect(solution.evidenceParagraphs.length).toBeGreaterThan(0);
        for (const paragraph of solution.evidenceParagraphs) {
          expect(Number.isInteger(paragraph)).toBe(true);
          expect(paragraph).toBeGreaterThanOrEqual(1);
          expect(paragraph).toBeLessThanOrEqual(exercise.paragraphs.length);
        }
        if (question.type === 'single-choice') {
          expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
          for (const answer of solution.acceptedAnswers)
            expect(question.options.map((option) => option.id)).toContain(answer);
        }
        if (question.type === 'true-false-not-given') {
          expect(['TRUE', 'FALSE', 'NOT GIVEN']).toContain(solution.acceptedAnswers[0]);
        }
        if (question.type === 'short-answer') {
          for (const answer of solution.acceptedAnswers) {
            expect(normalizeReadingAnswer(answer).split(' ').length).toBeLessThanOrEqual(question.maxWords);
          }
        }
      }
    });

    it(`${exercise.id}: every accepted variant earns exactly one mark`, () => {
      const answers = solutions.map((solution) => ({
        questionId: solution.questionId,
        answer: solution.acceptedAnswers[0]!,
      }));
      const grade = gradeReading(exercise.id, { answers });
      expect(grade.correct).toBe(exercise.questions.length);
      expect(grade.percentage).toBe(100);
      expect(grade.incorrect).toBe(0);
      expect(grade.unanswered).toBe(0);
      for (const solution of solutions) {
        for (const answer of solution.acceptedAnswers) {
          const result = gradeReading(exercise.id, {
            answers: [{ questionId: solution.questionId, answer }],
          });
          expect(result.correct).toBe(1);
        }
      }
    });
  }

  it('filters by level, topic and case-insensitive text, alone and in combination', () => {
    expect(searchReading()).toHaveLength(6);
    expect(searchReading({ query: 'PHOTOGRAPHS' }).map((item) => item.id)).toEqual(['citizen-rainfall']);
    expect(searchReading({ query: 'nothing-matches-this' })).toEqual([]);
    expect(searchReading({ level: 'foundation' })).toHaveLength(2);
    expect(searchReading({ topic: 'transport' }).map((item) => item.id)).toEqual(['market-bus']);
    expect(searchReading({ level: 'foundation', topic: 'science' })).toEqual([]);
    expect(searchReading({ level: 'advanced', topic: 'science', query: 'rainfall' })).toHaveLength(1);
    expect(searchReading().map((item) => item.id)).toEqual(
      searchReading()
        .map((item) => item.id)
        .sort(),
    );
  });

  it('does not expose solutions through public views or let callers mutate the shared records', () => {
    const list = searchReading();
    expect(JSON.stringify(list)).not.toContain('acceptedAnswers');
    list[0]!.title = 'mutated';
    const exercise = readingExercise('library-of-things');
    expect(exercise).not.toHaveProperty('solutions');
    exercise.paragraphs[0] = 'mutated';
    const record = readingEntry('library-of-things');
    record.solutions[0]!.acceptedAnswers[0] = 'mutated';
    expect(searchReading()[0]!.title).not.toBe('mutated');
    expect(readingExercise('library-of-things').paragraphs[0]).not.toBe('mutated');
    expect(readingEntry('library-of-things').solutions[0]!.acceptedAnswers).toEqual(['B']);
  });

  it('rejects unknown IDs, including prototype property names', () => {
    for (const id of ['unknown', '__proto__', 'constructor', ''])
      expect(() => readingEntry(id)).toThrow('Unknown reading exercise');
  });
});
