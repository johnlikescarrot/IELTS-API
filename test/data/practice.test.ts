import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  findPracticeItem,
  practiceCollections,
  practiceManifest,
  samplePractice,
  searchPractice,
} from '../../src/data/practice.js';
import * as dataset from '../../src/lib/dataset.js';
import { PRACTICE_SOURCE } from '../../src/data/practice-source.js';

import type { PracticeIndex, PracticeItem } from '../../src/types.js';

const page = () => searchPractice({ limit: 2000, offset: 0 });
afterEach(() => {
  vi.restoreAllMocks();
  dataset.clearDatasetCache();
});

describe('practice metadata dataset', () => {
  it('has complete, internally consistent counts at the reviewed commit', () => {
    const manifest = practiceManifest();
    expect(manifest.source).toEqual(PRACTICE_SOURCE);
    expect(manifest.stats).toEqual({
      repositoryFiles: 5545,
      indexedItems: 1852,
      byCollection: {
        'listening-basic': 102,
        'listening-full': 204,
        'reading-basic': 1232,
        'reading-full': 314,
      },
      bySkill: { listening: 306, reading: 1546 },
      byLevel: {
        advanced: 34,
        basic: 34,
        intermediate: 34,
        unspecified: 518,
        'a1-a2': 198,
        'b1-b2': 374,
        'c1-c2': 660,
      },
      byAudio: { present: 303, missing: 3, 'not-applicable': 1546 },
    });
    expect(practiceCollections().reduce((sum, collection) => sum + collection.indexedItems, 0)).toBe(1852);
    expect(practiceCollections().reduce((sum, collection) => sum + collection.declaredItems, 0)).toBe(1853);
    expect(manifest).not.toHaveProperty('items');
  });

  it('contains unique path-derived IDs and only pinned, descriptive metadata', () => {
    const items = page().items;
    expect(items).toHaveLength(1852);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.path)).size).toBe(items.length);
    expect(items.map((item) => item.id)).toEqual(items.map((item) => item.id).sort());
    for (const item of items) {
      expect(item.sourceUrl).toBe(
        `${PRACTICE_SOURCE.repository}/blob/${PRACTICE_SOURCE.commit}/${item.path}`,
      );
      expect(item.sha1).toMatch(/^[a-f0-9]{40}$/);
      expect(item.sizeBytes).toBeGreaterThan(0);
      expect(item).not.toHaveProperty('answers');
      expect(item).not.toHaveProperty('content');
      expect(item).not.toHaveProperty('audioUrl');
    }
  });

  it('fingerprints the exact canonical item serialisation, not formatting or a timestamp', () => {
    const bytes = JSON.stringify(page().items);
    expect(practiceManifest().integrity.value).toBe(createHash('sha256').update(bytes).digest('hex'));
    const onDisk = JSON.parse(
      readFileSync(new URL('../../data/practice.json', import.meta.url), 'utf8'),
    ) as PracticeIndex;
    expect(onDisk.items).toEqual(page().items);
    expect(onDisk.integrity).toEqual(practiceManifest().integrity);
  });

  it('surfaces the missing Reading test and absent companion Listening audio', () => {
    expect(findPracticeItem('reading-full-105')).toBeUndefined();
    expect(findPracticeItem('reading-full-104')).toBeDefined();
    expect(findPracticeItem('reading-full-106')).toBeDefined();
    expect(searchPractice({ audio: 'missing', limit: 100, offset: 0 }).items.map((item) => item.id)).toEqual([
      'listening-full-083',
      'listening-full-085',
      'listening-full-088',
    ]);
  });

  it('does not let library callers mutate shared records or manifest metadata', () => {
    const first = findPracticeItem('reading-basic-a1-a2-001') as PracticeItem;
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => {
      (first as { title: string }).title = 'tampered';
    }).toThrow(TypeError);
    const manifest = practiceManifest();
    expect(Object.isFrozen(manifest.source)).toBe(true);
    expect(Object.isFrozen(manifest.stats.byLevel)).toBe(true);
    expect(Object.isFrozen(manifest.integrity)).toBe(true);
    expect(Object.isFrozen(manifest.rights)).toBe(true);
    expect(Object.isFrozen(manifest.collections)).toBe(true);
    expect(Object.isFrozen(manifest.collections[0]?.levels)).toBe(true);
    expect(findPracticeItem(first.id)?.title).toBe('Reading A1-A2 lesson 1');
  });

  it('fails closed when the item checksum has been corrupted', () => {
    const corrupt = JSON.parse(
      readFileSync(new URL('../../data/practice.json', import.meta.url), 'utf8'),
    ) as PracticeIndex;
    corrupt.integrity.value = '0'.repeat(64);
    vi.spyOn(dataset, 'loadDataset').mockReturnValueOnce(corrupt);
    expect(() => practiceManifest()).toThrow(/checksum mismatch/i);
  });

  it('respects dataset cache clearing instead of holding a second stale cache', () => {
    const first = findPracticeItem('reading-full-001');
    dataset.clearDatasetCache();
    const second = findPracticeItem('reading-full-001');
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

describe('reproducible practice sampling', () => {
  it('matches a versioned golden sample, including through the library interface', () => {
    const sample = samplePractice({
      seed: 'paper-example-v1',
      skill: 'listening',
      mode: 'full-test',
      count: 5,
    });
    expect(sample.population).toBe(204);
    expect(sample.items.map((item) => item.id)).toEqual([
      'listening-full-018',
      'listening-full-090',
      'listening-full-095',
      'listening-full-126',
      'listening-full-163',
    ]);
  });

  it('honours all filters and returns at most the eligible population', () => {
    const sample = samplePractice({
      seed: '  study  ',
      count: 50,
      query: 'lesson 660',
      skill: 'reading',
      collection: 'reading-basic',
      level: 'c1-c2',
      mode: 'exercise',
      audio: 'not-applicable',
    });
    expect(sample.seed).toBe('study');
    expect(sample.requested).toBe(50);
    expect(sample.population).toBe(1);
    expect(sample.items.map((item) => item.id)).toEqual(['reading-basic-c1-c2-660']);
  });

  it('defines seed length in Unicode code points, matching JSON Schema', () => {
    expect(samplePractice({ seed: '😀'.repeat(256), count: 1 }).items).toHaveLength(1);
    expect(() => samplePractice({ seed: '😀'.repeat(257), count: 1 })).toThrow(/seed/);
  });

  it.each(['', '   ', 'a'.repeat(257)])('rejects invalid seeds: %j', (seed) => {
    expect(() => samplePractice({ seed, count: 1 })).toThrow(/seed/);
  });

  it.each([0, 51, 1.5, NaN])('rejects invalid sample counts through the library too: %s', (count) => {
    expect(() => samplePractice({ seed: 'study', count })).toThrow(/count/);
  });
});
