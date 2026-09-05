import { describe, expect, it } from 'vitest';

import { generateQuiz, QUIZ_MODES } from '../../src/lib/quiz.js';
import { allEntries } from '../../src/data/vocabulary.js';

import type { VocabularyEntry } from '../../src/types.js';

const BASE_SPEC = { seed: 'unit-test', count: 5, mode: 'word-to-definition' } as const;

describe('quiz dataset integrity', () => {
  it('guarantees the invariants the quiz engine relies on', () => {
    // Every entry has a definition, and every part of speech present in the
    // data has enough entries to serve as a distractor pool.
    expect(allEntries().every((entry) => entry.definition !== null)).toBe(true);
    const byPartOfSpeech = new Map<string, number>();
    for (const entry of allEntries()) {
      byPartOfSpeech.set(entry.partOfSpeech, (byPartOfSpeech.get(entry.partOfSpeech) ?? 0) + 1);
    }
    for (const count of byPartOfSpeech.values()) {
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('generateQuiz', () => {
  it('exposes the three documented drill modes', () => {
    expect(QUIZ_MODES).toEqual(['word-to-definition', 'definition-to-word', 'spelling']);
  });

  it('is deterministic and seed-sensitive', () => {
    expect(generateQuiz(BASE_SPEC)).toEqual(generateQuiz(BASE_SPEC));
    expect(generateQuiz({ ...BASE_SPEC, seed: 'other' })).not.toEqual(generateQuiz(BASE_SPEC));
    const items = generateQuiz(BASE_SPEC);
    for (const [position, item] of items.entries()) {
      expect(item.id).toBe(`${BASE_SPEC.seed}:${position}:${item.wordId}`);
    }
  });

  it('builds valid multiple-choice items in both option orientations', () => {
    for (const mode of ['word-to-definition', 'definition-to-word'] as const) {
      const items = generateQuiz({ ...BASE_SPEC, mode, count: 8 });
      expect(items).toHaveLength(8);
      for (const item of items) {
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.answerIndex).not.toBeNull();
        const answerIndex = item.answerIndex as number;
        expect(answerIndex).toBeGreaterThanOrEqual(0);
        expect(answerIndex).toBeLessThan(4);
        expect(item.options[answerIndex]).toBe(item.answer);
        expect(item.explanation).not.toBeNull();
        if (mode === 'word-to-definition') {
          expect(item.prompt).toContain('Which definition matches');
        } else {
          expect(item.prompt).toBe(item.explanation);
        }
      }
    }
  });

  it('marks correct answers with definitions sharing the part of speech', () => {
    const items = generateQuiz({ ...BASE_SPEC, partsOfSpeech: ['adverb'], count: 4 });
    expect(items).toHaveLength(4);
    for (const item of items) {
      const entry = allEntries().find((candidate) => candidate.id === item.wordId) as VocabularyEntry;
      expect(entry.partOfSpeech).toBe('adverb');
      expect(item.answer).toBe(entry.definition);
    }
  });

  it('generates spelling cloze items without options', () => {
    const generated = generateQuiz({ ...BASE_SPEC, mode: 'spelling' });
    const quizItem = generated[0] as (typeof generated)[number];
    expect(quizItem.options).toEqual([]);
    expect(quizItem.answerIndex).toBeNull();
    const entry = allEntries().find((candidate) => candidate.id === quizItem.wordId) as VocabularyEntry;
    expect(quizItem.answer).toBe(entry.word);
    const mask = entry.word.charAt(0) + '•'.repeat(Math.max(0, entry.word.length - 1));
    expect(quizItem.prompt).toContain(mask);
  });

  it('restricts sampling to requested Cambridge volumes', () => {
    const items = generateQuiz({ ...BASE_SPEC, volumes: [3], count: 10 });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const entry = allEntries().find((candidate) => candidate.id === item.wordId) as VocabularyEntry;
      expect(entry.volumes).toContain(3);
    }
  });

  it('clamps the count to the size of the filtered pool', () => {
    const items = generateQuiz({ ...BASE_SPEC, volumes: [1], partsOfSpeech: ['adverb'], count: 25 });
    const poolSize = allEntries().filter(
      (entry) => entry.partOfSpeech === 'adverb' && entry.volumes.includes(1),
    ).length;
    expect(items.length).toBe(Math.min(25, poolSize));
  });

  it('returns nothing for an empty pool', () => {
    // The dataset contains no pronoun entries; the quiz must degrade cleanly.
    expect(generateQuiz({ ...BASE_SPEC, partsOfSpeech: ['pronoun'] })).toEqual([]);
  });
});
