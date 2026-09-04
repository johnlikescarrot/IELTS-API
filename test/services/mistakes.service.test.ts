import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/lib/errors.js';
import { MISTAKES } from '../../src/data/mistakes.js';
import {
  MISTAKE_CATEGORIES,
  buildQuiz,
  getMistake,
  listMistakes
} from '../../src/services/mistakes.service.js';

describe('listMistakes', () => {
  it('returns all mistakes without a filter', () => {
    expect(listMistakes()).toHaveLength(20);
  });

  it('filters by category', () => {
    const punctuation = listMistakes('punctuation');
    expect(punctuation.length).toBeGreaterThan(0);
    expect(punctuation.every((mistake) => mistake.category === 'punctuation')).toBe(true);
  });

  it('returns cohesion entries too', () => {
    expect(listMistakes('cohesion')).toHaveLength(2);
  });
});

describe('MISTAKE_CATEGORIES', () => {
  it('enumerates every category present in the data', () => {
    const used = new Set(MISTAKES.map((mistake) => mistake.category));
    for (const category of used) {
      expect(MISTAKE_CATEGORIES).toContain(category);
    }
  });
});

describe('getMistake', () => {
  it('finds a mistake by id', () => {
    expect(getMistake('mist-001').category).toBe('articles');
  });

  it('throws NotFoundError for unknown ids', () => {
    expect(() => getMistake('mist-999')).toThrow(NotFoundError);
  });
});

describe('buildQuiz', () => {
  it('is deterministic with a seed', () => {
    expect(buildQuiz({ count: 5, seed: 'quiz' })).toEqual(buildQuiz({ count: 5, seed: 'quiz' }));
  });

  it('builds questions with four unique options and a correct answer', () => {
    const quiz = buildQuiz({ count: 20, seed: 'full' });
    expect(quiz).toHaveLength(20);
    for (const item of quiz) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answerIndex]).toBe(
        MISTAKES.find((mistake) => mistake.id === item.id)?.correct
      );
      expect(item.explanation.length).toBeGreaterThan(0);
    }
  });

  it('clamps count above the dataset size', () => {
    expect(buildQuiz({ count: 100, seed: 'clamp' })).toHaveLength(20);
  });

  it('returns an empty quiz for zero count', () => {
    expect(buildQuiz({ count: 0, seed: 'zero' })).toEqual([]);
  });

  it('never includes the correct sentence as its own distractor', () => {
    for (const item of buildQuiz({ count: 20, seed: 'distractors' })) {
      const correct = MISTAKES.find((mistake) => mistake.id === item.id)?.correct;
      const others = item.options.filter((option) => option !== correct);
      expect(others).toHaveLength(3);
    }
  });
});
