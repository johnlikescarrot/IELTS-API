import { describe, expect, it } from 'vitest';

import {
  PARTS_OF_SPEECH,
  allEntries,
  findWord,
  randomEntries,
  searchVocabulary,
  vocabulary,
  vocabularyStats,
} from '../../src/data/vocabulary.js';

const page = (overrides: Partial<Parameters<typeof searchVocabulary>[0]> = {}) =>
  searchVocabulary({ limit: 10, offset: 0, ...overrides });

describe('the dataset', () => {
  it('documents its provenance', () => {
    const { meta } = vocabulary();
    expect(meta.name).toContain('Cambridge IELTS');
    expect(meta.volumes).toBe(22);
    expect(meta.occurrences).toBe(4310);
    expect(meta.words).toBe(4174);
    expect(meta.sourceUrl).toContain('1-22yas.xlsx');
    expect(meta.license).toBe('CC BY 4.0');
  });

  it('holds one entry per unique headword', () => {
    const entries = allEntries();
    expect(entries).toHaveLength(vocabulary().meta.words);
    expect(new Set(entries.map((entry) => entry.word.toLowerCase())).size).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });

  it('records at least one Cambridge volume per entry', () => {
    for (const entry of allEntries()) {
      expect(entry.volumes.length).toBeGreaterThan(0);
      expect(entry.volumes.every((volume) => volume >= 1 && volume <= 22)).toBe(true);
      expect(PARTS_OF_SPEECH).toContain(entry.partOfSpeech);
      expect(entry.senses.length).toBeGreaterThan(0);
    }
  });
});

describe('searchVocabulary', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(4174);
    expect(result.hasMore).toBe(true);
    expect(result.items[0]?.word).toBe('abandon');
  });

  it('honours the offset', () => {
    expect(page({ limit: 2, offset: 3 }).items.map((entry) => entry.word)).toEqual(
      page({ limit: 5 })
        .items.slice(3, 5)
        .map((entry) => entry.word),
    );
  });

  it('searches by substring across word, definition and morphemes', () => {
    const result = page({ query: 'atmosphere', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.some((entry) => entry.word === 'atmosphere')).toBe(true);
    const morphemes = page({ query: 'hydro(water)', limit: 5 });
    expect(morphemes.total).toBeGreaterThan(0);
  });

  it('supports prefix and exact matching', () => {
    const prefix = page({ query: 'atmos', match: 'prefix', limit: 5 });
    expect(prefix.items.every((entry) => entry.word.toLowerCase().startsWith('atmos'))).toBe(true);
    const exact = page({ query: 'Atmosphere', match: 'exact', limit: 5 });
    expect(exact.total).toBe(1);
    expect(exact.items[0]?.word).toBe('atmosphere');
  });

  it('filters by Cambridge volume', () => {
    const result = page({ volumes: [1], limit: 5 });
    expect(result.items.every((entry) => entry.volumes.includes(1))).toBe(true);
    expect(page({ volumes: [1, 2] }).total).toBeGreaterThan(page({ volumes: [1] }).total);
  });

  it('filters by part of speech', () => {
    const result = page({ partsOfSpeech: ['verb'], limit: 5 });
    expect(result.items.every((entry) => entry.partOfSpeech === 'verb')).toBe(true);
  });

  it('sorts by word, length, volume count and sense count', () => {
    const byLength = page({ sort: 'length', order: 'desc', limit: 3 });
    expect(byLength.items[0]!.word.length).toBeGreaterThanOrEqual(byLength.items[2]!.word.length);
    const byVolumes = page({ sort: 'volumes', order: 'desc', limit: 3 });
    expect(byVolumes.items[0]!.volumes.length).toBeGreaterThanOrEqual(byVolumes.items[2]!.volumes.length);
    const bySenses = page({ sort: 'senses', order: 'asc', limit: 3 });
    expect(bySenses.items[0]!.senses.length).toBeLessThanOrEqual(bySenses.items[2]!.senses.length);
  });

  it('sorts ascending by word by default', () => {
    const result = page({ sort: 'word', order: 'asc', limit: 3 });
    expect(result.items.map((entry) => entry.word)[0]).toBe('abandon');
  });

  it('returns an empty page when nothing matches', () => {
    const result = page({ query: 'zzzzznotaword' });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

describe('findWord', () => {
  it('is case-insensitive and tolerates padding', () => {
    expect(findWord('ATMOSPHERE')?.id).toBe(findWord('atmosphere')?.id);
    expect(findWord('  atmosphere ')?.word).toBe('atmosphere');
  });

  it('returns undefined for unknown words', () => {
    expect(findWord('definitelynotanieltsword')).toBeUndefined();
  });
});

describe('randomEntries', () => {
  it('is deterministic for a seed', () => {
    expect(randomEntries('2024-01-01', 3)).toEqual(randomEntries('2024-01-01', 3));
  });

  it('returns distinct entries in the requested amount', () => {
    const entries = randomEntries('ielts-api', 4);
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(4);
  });

  it('changes with the seed', () => {
    expect(randomEntries('a', 5)).not.toEqual(randomEntries('b', 5));
  });
});

describe('vocabularyStats', () => {
  const stats = vocabularyStats();

  it('summarises the dataset', () => {
    expect(stats.words).toBe(4174);
    expect(stats.occurrences).toBe(4310);
    expect(stats.volumes).toBe(22);
    expect(stats.polysemous).toBeGreaterThan(0);
    expect(stats.withPhonetics).toBeGreaterThan(4000);
    expect(stats.meanSenses).toBeGreaterThan(1);
    expect(stats.meanWordLength).toBeGreaterThan(4);
  });

  it('breaks counts down by part of speech and volume', () => {
    const byPart = Object.values(stats.byPartOfSpeech).reduce((total, count) => total + count, 0);
    expect(byPart).toBe(stats.words);
    expect(Object.keys(stats.byVolume).length).toBe(22);
  });
});
