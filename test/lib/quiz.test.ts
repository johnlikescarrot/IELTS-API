import { describe, expect, it } from 'vitest';

import { allEntries } from '../../src/data/vocabulary.js';
import { buildFlashcard, buildQuizItem, pickDistractors, quizDeck } from '../../src/lib/quiz.js';

import type { VocabularyEntry } from '../../src/types.js';

describe('pickDistractors', () => {
  it('picks distractors of same POS', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    const entry = entries.find((e) => e.partOfSpeech === 'noun')!;
    const distractors = pickDistractors(entry, entries, 3);
    expect(distractors).toHaveLength(3);
    expect(distractors.every((d) => d.partOfSpeech === 'noun' && d.id !== entry.id)).toBe(true);
  });

  it('returns fewer when not enough candidates', () => {
    const entry = allEntries().find((e) => e.definition !== null)!;
    const smallPool = [entry];
    expect(pickDistractors(entry, smallPool, 3)).toHaveLength(0);
  });

  it('is deterministic for same entry', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    const entry = entries.find((e) => e.partOfSpeech === 'noun')!;
    const first = pickDistractors(entry, entries, 3).map((d) => d.id);
    const second = pickDistractors(entry, entries, 3).map((d) => d.id);
    expect(first).toEqual(second);
  });

  it('skips entries with null definition and different POS', () => {
    const entry = allEntries().find((e) => e.partOfSpeech === 'noun')!;
    const fakeNull = {
      id: 'w99996',
      word: 'fake1',
      phonetic: null,
      partOfSpeech: 'noun',
      definition: null,
      senses: [],
      morphemes: null,
      volumes: [1],
    } as unknown as VocabularyEntry;
    const fakeVerb = {
      id: 'w99997',
      word: 'fake2',
      phonetic: null,
      partOfSpeech: 'verb',
      definition: 'verb def',
      senses: [],
      morphemes: null,
      volumes: [1],
    } as unknown as VocabularyEntry;
    const pool = [
      entry,
      fakeNull,
      fakeVerb,
      ...allEntries()
        .filter((e) => e.definition !== null && e.partOfSpeech === 'noun')
        .slice(0, 10),
    ];
    const distractors = pickDistractors(entry, pool as unknown as VocabularyEntry[], 3);
    expect(distractors.every((d) => d.definition !== null && d.partOfSpeech === 'noun')).toBe(true);
    expect(distractors.some((d) => d.id === fakeNull.id)).toBe(false);
    expect(distractors.some((d) => d.id === fakeVerb.id)).toBe(false);
  });

  it('returns slice when candidates exactly meets count', () => {
    const entry = allEntries().find((e) => e.partOfSpeech === 'noun')!;
    const candidates = allEntries()
      .filter((e) => e.definition !== null && e.partOfSpeech === 'noun' && e.id !== entry.id)
      .slice(0, 2);
    const pool = [entry, ...candidates];
    expect(pickDistractors(entry, pool, 3)).toHaveLength(2);
  });
});

describe('buildQuizItem', () => {
  it('builds a 4-option quiz item', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    const entry = entries.find((e) => e.definition !== null)!;
    const item = buildQuizItem(entry, entries);
    expect(item).not.toBeNull();
    expect(item?.options).toHaveLength(4);
    expect(item?.options).toContain(item?.correctDefinition);
    expect(item?.answerIndex).toBeGreaterThanOrEqual(0);
    expect(item?.answerIndex).toBeLessThan(4);
  });

  it('returns null when definition is null', () => {
    const fake = {
      id: 'w99999',
      word: 'test',
      phonetic: null,
      partOfSpeech: 'noun',
      definition: null,
      senses: [],
      morphemes: null,
      volumes: [1],
    } as unknown as VocabularyEntry;
    expect(buildQuizItem(fake, allEntries() as unknown as VocabularyEntry[])).toBeNull();
  });

  it('returns null when not enough distractors', () => {
    const entry = allEntries().find((e) => e.definition !== null)!;
    const tiny = [entry] as unknown as VocabularyEntry[];
    expect(buildQuizItem(entry, tiny)).toBeNull();
  });

  it('shuffles deterministically with seed', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    const entry = entries.find((e) => e.definition !== null)!;
    const first = buildQuizItem(entry, entries, 'seed-a');
    const second = buildQuizItem(entry, entries, 'seed-a');
    const third = buildQuizItem(entry, entries, 'seed-b');
    expect(first?.options).toEqual(second?.options);
    // Different seed may produce different order but still valid
    expect(third?.options).toHaveLength(4);
  });

  it('falls back to full dictionary when collection filtered pool is small', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    // Find an entry whose collection is very small (likely space-exploration)
    const small = entries.find((e) => {
      // Force filtered length <4 by using a custom tiny dictionary
      const fakeDict = [e] as unknown as VocabularyEntry[];
      const item = buildQuizItem(e, fakeDict);
      return item === null;
    });
    expect(small).toBeDefined();
    // Use a dictionary where sameCollection filtered would be <4, so fallback to full
    const entry = entries.find((e) => e.word === 'atmosphere')!;
    // Create a dictionary where only 2 entries share the same collection
    const sameCollection = entries.filter((e) => e.word === 'atmosphere' || e.word === 'glacier').slice(0, 2);
    const mixedDict = [
      ...sameCollection,
      ...entries.filter((e) => e.partOfSpeech === entry.partOfSpeech).slice(0, 10),
    ] as unknown as VocabularyEntry[];
    const item = buildQuizItem(entry, mixedDict);
    expect(item).not.toBeNull();
    expect(item?.options).toHaveLength(4);
  });
});

describe('buildFlashcard', () => {
  it('builds front/back with cue', () => {
    const entry = allEntries().find((e) => e.definition !== null)!;
    const card = buildFlashcard(entry);
    expect(card.front).toBe(entry.word);
    expect(card.back).toBe(entry.definition);
    expect(card.phonetic).toBe(entry.phonetic);
    expect(card.cue.length).toBeGreaterThan(0);
  });

  it('handles polysemous cue', () => {
    const entry = allEntries().find((e) => e.senses.length > 1)!;
    const card = buildFlashcard(entry);
    expect(card.cue).toContain('senses');
  });

  it('handles missing definition', () => {
    const fake = {
      id: 'w99999',
      word: 'test',
      phonetic: null,
      partOfSpeech: 'noun',
      definition: null,
      senses: [],
      morphemes: null,
      volumes: [1],
    } as unknown as VocabularyEntry;
    const card = buildFlashcard(fake);
    expect(card.back).toBe('test');
  });
});

describe('quizDeck', () => {
  it('generates deterministic deck', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    const first = quizDeck(entries, entries, 5, 'seed123');
    const second = quizDeck(entries, entries, 5, 'seed123');
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
  });

  it('handles empty feasible list', () => {
    expect(quizDeck([], allEntries(), 5, 'seed')).toEqual([]);
  });

  it('filters null items', () => {
    const entries = allEntries().filter((e) => e.definition !== null);
    // Force tiny dictionary that cannot produce distractors ->deck empty?
    const tiny = entries.slice(0, 1);
    const deck = quizDeck(tiny, tiny, 5, 'seed');
    expect(deck.length).toBeLessThanOrEqual(1);
  });

  it('caps count to feasible length', () => {
    const entries = allEntries()
      .filter((e) => e.definition !== null)
      .slice(0, 3);
    const deck = quizDeck(entries, allEntries(), 10, 'seed');
    expect(deck.length).toBeLessThanOrEqual(3);
  });
});
