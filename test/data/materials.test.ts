import { describe, expect, it } from 'vitest';

import {
  materialsFacets,
  materialsItems,
  materialsMeta,
  materialsStats,
  searchMaterials,
} from '../../src/data/materials.js';

const page = (overrides: Partial<Parameters<typeof searchMaterials>[0]> = {}) =>
  searchMaterials({ limit: 10, offset: 0, ...overrides });

describe('the materials index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = materialsMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.attribution).toContain('no upstream licence');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole upstream collection', () => {
    const stats = materialsStats();
    expect(stats.filesInRepository).toBe(2385);
    expect(stats.indexedFiles).toBe(2354);
    expect(stats.excludedFiles).toBe(31);
    expect(stats.indexedFiles + stats.excludedFiles).toBe(stats.filesInRepository);
    expect(stats.indexedBytes).toBeGreaterThan(1_000_000_000);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(8);
    expect(stats.bySkill.reading).toBe(1593);
  });

  it('indexes only metadata with unique, resolvable identifiers', () => {
    const items = materialsItems();
    expect(items.length).toBe(materialsStats().indexedFiles);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    for (const item of items) {
      expect(item.sourceUrl.startsWith('https://github.com/Oxidaner/ielts/blob/main/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.sizeBytes).toBeGreaterThanOrEqual(0);
      expect(item.path.length).toBeGreaterThan(0);
    }
  });
});

describe('materialsFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['category', 'skill', 'format'] as const) {
      const values = materialsFacets(facet);
      expect(values.length).toBeGreaterThan(3);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('covers the expected categories and skills', () => {
    const categories = materialsFacets('category');
    for (const expected of [
      'answer-key',
      'audio',
      'idea-bank',
      'methodology',
      'past-paper-recall',
      'practice-material',
      'question-bank',
      'template',
      'vocabulary',
    ]) {
      expect(categories).toContain(expected);
    }
    expect(materialsFacets('skill')).toContain('writing');
    expect(materialsFacets('skill')).toContain('general');
    expect(materialsFacets('format')).toContain('pdf');
  });
});

describe('searchMaterials', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(materialsStats().indexedFiles);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text across paths and titles', () => {
    const result = page({ query: 'vocabulary', limit: 50 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(materialsStats().indexedFiles);
  });

  it('filters by category, skill and format', () => {
    const category = page({ categories: ['template'], limit: 100 });
    expect(category.total).toBeGreaterThan(0);
    expect(category.items.every((item) => item.category === 'template')).toBe(true);

    const skill = page({ skills: ['speaking'], limit: 100 });
    expect(skill.items.every((item) => item.skill === 'speaking')).toBe(true);

    const format = page({ formats: ['mp3'], limit: 100 });
    expect(format.items.every((item) => item.format === 'mp3')).toBe(true);

    const empty = page({ skills: ['speaking'], formats: ['mp3'], categories: ['template'] });
    expect(empty.total).toBe(0);
  });

  it('sorts by size and category in both directions', () => {
    const descending = page({ sort: 'size', order: 'desc', limit: 5 });
    for (let index = 1; index < descending.items.length; index += 1) {
      const previous = descending.items[index - 1] as { sizeBytes: number };
      const current = descending.items[index] as { sizeBytes: number };
      expect(previous.sizeBytes).toBeGreaterThanOrEqual(current.sizeBytes);
    }
    const byCategory = page({ sort: 'category', limit: 10 });
    expect(byCategory.items[0]!.category <= byCategory.items[9]!.category).toBe(true);

    const bySkill = page({ sort: 'skill', order: 'desc', limit: 10 });
    expect(bySkill.items.every((item) => typeof item.skill === 'string')).toBe(true);
    const skillNames = bySkill.items.map((item) => item.skill);
    expect([...skillNames].sort().reverse()).toEqual(skillNames.sort().reverse());
    expect(page({ sort: 'title', limit: 3 }).items.length).toBe(3);
  });

  it('applies filters conjunctively', () => {
    const combined = page({ categories: ['question-bank'], skills: ['speaking'] });
    expect(combined.total).toBeGreaterThan(0);
    for (const item of combined.items) {
      expect(item.category).toBe('question-bank');
      expect(item.skill).toBe('speaking');
    }
  });
});
