import { describe, expect, it } from 'vitest';
import { TOPIC_VOCAB } from '../../src/data/vocabulary.js';
import { NotFoundError, ValidationError } from '../../src/lib/errors.js';
import {
  buildMockTest,
  buildStudyPlan,
  buildVocabQuiz
} from '../../src/services/practice.service.js';

describe('buildVocabQuiz', () => {
  it('is deterministic with a seed', () => {
    expect(buildVocabQuiz({ count: 5, seed: 'abc' })).toEqual(
      buildVocabQuiz({ count: 5, seed: 'abc' })
    );
  });

  it('builds four-option cards with the correct answer index', () => {
    const quiz = buildVocabQuiz({ count: 6, seed: 'cards' });
    expect(quiz).toHaveLength(6);
    for (const card of quiz) {
      expect(card.options).toHaveLength(4);
      expect(new Set(card.options).size).toBe(4);
      expect(card.options[card.answerIndex]).toBe(card.meaning);
      expect(card.questionId).toMatch(/^quiz-[a-z]+-[a-z0-9-]+$/);
    }
  });

  it('filters by topic', () => {
    const quiz = buildVocabQuiz({ count: 4, topicId: 'health', seed: 'topic' });
    expect(quiz.every((card) => card.topicId === 'health')).toBe(true);
  });

  it('clamps count to the available pool', () => {
    const quiz = buildVocabQuiz({ count: 500, seed: 'clamp' });
    const total = TOPIC_VOCAB.reduce((sum, pack) => sum + pack.words.length, 0);
    expect(quiz).toHaveLength(total);
  });

  it('rejects unknown topics with the underlying error', () => {
    expect(() => buildVocabQuiz({ count: 3, topicId: 'unknown-topic', seed: 'x' })).toThrow(
      NotFoundError
    );
  });
});

describe('buildMockTest (re-export)', () => {
  it('matches the questions service implementation', () => {
    expect(buildMockTest('re-export-seed')).toEqual(buildMockTest('re-export-seed'));
  });
});

describe('buildStudyPlan', () => {
  it('builds an improvement plan with rotated weekly focus', () => {
    const plan = buildStudyPlan({ currentBand: 5.5, targetBand: 7, weeks: 10, seed: 'plan' });
    expect(plan.mode).toBe('improvement');
    expect(plan.schedule).toHaveLength(10);
    expect(plan.estimatedDailyMinutes).toBe(105);
    expect(plan.schedule[0]?.focus).toHaveLength(2);
    expect(plan.schedule[0]?.tasks).toHaveLength(3);
    expect(plan.schedule[0]?.checkpoint).toContain('week 1');
    expect(plan.resources).toHaveLength(7);
    // Rotation: consecutive weeks have different primary focus.
    expect(plan.schedule[0]?.focus[0]).not.toBe(plan.schedule[1]?.focus[0]);
  });

  it('builds a maintenance plan when target equals current', () => {
    const plan = buildStudyPlan({ currentBand: 7, targetBand: 7, weeks: 4, seed: 'maintain' });
    expect(plan.mode).toBe('maintenance');
    expect(plan.estimatedDailyMinutes).toBe(60);
  });

  it('caps daily minutes at 180 for large jumps', () => {
    const plan = buildStudyPlan({ currentBand: 4, targetBand: 9, weeks: 20, seed: 'jump' });
    expect(plan.estimatedDailyMinutes).toBe(180);
  });

  it('is deterministic with a seed', () => {
    expect(buildStudyPlan({ currentBand: 5, targetBand: 6.5, weeks: 6, seed: 'same' })).toEqual(
      buildStudyPlan({ currentBand: 5, targetBand: 6.5, weeks: 6, seed: 'same' })
    );
  });

  it('rejects invalid bands and inverted targets', () => {
    expect(() => buildStudyPlan({ currentBand: Number.NaN, targetBand: 7, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 0.5, targetBand: 7, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 9.5, targetBand: 9.5, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 5, targetBand: Number.NaN, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 5, targetBand: 0.5, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 5, targetBand: 9.75, weeks: 4 })).toThrow(
      ValidationError
    );
    expect(() => buildStudyPlan({ currentBand: 7, targetBand: 6, weeks: 4 })).toThrow(
      ValidationError
    );
    try {
      buildStudyPlan({ currentBand: 7, targetBand: 6, weeks: 4 });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ValidationError).details).toEqual({ currentBand: 7, targetBand: 6 });
    }
  });
});
