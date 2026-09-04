import { describe, expect, it } from 'vitest';

import { corpusFacets, corpusItems, corpusMeta, corpusStats, searchCorpus } from '../../src/data/corpus.js';

const page = (overrides: Partial<Parameters<typeof searchCorpus>[0]> = {}) =>
  searchCorpus({ limit: 10, offset: 0, ...overrides });

describe('the corpus index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = corpusMeta();
    expect(meta.repository).toBe('https://github.com/zhengyishiming/IELTS');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole upstream repository', () => {
    const stats = corpusStats();
    expect(stats.filesInRepository).toBe(404);
    expect(stats.ieltsRelevantFiles).toBe(76);
    expect(stats.coverageRatio).toBeCloseTo(0.1881, 3);
    expect(stats.byFormat.rar).toBe(244);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(5);
  });

  it('indexes only IELTS-relevant items', () => {
    expect(corpusItems()).toHaveLength(76);
    for (const item of corpusItems()) {
      expect(item.sourceUrl.startsWith('https://github.com/zhengyishiming/IELTS/blob/main/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });
});

describe('corpusFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['category', 'skill', 'format'] as const) {
      const values = corpusFacets(facet);
      expect(values.length).toBeGreaterThan(1);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('searchCorpus', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(76);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text', () => {
    const result = page({ query: 'writing', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(76);
  });

  it('filters by category, skill and format', () => {
    const categories = page({ categories: ['ielts-writing'], limit: 50 });
    expect(categories.items.every((item) => item.category === 'ielts-writing')).toBe(true);
    const skills = page({ skills: ['vocabulary'], limit: 50 });
    expect(skills.items.every((item) => item.skill === 'vocabulary')).toBe(true);
    const formats = page({ formats: ['epub'], limit: 50 });
    expect(formats.items.every((item) => item.format === 'epub')).toBe(true);
  });

  it('sorts by category, skill and size', () => {
    expect(page({ sort: 'category', limit: 5 }).items.map((item) => item.category)).toEqual(
      [...page({ sort: 'category', limit: 5 }).items.map((item) => item.category)].sort(),
    );
    const bySize = page({ sort: 'size', order: 'desc', limit: 3 });
    expect(bySize.items[0]!.sizeBytes ?? 0).toBeGreaterThanOrEqual(bySize.items[2]!.sizeBytes ?? 0);
    expect(page({ sort: 'skill', limit: 3 }).items.map((item) => item.skill)).toEqual(
      [...page({ sort: 'skill', limit: 3 }).items.map((item) => item.skill)].sort(),
    );
    expect(page({ sort: 'title', order: 'desc', limit: 3 }).items.length).toBe(3);
  });

  it('returns an empty page when nothing matches', () => {
    expect(page({ categories: ['not-a-category'] }).items).toEqual([]);
  });
});
