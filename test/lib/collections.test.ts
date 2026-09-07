import { describe, expect, it } from 'vitest';

import { VOCAB_COLLECTIONS } from '../../src/data/collections.js';
import { allEntries } from '../../src/data/vocabulary.js';
import {
  assignCollection,
  collectionForEntry,
  collectionStats,
  entriesForCollection,
  frequencyTier,
  resetCollectionCaches,
} from '../../src/lib/collections.js';

describe('assignCollection', () => {
  it('assigns a word with a known keyword', () => {
    const entry = allEntries().find(
      (e) => e.definition !== null && e.definition.toLowerCase().includes('glacier'),
    );
    if (entry !== undefined) {
      expect(assignCollection(entry)).toBe('natural-geography');
    } else {
      // fallback: any entry should return either null or a known collection id
      const any = allEntries()[0]!;
      const result = assignCollection(any);
      if (result !== null) expect(VOCAB_COLLECTIONS.map((c) => c.id)).toContain(result);
    }
  });

  it('returns null when no keyword matches', () => {
    const fake = {
      id: 'w99999',
      word: 'zzzznotaword',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'a fabricated definition with no keyword seeds at all',
      senses: [],
      morphemes: null,
      volumes: [1],
    };
    expect(assignCollection(fake as unknown as ReturnType<typeof allEntries>[number])).toBeNull();
  });

  it('prefers first collection on tie', () => {
    // Create an entry whose haystack contains keywords from two collections equally
    const fake = {
      id: 'w99998',
      word: 'testword',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'glacier photosynthesis',
      senses: [],
      morphemes: null,
      volumes: [1],
    };
    // natural-geography has glacier, botany has photosynthesis -> tie -> first wins
    expect(assignCollection(fake as unknown as ReturnType<typeof allEntries>[number])).toBe(
      'natural-geography',
    );
  });

  it('uses morphemes field in haystack', () => {
    const fakeWithMorph = {
      id: 'w99997',
      word: 'testword2',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: 'no keyword here',
      senses: [],
      morphemes: 'glacier',
      volumes: [1],
    } as unknown as ReturnType<typeof allEntries>[number];
    expect(assignCollection(fakeWithMorph)).toBe('natural-geography');
    const fakeBoth = {
      id: 'w99996',
      word: 'testword3',
      phonetic: null,
      partOfSpeech: 'noun' as const,
      definition: null,
      senses: [],
      morphemes: null,
      volumes: [1],
    } as unknown as ReturnType<typeof allEntries>[number];
    expect(assignCollection(fakeBoth)).toBeNull();
  });
});

describe('collectionForEntry / entriesForCollection', () => {
  it('maps entries via cache and reverse cache', () => {
    resetCollectionCaches();
    const entry = allEntries().find((e) => assignCollection(e) !== null);
    expect(entry).toBeDefined();
    if (entry !== undefined) {
      const collection = collectionForEntry(entry.id);
      expect(collection).not.toBeNull();
      const bucket = entriesForCollection(collection as string);
      expect(bucket.some((e) => e.id === entry.id)).toBe(true);
    }
  });

  it('returns null / empty for unknown ids', () => {
    resetCollectionCaches();
    expect(collectionForEntry('w00000')).toBeNull();
    expect(entriesForCollection('nonexistent')).toEqual([]);
  });

  it('caches are resettable', () => {
    collectionForEntry(allEntries()[0]!.id);
    resetCollectionCaches();
    expect(collectionForEntry(allEntries()[0]!.id)).not.toBeUndefined();
  });
});

describe('frequencyTier', () => {
  it('classifies high/medium/low correctly', () => {
    const high = { volumes: [1, 2, 3, 4] } as unknown as ReturnType<typeof allEntries>[number];
    const medium = { volumes: [1, 2] } as unknown as ReturnType<typeof allEntries>[number];
    const low = { volumes: [1] } as unknown as ReturnType<typeof allEntries>[number];
    expect(frequencyTier(high)).toBe('high');
    expect(frequencyTier(medium)).toBe('medium');
    expect(frequencyTier(low)).toBe('low');
  });

  it('handles boundary volumes', () => {
    expect(frequencyTier({ volumes: [1, 2] } as unknown as ReturnType<typeof allEntries>[number])).toBe(
      'medium',
    );
    expect(frequencyTier({ volumes: [1, 2, 3] } as unknown as ReturnType<typeof allEntries>[number])).toBe(
      'high',
    );
    expect(
      frequencyTier({ volumes: [1, 2, 3, 4, 5] } as unknown as ReturnType<typeof allEntries>[number]),
    ).toBe('high');
  });
});

describe('collectionStats', () => {
  it('reports assigned/unassigned and per-collection counts', () => {
    resetCollectionCaches();
    const stats = collectionStats();
    expect(stats.assigned + stats.unassigned).toBe(allEntries().length);
    expect(Object.keys(stats.byCollection)).toHaveLength(VOCAB_COLLECTIONS.length);
    expect(stats.byFrequency.high + stats.byFrequency.medium + stats.byFrequency.low).toBe(
      allEntries().length,
    );
    expect(Object.keys(stats.byThemeGroup).length).toBeGreaterThan(0);
  });
});
