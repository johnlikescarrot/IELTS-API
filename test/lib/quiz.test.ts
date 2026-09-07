import { describe, expect, it } from 'vitest';

import {
  OPTION_MAX_LENGTH,
  OPTIONS_PER_ITEM,
  buildQuiz,
  pickDistractors,
  primarySenseText,
  sameText,
  seededOrder,
  shuffleOptions,
} from '../../src/lib/quiz.js';

import type { PartOfSpeech, VocabularyEntry } from '../../src/types.js';

/** Build a minimal vocabulary entry for quiz tests. */
function entry(
  id: string,
  word: string,
  pos: PartOfSpeech,
  definition: string,
  volumes: number[] = [1],
): VocabularyEntry {
  return {
    id,
    word,
    phonetic: null,
    partOfSpeech: pos,
    definition,
    senses: [{ pos, text: definition }],
    morphemes: null,
    volumes,
  };
}

const LONG_DEFINITION = 'A'.repeat(OPTION_MAX_LENGTH + 40);

const NOUNS = [
  entry('w00001', 'abacus', 'noun', 'a counting frame with beads'),
  entry('w00002', 'beaker', 'noun', 'a glass vessel used in laboratories'),
  entry('w00003', 'canyon', 'noun', 'a deep gorge between cliffs'),
  entry('w00004', 'delta', 'noun', 'a river mouth deposit of sediment'),
];
const VERBS = [
  entry('w00005', 'adapt', 'verb', 'to adjust to new conditions'),
  entry('w00006', 'breathe', 'verb', 'to draw air into the lungs'),
  entry('w00007', 'cultivate', 'verb', 'to grow plants or develop a skill'),
];
const ADJECTIVES = [
  entry('w00008', 'arid', 'adjective', 'very dry with little rain'),
  entry('w00009', 'brittle', 'adjective', 'hard but easily broken'),
];

describe('primarySenseText', () => {
  it('prefers the first sense over the definition field', () => {
    expect(primarySenseText(entry('w1', 'word', 'noun', 'definition text'))).toBe('definition text');
  });

  it('falls back to the definition when the first sense is empty', () => {
    const fallback = entry('w1', 'word', 'noun', 'definition text');
    fallback.senses = [{ pos: 'noun', text: '   ' }];
    expect(primarySenseText(fallback)).toBe('definition text');
  });

  it('returns null when no usable text exists', () => {
    const empty = entry('w1', 'word', 'noun', 'definition text');
    empty.senses = [];
    empty.definition = null;
    expect(primarySenseText(empty)).toBeNull();
  });

  it('truncates overlong glosses at the option width', () => {
    const truncated = primarySenseText(entry('w1', 'word', 'noun', LONG_DEFINITION));
    expect(truncated?.length).toBe(OPTION_MAX_LENGTH + 1);
    expect(truncated?.endsWith('…')).toBe(true);
    expect(truncated?.slice(0, OPTION_MAX_LENGTH)).toBe(LONG_DEFINITION.slice(0, OPTION_MAX_LENGTH));
  });

  it('leaves glosses at exactly the option width untouched', () => {
    const exact = 'x'.repeat(OPTION_MAX_LENGTH);
    expect(primarySenseText(entry('w1', 'word', 'noun', exact))).toBe(exact);
  });
});

describe('sameText', () => {
  it('compares case-insensitively after trimming', () => {
    expect(sameText('  A Definition ', 'a definition')).toBe(true);
    expect(sameText('a definition', 'another definition')).toBe(false);
  });
});

describe('seededOrder', () => {
  it('returns a deterministic permutation of the pool', () => {
    const order = seededOrder(10, 'seed-a');
    expect(order).toHaveLength(10);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(seededOrder(10, 'seed-a')).toEqual(order);
  });

  it('returns different orders for different seeds', () => {
    expect(seededOrder(64, 'seed-a')).not.toEqual(seededOrder(64, 'seed-b'));
  });

  it('handles an empty pool', () => {
    expect(seededOrder(0, 'seed-a')).toEqual([]);
  });
});

describe('pickDistractors', () => {
  const target = NOUNS[0] as VocabularyEntry;

  it('draws same-part-of-speech distractors first and skips used texts', () => {
    const result = pickDistractors(NOUNS, target, 'seed');
    expect(result.texts).toHaveLength(3);
    expect(result.texts).not.toContain(primarySenseText(target));
    expect(result.crossPosFallback).toBe(false);
    expect(result.reduced).toBe(false);
    expect(new Set(result.texts.map((text) => text.toLowerCase()))).toHaveLength(3);
  });

  it('skips candidate definitions identical to the correct answer', () => {
    const duplicate = entry('w00010', 'copycat', 'noun', 'a counting frame with beads');
    const pool = [...NOUNS, duplicate];
    const result = pickDistractors(pool, target, 'seed');
    expect(result.texts).not.toContain('a counting frame with beads');
  });

  it('falls back to other parts of speech when the same-pos pool is short', () => {
    const pool = [target, ...VERBS];
    const result = pickDistractors(pool, target, 'seed');
    expect(result.texts).toHaveLength(3);
    expect(result.crossPosFallback).toBe(true);
    expect(result.reduced).toBe(false);
  });

  it('marks the item reduced when the whole scope is too small', () => {
    const pool = [target, NOUNS[1] as VocabularyEntry];
    const result = pickDistractors(pool, target, 'seed');
    expect(result.texts).toHaveLength(1);
    expect(result.reduced).toBe(true);
  });

  it('returns no distractors for a one-word scope', () => {
    const result = pickDistractors([target], target, 'seed');
    expect(result.texts).toEqual([]);
    expect(result.reduced).toBe(true);
  });
});

describe('shuffleOptions', () => {
  it('shuffles deterministically and reports where the correct answer landed', () => {
    const options = ['first', 'second', 'third', 'fourth'];
    const shuffled = shuffleOptions(options, 'seed');
    expect([...shuffled.options].sort()).toEqual([...options].sort());
    expect(shuffled.options[shuffled.answer]).toBe('first');
    expect(shuffleOptions(options, 'seed')).toEqual(shuffled);
  });

  it('keeps a single option in place', () => {
    const shuffled = shuffleOptions(['only'], 'seed');
    expect(shuffled).toEqual({ options: ['only'], answer: 0 });
  });
});

describe('buildQuiz', () => {
  it('builds deterministic items whose answer is the headword definition', () => {
    const quiz = buildQuiz({ date: '2026-09-07', count: 4, entries: NOUNS });
    expect(quiz.date).toBe('2026-09-07');
    expect(quiz.count).toBe(4);
    expect(quiz.items).toHaveLength(4);
    expect(quiz.scope.headwords).toBe(4);
    expect(quiz.optionsPerItem).toBe(OPTIONS_PER_ITEM);
    expect(quiz.reduced).toBe(false);
    expect(quiz.crossPosFallback).toBe(false);

    const byId = new Map(NOUNS.map((item) => [item.id, item]));
    for (const item of quiz.items) {
      const source = byId.get(item.id);
      expect(source).toBeDefined();
      expect(item.options[item.answer]).toBe(primarySenseText(source as VocabularyEntry));
      expect(item.options).toHaveLength(OPTIONS_PER_ITEM);
      expect(item.prompt).toContain(`"${source?.word}"`);
      // No option text may repeat inside an item.
      expect(new Set(item.options.map((text) => text.toLowerCase())).size).toBe(item.options.length);
    }
    expect(JSON.stringify(buildQuiz({ date: '2026-09-07', count: 4, entries: NOUNS }))).toBe(
      JSON.stringify(quiz),
    );
  });

  it('answers with the same set for the same date regardless of count up to the scope', () => {
    const pool = [...NOUNS, ...VERBS, ...ADJECTIVES];
    const four = buildQuiz({ date: '2026-09-07', count: 4, entries: pool });
    const nine = buildQuiz({ date: '2026-09-07', count: 9, entries: pool });
    expect(nine.items).toHaveLength(9);
    // The first items are the same prefix of the seeded walk.
    expect(nine.items.slice(0, 4).map((item) => item.id)).toEqual(four.items.map((item) => item.id));
  });

  it('falls back across parts of speech when only one word has the requested pos', () => {
    const pool = [NOUNS[0] as VocabularyEntry, VERBS[0] as VocabularyEntry];
    const quiz = buildQuiz({ date: '2026-09-07', count: 2, entries: pool });
    expect(quiz.items).toHaveLength(2);
    expect(quiz.items[0]?.options).toHaveLength(2);
    expect(quiz.crossPosFallback).toBe(true);
    expect(quiz.reduced).toBe(true);
  });

  it('reduces option counts on a scope with a single part of speech', () => {
    const quiz = buildQuiz({ date: '2026-09-07', count: 2, entries: VERBS });
    expect(quiz.items).toHaveLength(2);
    expect(quiz.items[0]?.options).toHaveLength(3);
    expect(quiz.reduced).toBe(true);
  });

  it('reduces option counts on tiny scopes', () => {
    const quiz = buildQuiz({ date: '2026-09-07', count: 2, entries: [NOUNS[0] as VocabularyEntry] });
    expect(quiz.items).toHaveLength(1);
    expect(quiz.reduced).toBe(true);
    expect(quiz.items[0]?.options).toEqual(['a counting frame with beads']);
    expect(quiz.items[0]?.answer).toBe(0);
  });

  it('answers an empty scope with an empty set', () => {
    const quiz = buildQuiz({ date: '2026-09-07', count: 5, entries: [] });
    expect(quiz.items).toEqual([]);
    expect(quiz.scope.headwords).toBe(0);
    expect(quiz.reduced).toBe(false);
    expect(quiz.crossPosFallback).toBe(false);
  });
});
