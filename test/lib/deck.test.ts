import { describe, expect, it } from 'vitest';
import { createVocabularyDeck } from '../../src/lib/deck.js';
import { allEntries } from '../../src/data/vocabulary.js';
import { shuffled } from '../../src/lib/rng.js';
import type { VocabularyEntry } from '../../src/types.js';
import type { VocabularyDeckOptions } from '../../src/lib/deck.js';

const options = { seed: 'research-cohort-a', on: '2026-09-07' };

describe('seeded vocabulary decks', () => {
  it('returns source-faithful revealable answers and unsaved initial states', () => {
    const result = createVocabularyDeck(options);
    expect(result).toMatchObject({ ...options, total: 4174, limit: 10, offset: 0, hasMore: true });
    expect(result.cards).toHaveLength(10);
    for (const card of result.cards) {
      const entry = allEntries().find((item) => item.id === card.prompt.id);
      expect({ ...card.prompt, ...card.answer }).toEqual(entry);
      expect(card.prompt).not.toHaveProperty('definition');
      expect(card.state).toMatchObject({
        id: card.prompt.id,
        algorithm: 'sm2-v1',
        dueOn: options.on,
        lastReviewedOn: null,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        easeFactor: 2.5,
      });
    }
  });

  it('permutes the population BEFORE pagination so changed page sizes do not repeat or skip entries', () => {
    const whole = createVocabularyDeck({ ...options, limit: 50 });
    const first = createVocabularyDeck({ ...options, limit: 20 });
    const second = createVocabularyDeck({ ...options, limit: 30, offset: 20 });
    expect([...first.cards, ...second.cards]).toEqual(whole.cards);
    expect(new Set(whole.cards.map((card) => card.prompt.id)).size).toBe(50);
    expect(createVocabularyDeck({ ...options, limit: 50 })).toEqual(whole);
    expect(createVocabularyDeck({ ...options, seed: 'different', limit: 50 }).cards).not.toEqual(whole.cards);
  });

  it('keeps the order independent of the explicit start date', () => {
    const next = createVocabularyDeck({ ...options, on: '2026-09-08' });
    expect(next.cards.map((card) => card.prompt)).toEqual(
      createVocabularyDeck(options).cards.map((card) => card.prompt),
    );
    expect(next.cards.every((card) => card.state.dueOn === '2026-09-08')).toBe(true);
  });

  it('intersects part-of-speech and volume filters, treating each list as a union', () => {
    const filtered = createVocabularyDeck({
      ...options,
      volumes: [1, 2],
      partsOfSpeech: ['noun', 'verb'],
      limit: 50,
    });
    const eligible = allEntries().filter(
      (entry) =>
        entry.volumes.some((volume) => [1, 2].includes(volume)) &&
        ['noun', 'verb'].includes(entry.partOfSpeech),
    );
    expect(filtered.total).toBe(eligible.length);
    for (const card of filtered.cards) {
      expect(eligible.some((entry) => entry.id === card.prompt.id)).toBe(true);
    }
    expect(
      createVocabularyDeck({ ...options, volumes: [2, 1, 1], partsOfSpeech: ['verb', 'noun'], limit: 50 }),
    ).toEqual(filtered);
    expect(createVocabularyDeck({ ...options, volumes: [], partsOfSpeech: [] })).toEqual(
      createVocabularyDeck(options),
    );
    expect(
      createVocabularyDeck({ ...options, partsOfSpeech: ['adjective'] }).cards.every(
        (card) => card.prompt.partOfSpeech === 'adjective',
      ),
    ).toBe(true);
    expect(
      createVocabularyDeck({ ...options, volumes: [22] }).cards.every((card) =>
        card.answer.volumes.includes(22),
      ),
    ).toBe(true);
  });

  it('handles exhausted and partial last pages', () => {
    const exhausted = createVocabularyDeck({ ...options, offset: 4174 });
    expect(exhausted.cards).toEqual([]);
    expect(exhausted.hasMore).toBe(false);
    const last = createVocabularyDeck({ ...options, offset: 4170 });
    expect(last.cards).toHaveLength(4);
    expect(last.hasMore).toBe(false);
    // No pronouns occur in the final Cambridge volume in the committed dataset.
    const empty = createVocabularyDeck({ ...options, volumes: [22], partsOfSpeech: ['pronoun'] });
    expect(empty.cards).toEqual([]);
    expect(empty.total).toBe(0);
  });

  it('canonicalises source order rather than relying on the current JSON file ordering', () => {
    const entries = allEntries() as VocabularyEntry[];
    const original = [...entries];
    const expected = createVocabularyDeck(options);
    try {
      entries.reverse();
      expect(createVocabularyDeck(options)).toEqual(expected);
    } finally {
      entries.splice(0, entries.length, ...original);
    }
  });

  it('does not expose mutable references into the shared dataset', () => {
    const deck = createVocabularyDeck(options);
    const expected = structuredClone(deck);
    const card = deck.cards[0]!;
    card.prompt.word = 'local change';
    card.answer.volumes.push(99);
    card.answer.senses.push({ pos: 'noun', text: 'local answer' });
    if (card.answer.senses[0]) card.answer.senses[0].text = 'local edit';
    card.state.repetitions = 42;
    expect(createVocabularyDeck(options)).toEqual(expected);
  });

  it.each([
    { seed: '' },
    { seed: ' '.repeat(3) },
    { seed: 'x'.repeat(129) },
    { on: '2026-02-29' },
    { on: ' 2026-09-07' },
    { limit: 0 },
    { limit: 51 },
    { offset: -1 },
    { volumes: [0] },
    { volumes: [23] },
    { volumes: [1.5] },
    { volumes: Array<number>(23).fill(1) },
    { volumes: '1' },
    { partsOfSpeech: 'noun' },
    { partsOfSpeech: ['invalid'] },
  ])('rejects invalid options %j', (bad) => {
    expect(() => createVocabularyDeck({ ...options, ...bad } as VocabularyDeckOptions)).toThrow();
  });
});

describe('seeded Fisher-Yates permutation', () => {
  it('is a repeatable permutation and never mutates its source', () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const result = shuffled('fixed', input);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
    expect(result).not.toEqual(input);
    expect(shuffled('fixed', input)).toEqual(result);
    expect(shuffled('other', input)).not.toEqual(result);
  });
  it('handles empty and single-item populations', () => {
    expect(shuffled('s', [])).toEqual([]);
    expect(shuffled('s', [1])).toEqual([1]);
  });
});
