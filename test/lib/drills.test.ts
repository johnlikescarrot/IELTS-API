import { describe, expect, it } from 'vitest';

import {
  clearDrillCache,
  clozableGlosses,
  generateClozeItems,
  generateMatchingSet,
} from '../../src/lib/drills.js';

import type { VocabularyEntry } from '../../src/types.js';

const TOKEN = /[a-zA-Z][a-zA-Z'’-]*/g;

/** Synthetic entry for deterministic generator tests. */
function makeEntry(
  word: string,
  definition: string | null,
  options: {
    senses?: string[];
    pos?: VocabularyEntry['partOfSpeech'];
    volumes?: number[];
    morphemes?: string | null;
  } = {},
): VocabularyEntry {
  const glosses = options.senses ?? (definition === null ? [] : [definition]);
  return {
    id: `x-${word.toLowerCase()}`,
    word,
    phonetic: null,
    partOfSpeech: options.pos ?? 'noun',
    definition,
    senses: glosses.map((text) => ({ pos: options.pos ?? ('noun' as const), text })),
    morphemes: options.morphemes ?? null,
    volumes: options.volumes ?? [1],
  };
}

describe('clozableGlosses', () => {
  it('finds the headword inside its own definition', () => {
    const gust = makeEntry('gust', 'a short burst; a gust of wind blows');
    const glosses = clozableGlosses([gust]);
    expect(glosses).toHaveLength(1);
    const gloss = glosses[0] as (typeof glosses)[number];
    expect(gloss.source).toBe('definition');
    expect(gloss.text.slice(gloss.start, gloss.end)).toBe('gust');
  });

  it('falls back to a sense when the definition lacks the word', () => {
    const stand = makeEntry('stand', 'a position on an issue', { senses: ['a position; to stand firm'] });
    const glosses = clozableGlosses([stand]);
    expect(glosses).toHaveLength(1);
    expect(glosses[0]?.source).toBe('sense');
  });

  it('skips entries without a whole-token self-mention', () => {
    const skip = makeEntry('run', 'sprint rapidly');
    const inflected = makeEntry('run', 'runs quickly every morning');
    expect(clozableGlosses([skip, inflected])).toHaveLength(0);
  });

  it('skips entries without any gloss at all', () => {
    const bare = makeEntry('nothing', null);
    expect(clozableGlosses([bare])).toHaveLength(0);
  });

  it('matches case-insensitively and caches the full-dataset pool', () => {
    const africa = makeEntry('Africa', 'the continent of africa');
    expect(clozableGlosses([africa])[0]?.text.slice(17)).toBe('africa');

    const first = clozableGlosses();
    expect(clozableGlosses()).toBe(first);
    expect(
      first.every(
        (gloss) => gloss.text.slice(gloss.start, gloss.end).toLowerCase() === gloss.entry.word.toLowerCase(),
      ),
    ).toBe(true);
    clearDrillCache();
    expect(clozableGlosses()).not.toBe(first);
    expect(clozableGlosses().length).toBe(1711);
  });
});

describe('generateClozeItems', () => {
  const pool = [
    makeEntry('alpha', 'the first letter; alpha', { pos: 'noun', volumes: [1] }),
    makeEntry('beta', 'the second letter after alpha is beta', { pos: 'noun', volumes: [2] }),
    makeEntry('gamma', 'gamma comes third', { pos: 'verb', volumes: [3] }),
    makeEntry('delta', 'a mouth of the river called delta', { pos: 'noun', volumes: [2, 1] }),
  ];

  it('is deterministic for one seed', () => {
    const query = { seed: 'research-2026', count: 3, optionCount: 3, entries: pool };
    expect(generateClozeItems(query)).toEqual(generateClozeItems(query));
    expect(generateClozeItems({ ...query, seed: 'other' })).not.toEqual(generateClozeItems(query));
  });

  it('blanks the word, keeps the answer valid and excludes options present in the text', () => {
    const { items, pool: size } = generateClozeItems({ seed: 's', count: 4, optionCount: 4, entries: pool });
    expect(size).toBe(4);
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.text).toContain('_____');
      expect(item.options[item.answerIndex]).toBe(item.answer);
      const tokens = new Set((item.text.match(TOKEN) ?? []).map((token) => token.toLowerCase()));
      for (const option of item.options) {
        if (option.toLowerCase() === item.answer.toLowerCase()) {
          continue;
        }
        expect(tokens.has(option.toLowerCase())).toBe(false);
      }
    }
  });

  it('clamps the count to the pool and shrinks options when distractors run out', () => {
    const small = generateClozeItems({ seed: 's', count: 9, optionCount: 5, entries: pool });
    expect(small.items).toHaveLength(4);
    const verbOnly = generateClozeItems({
      seed: 's',
      count: 1,
      optionCount: 4,
      entries: pool,
      partOfSpeech: 'verb',
    });
    expect(verbOnly.items[0]?.options).toHaveLength(1);
    expect(verbOnly.items[0]?.answer).toBe('gamma');
    expect(verbOnly.items[0]?.partOfSpeech).toBe('verb');
  });

  it('filters by volume and returns nothing for an empty filter', () => {
    const filtered = generateClozeItems({ seed: 's', count: 4, optionCount: 3, entries: pool, volumes: [3] });
    expect(filtered.pool).toBe(1);
    expect(filtered.items[0]?.answer).toBe('gamma');
    const empty = generateClozeItems({ seed: 's', count: 2, optionCount: 3, entries: pool, volumes: [19] });
    expect(empty.items).toEqual([]);
    expect(empty.pool).toBe(0);
  });

  it('propagates morpheme hints and gloss sources', () => {
    const hinted = [makeEntry('alpha', 'alpha test', { morphemes: 'alph(first);a' })];
    const item = generateClozeItems({ seed: 's', count: 1, optionCount: 2, entries: hinted }).items[0];
    expect(item?.morphemes).toBe('alph(first);a');
    expect(item?.source).toBe('definition');
  });

  it('generates a rich, valid set over the real dataset', () => {
    const { items } = generateClozeItems({ seed: 'paper-experiment', count: 6, optionCount: 5 });
    expect(items).toHaveLength(6);
    for (const item of items) {
      expect(item.options.length).toBe(5);
      expect(item.options[item.answerIndex]).toBe(item.answer);
      expect(item.volumes.length).toBeGreaterThan(0);
    }
  });
});

describe('generateMatchingSet', () => {
  const pool = [
    makeEntry('alpha', 'first letter'),
    makeEntry('beta', 'second letter'),
    makeEntry('gamma', 'third letter'),
    makeEntry('delta', 'third letter'),
    makeEntry('epsilon', null),
  ];

  it('deduplicates identical gloss texts and skips definitionless entries', () => {
    const { set, pool: size } = generateMatchingSet({ seed: 'm', count: 3, entries: pool });
    expect(size).toBe(3);
    expect(set.words).toHaveLength(3);
    expect(new Set(set.definitions).size).toBe(3);
  });

  it('answers index each word to exactly its own definition', () => {
    const { set } = generateMatchingSet({ seed: 'm', count: 3, entries: pool });
    set.words.forEach((word, index) => {
      const entry = pool.find((candidate) => candidate.word === word) as VocabularyEntry;
      expect(set.definitions[set.answers[index] as number]).toBe(entry.definition);
    });
  });

  it('is deterministic per seed', () => {
    expect(generateMatchingSet({ seed: 'm', count: 2, entries: pool })).toEqual(
      generateMatchingSet({ seed: 'm', count: 2, entries: pool }),
    );
    expect(generateMatchingSet({ seed: 'm2', count: 2, entries: pool }).set.definitions).not.toEqual(
      generateMatchingSet({ seed: 'm3', count: 2, entries: pool }).set.definitions,
    );
  });

  it('clamps to the pool size', () => {
    const { set } = generateMatchingSet({ seed: 'm', count: 10, entries: pool });
    expect(set.words).toHaveLength(3);
    expect(set.ids).toHaveLength(3);
  });

  it('matches the full dataset deterministically', () => {
    const options = { seed: 'corpus', count: 4 };
    const first = generateMatchingSet(options);
    expect(first.pool).toBe(4026); // 4,174 entries, duplicate gloss texts removed
    expect(first.set.answers).toEqual(generateMatchingSet(options).set.answers);
    expect(new Set(first.set.answers).size).toBe(4);
  });
});
