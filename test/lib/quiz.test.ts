import { describe, expect, it } from 'vitest';

import { generateVocabularyQuiz } from '../../src/lib/quiz.js';

import type { QuizCandidate } from '../../src/lib/quiz.js';
import type { HttpError } from '../../src/lib/errors.js';

const pool = (size: number): QuizCandidate[] =>
  Array.from({ length: size }, (_unused, index) => ({
    id: `w${String(index).padStart(3, '0')}`,
    word: `word${index}`,
    definition: `definition number ${index}: a gloss that grows ${'ab'.repeat(index % 5)}`,
  }));

describe('generateVocabularyQuiz', () => {
  it('builds well-formed four-option items', () => {
    const quiz = generateVocabularyQuiz(pool(40), { direction: 'word-to-meaning', count: 6, seed: 'arena' });
    expect(quiz.count).toBe(6);
    expect(quiz.kind).toBe('vocabulary-definitions');
    expect(quiz.items.map((item) => item.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
    for (const item of quiz.items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(4);
      const candidate = pool(40).find((entry) => entry.id === item.wordId);
      expect(item.word).toBe(candidate?.word);
      expect(item.options[item.answerIndex]).toBe(candidate?.definition);
      expect(item.prompt).toContain(item.word);
    }
  });

  it('is deterministic for a seed and sensitive to a different one', () => {
    const a = generateVocabularyQuiz(pool(40), { direction: 'word-to-meaning', count: 5, seed: 'seed-a' });
    const b = generateVocabularyQuiz(pool(40), { direction: 'word-to-meaning', count: 5, seed: 'seed-a' });
    const c = generateVocabularyQuiz(pool(40), { direction: 'word-to-meaning', count: 5, seed: 'seed-c' });
    expect(b).toEqual(a);
    expect(c.items.map((item) => item.wordId)).not.toEqual(a.items.map((item) => item.wordId));
  });

  it('swaps prompts and options for meaning-to-word', () => {
    const quiz = generateVocabularyQuiz(pool(40), {
      direction: 'meaning-to-word',
      count: 4,
      seed: 'reverse',
    });
    for (const item of quiz.items) {
      expect(item.prompt).toContain('Which word matches');
      const candidate = pool(40).find((entry) => entry.id === item.wordId);
      expect(item.options[item.answerIndex]).toBe(candidate?.word);
      expect(item.options).toContain(item.word);
    }
  });

  it('rejects pools too small for the requested count', () => {
    let error: HttpError | undefined;
    try {
      generateVocabularyQuiz(pool(3), { direction: 'word-to-meaning', count: 1, seed: 'tiny' });
    } catch (thrown) {
      error = thrown as HttpError;
    }
    expect(error?.status).toBe(400);
    expect(error?.message).toContain('are needed');
  });

  it('handles a minimum-size pool', () => {
    const quiz = generateVocabularyQuiz(pool(4), { direction: 'word-to-meaning', count: 1, seed: 'exact' });
    expect(quiz.items[0]?.options).toHaveLength(4);
  });
});
