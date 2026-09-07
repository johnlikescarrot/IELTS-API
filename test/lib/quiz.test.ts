import { describe, expect, it } from 'vitest';

import { allEntries } from '../../src/data/vocabulary.js';
import { buildQuiz, quizPool, seededShuffle } from '../../src/lib/quiz.js';

import type { VocabularyEntry } from '../../src/types.js';

/** Minimal synthetic entry for pool-injection tests. */
function entry(overrides: Partial<VocabularyEntry> & { word: string }): VocabularyEntry {
  const { word, ...rest } = overrides;
  return {
    id: `t-${word}`,
    word,
    phonetic: '/test/',
    partOfSpeech: 'noun',
    definition: `Definition of ${word}.`,
    senses: [{ pos: 'noun', text: `Definition of ${word}.` }],
    morphemes: null,
    volumes: [1],
    ...rest,
  };
}

const SYNTHETIC: readonly VocabularyEntry[] = [
  entry({ word: 'alpha' }),
  entry({ word: 'bravo', partOfSpeech: 'verb' }),
  entry({ word: 'charlie' }),
  entry({ word: 'delta', phonetic: null }),
  entry({ word: 'echo' }),
  entry({ word: 'ghost', definition: null }),
];

describe('quizPool', () => {
  it('returns every entry when no filter is supplied', () => {
    expect(quizPool()).toHaveLength(allEntries().length);
    expect(quizPool([], [])).toHaveLength(allEntries().length);
  });

  it('restricts the pool to volumes', () => {
    const pool = quizPool([1]);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((row) => row.volumes.includes(1))).toBe(true);
  });

  it('restricts the pool to parts of speech', () => {
    const pool = quizPool(undefined, ['verb']);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((row) => row.partOfSpeech === 'verb')).toBe(true);
  });

  it('combines volume and part-of-speech filters', () => {
    const pool = quizPool([1], ['verb']);
    expect(pool).toHaveLength(1);
    expect(pool[0]?.word).toBeDefined();
  });

  it('returns an empty pool for filter combinations with no entries', () => {
    expect(quizPool([2], ['adjective'])).toHaveLength(0);
    expect(quizPool(undefined, ['pronoun'])).toHaveLength(0);
  });
});

describe('seededShuffle', () => {
  it('is deterministic for a seed and preserves the values', () => {
    const values = ['a', 'b', 'c', 'd', 'e'];
    const first = seededShuffle('seed-1', values);
    expect(seededShuffle('seed-1', values)).toEqual(first);
    expect([...first].sort()).toEqual(values);
  });

  it('passes tiny inputs through unchanged', () => {
    expect(seededShuffle('seed-1', [])).toEqual([]);
    expect(seededShuffle('seed-1', ['only'])).toEqual(['only']);
  });
});

describe('buildQuiz', () => {
  it('composes word-to-definition items with a matching key', () => {
    const quiz = buildQuiz(SYNTHETIC, {
      seed: 'quiz-seed',
      count: 3,
      choices: 4,
      direction: 'word-to-definition',
    });
    expect(quiz.pool).toBe(5);
    expect(quiz.items).toHaveLength(3);
    for (const item of quiz.items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(quiz.key[item.id]).toBe(item.answerIndex);
      const stemWord = SYNTHETIC.find((row) => row.word === item.word) as VocabularyEntry;
      expect(item.options[item.answerIndex]).toBe(stemWord.definition);
      expect(item.stem.startsWith(item.word)).toBe(true);
    }
    expect(Object.keys(quiz.key)).toHaveLength(3);
  });

  it('composes definition-to-word items whose options are headwords', () => {
    const quiz = buildQuiz(SYNTHETIC, {
      seed: 'quiz-seed',
      count: 2,
      choices: 3,
      direction: 'definition-to-word',
    });
    expect(quiz.items).toHaveLength(2);
    for (const item of quiz.items) {
      expect(item.options).toHaveLength(3);
      expect(item.options[item.answerIndex]).toBe(item.word);
      expect(item.stem).toContain('Definition of');
    }
  });

  it('omits the transcription from the stem when the entry has none', () => {
    const single = [entry({ word: 'solo', phonetic: null })];
    const quiz = buildQuiz(single, {
      seed: 'quiz-seed',
      count: 5,
      choices: 4,
      direction: 'word-to-definition',
    });
    expect(quiz.pool).toBe(1);
    expect(quiz.items).toHaveLength(1);
    expect(quiz.items[0]?.stem).toBe('solo');
    expect(quiz.items[0]?.options).toHaveLength(1);
    expect(quiz.items[0]?.answerIndex).toBe(0);
  });

  it('clamps count and choices to small pools', () => {
    const pair = [entry({ word: 'one' }), entry({ word: 'two' })];
    const quiz = buildQuiz(pair, {
      seed: 'quiz-seed',
      count: 10,
      choices: 4,
      direction: 'word-to-definition',
    });
    expect(quiz.pool).toBe(2);
    expect(quiz.items).toHaveLength(2);
    for (const item of quiz.items) {
      expect(item.options).toHaveLength(2);
    }
  });

  it('is deterministic for a seed', () => {
    const options = { seed: 'stable', count: 4, choices: 4, direction: 'word-to-definition' as const };
    expect(buildQuiz(SYNTHETIC, options)).toEqual(buildQuiz(SYNTHETIC, options));
  });

  it('composes quizzes from the real dataset', () => {
    const quiz = buildQuiz(quizPool([1]), {
      seed: 'real-pool',
      count: 3,
      choices: 4,
      direction: 'word-to-definition',
    });
    expect(quiz.items).toHaveLength(3);
    expect(quiz.pool).toBe(quizPool([1]).length);
  });
});
