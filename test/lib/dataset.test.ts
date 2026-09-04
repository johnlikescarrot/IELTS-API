import { afterEach, describe, expect, it } from 'vitest';

import { clearDatasetCache, loadDataset } from '../../src/lib/dataset.js';

describe('loadDataset', () => {
  afterEach(() => {
    clearDatasetCache();
  });

  it('loads and caches a dataset', () => {
    const first = loadDataset<{ meta: { words: number } }>('vocabulary.json');
    const second = loadDataset<{ meta: { words: number } }>('vocabulary.json');
    expect(first).toBe(second);
    expect(first.meta.words).toBeGreaterThan(4000);
  });

  it('loads the corpus index too', () => {
    const corpus = loadDataset<{ stats: { filesInRepository: number } }>('corpus.json');
    expect(corpus.stats.filesInRepository).toBe(404);
  });

  it('throws for a missing dataset', () => {
    expect(() => loadDataset('does-not-exist.json')).toThrow();
  });

  it('re-reads from disk after the cache is cleared', () => {
    const first = loadDataset<{ meta: object }>('corpus.json');
    clearDatasetCache();
    const second = loadDataset<{ meta: object }>('corpus.json');
    expect(second).not.toBe(first);
    expect(second.meta).toEqual(first.meta);
  });
});
