import { describe, expect, it } from 'vitest';

import { allEntries } from '../../src/data/vocabulary.js';
import {
  VOCABULARY_COLLECTIONS,
  collectionCounts,
  collectionFacets,
  findCollection,
  sceneForWord,
  vocabularyCollectionsStats,
  wordsForCollection,
} from '../../src/data/vocabularyCollections.js';

describe('VOCABULARY_COLLECTIONS', () => {
  it('contains 44 collections: 22 Cambridge + 22 scenes', () => {
    expect(VOCABULARY_COLLECTIONS).toHaveLength(44);
    expect(VOCABULARY_COLLECTIONS.filter((c) => c.family === 'cambridge')).toHaveLength(22);
    expect(VOCABULARY_COLLECTIONS.filter((c) => c.family === 'thematic')).toHaveLength(22);
  });

  it('has unique ids and expected cambridge ids', () => {
    const ids = VOCABULARY_COLLECTIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(44);
    expect(ids).toContain('cambridge-01');
    expect(ids).toContain('cambridge-22');
    expect(ids).toContain('scene-natural-geography');
    expect(ids).toContain('scene-time-dates');
  });

  it('volume collections carry volume numbers, scenes carry keywords', () => {
    const cambridge = VOCABULARY_COLLECTIONS.find(
      (c) => c.id === 'cambridge-05',
    ) as (typeof VOCABULARY_COLLECTIONS)[number];
    expect(cambridge.volume).toBe(5);
    expect(cambridge.nameZh).toBeNull();
    const scene = VOCABULARY_COLLECTIONS.find(
      (c) => c.id === 'scene-education',
    ) as (typeof VOCABULARY_COLLECTIONS)[number];
    expect(scene.volume).toBeNull();
    expect(scene.nameZh).toBeTruthy();
    expect(scene.keywords.length).toBeGreaterThan(0);
  });
});

describe('sceneForWord', () => {
  it('is deterministic', () => {
    const entry = allEntries()[10] as typeof allEntries extends () => readonly (infer U)[] ? U : never;
    expect(sceneForWord(entry)).toBe(sceneForWord(entry));
  });

  it('assigns every word to a known scene', () => {
    const ids = new Set(VOCABULARY_COLLECTIONS.filter((c) => c.family === 'thematic').map((c) => c.id));
    for (const entry of allEntries()) {
      expect(ids.has(sceneForWord(entry))).toBe(true);
    }
  });

  it('hints keyword matching (e.g., words with space-related definition)', () => {
    const spaceWord = allEntries().find(
      (e) =>
        e.word.toLowerCase().includes('satellite') ||
        (e.definition?.toLowerCase().includes('satellite') ?? false),
    );
    if (spaceWord !== undefined) {
      expect(sceneForWord(spaceWord)).toBe('scene-space-exploration');
    }
  });

  it('matches later keywords within a scene (second keyword branch)', () => {
    const synthetic = {
      id: 'w99997',
      word: 'orbiting',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'an orbit around the planet',
      senses: [{ pos: 'noun' as const, text: 'an orbit' }],
      morphemes: null,
      volumes: [1],
    };
    expect(sceneForWord(synthetic)).toBe('scene-space-exploration');
  });

  it('matches via morpheme hints', () => {
    const synthetic = {
      id: 'w99996',
      word: 'zzzmorphtest',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'none',
      senses: [{ pos: 'noun' as const, text: 'none' }],
      morphemes: 'orbit(space);test',
      volumes: [1],
    };
    expect(sceneForWord(synthetic)).toBe('scene-space-exploration');
  });

  it('falls back to hash for words without keyword match', () => {
    const synthetic = {
      id: 'w99998',
      word: 'zzzxxyy_test_no_keyword',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'nothing relevant here',
      senses: [{ pos: 'noun' as const, text: 'nothing' }],
      morphemes: null,
      volumes: [1],
    };
    const scene = sceneForWord(synthetic);
    expect(VOCABULARY_COLLECTIONS.some((c) => c.id === scene)).toBe(true);
  });
});

describe('collectionCounts', () => {
  it('sums volume occurrences and thematic assignments', () => {
    const counts = collectionCounts();
    const entries = allEntries();
    const totalVolumeOccurrences = entries.reduce((sum, e) => sum + e.volumes.length, 0);
    const volumeSum = Object.entries(counts)
      .filter(([id]) => id.startsWith('cambridge-'))
      .reduce((sum, [, count]) => sum + count, 0);
    expect(volumeSum).toBe(totalVolumeOccurrences);
    const thematicSum = Object.entries(counts)
      .filter(([id]) => id.startsWith('scene-'))
      .reduce((sum, [, count]) => sum + count, 0);
    expect(thematicSum).toBe(entries.length);
  });
});

describe('findCollection', () => {
  it('finds existing and returns undefined for unknown', () => {
    expect(findCollection('cambridge-01')?.id).toBe('cambridge-01');
    expect(findCollection('scene-education')?.family).toBe('thematic');
    expect(findCollection('does-not-exist')).toBeUndefined();
  });
});

describe('wordsForCollection', () => {
  it('paginates Cambridge volume words sorted by headword', () => {
    const page = wordsForCollection('cambridge-01', 5, 0);
    expect(page.items).toHaveLength(5);
    expect(page.total).toBeGreaterThan(5);
    expect(page.hasMore).toBe(true);
    const sorted = [...page.items].sort((a, b) => a.word.localeCompare(b.word));
    expect(page.items.map((e) => e.word)).toEqual(sorted.map((e) => e.word));
    for (const entry of page.items) {
      expect(entry.volumes).toContain(1);
    }
  });

  it('paginates thematic scene words', () => {
    const sceneId = 'scene-natural-geography';
    const page = wordsForCollection(sceneId, 3, 0);
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThanOrEqual(3);
    for (const entry of page.items) {
      expect(sceneForWord(entry)).toBe(sceneId);
    }
  });

  it('returns empty page for unknown id', () => {
    const page = wordsForCollection('unknown-collection', 10, 0);
    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(0);
    expect(page.hasMore).toBe(false);
  });

  it('honours offset and limit boundaries', () => {
    const all = wordsForCollection('cambridge-10', 100, 0);
    const sliced = wordsForCollection('cambridge-10', 5, 5);
    expect(sliced.items[0]?.word).toBe(all.items[5]?.word);
    expect(sliced.offset).toBe(5);
    expect(sliced.limit).toBe(5);
  });

  it('returns hasMore correctly', () => {
    const first = wordsForCollection('cambridge-01', 5, 0);
    const lastOffset = first.total - 2;
    const tail = wordsForCollection('cambridge-01', 5, lastOffset);
    expect(tail.hasMore).toBe(false);
  });
});

describe('collectionFacets', () => {
  it('returns family facets', () => {
    const facets = collectionFacets();
    expect(facets.family).toEqual(['cambridge', 'thematic']);
  });
});

describe('vocabularyCollectionsStats', () => {
  it('aggregates counts and facets', () => {
    const stats = vocabularyCollectionsStats();
    expect(stats.totalCollections).toBe(44);
    expect(stats.byFamily.cambridge).toBe(22);
    expect(stats.byFamily.thematic).toBe(22);
    expect(stats.cambridgeVolumes).toBe(22);
    expect(stats.thematicScenes).toBe(22);
    expect(stats.totalHeadwords).toBe(allEntries().length);
    expect(stats.meanWordsPerCollection).toBeGreaterThan(0);
    expect(Object.keys(stats.wordsPerCollection)).toHaveLength(44);
    expect(Object.keys(stats.byVolume)).toHaveLength(22);
    expect(stats.byVolume['1']).toBeGreaterThan(0);
  });
});
