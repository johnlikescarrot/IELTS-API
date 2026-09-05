import { describe, expect, it } from 'vitest';

import {
  oxidanerFacets,
  oxidanerItems,
  oxidanerMeta,
  oxidanerStats,
  searchOxidaner,
} from '../../src/data/collections.js';

const page = (overrides: Partial<Parameters<typeof searchOxidaner>[0]> = {}) =>
  searchOxidaner({ limit: 10, offset: 0, ...overrides });

describe('the Oxidaner/ielts index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = oxidanerMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.note).toContain('never');
  });

  it('reports statistics for the whole upstream repository', () => {
    const stats = oxidanerStats();
    expect(stats.filesInRepository).toBe(2385);
    expect(stats.totalBytes).toBeGreaterThan(5e9);
    expect(stats.audioFiles).toBe(370);
    expect(stats.machineReadableFiles).toBeGreaterThan(0);
    expect(stats.bySkill.reading).toBe(1623);
    expect(stats.bySkill.listening).toBe(722);
    expect(stats.byFormat.pdf).toBe(1282);
  });

  it('indexes every upstream file with stable identifiers', () => {
    expect(oxidanerItems()).toHaveLength(2385);
    const ids = new Set<string>();
    for (const item of oxidanerItems()) {
      expect(item.sourceUrl).toContain('https://github.com/Oxidaner/ielts/blob/');
      expect(item.title.length).toBeGreaterThan(0);
      ids.add(item.id);
    }
    expect(ids.size).toBe(2385);
  });
});

describe('oxidanerFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['skill', 'category', 'format'] as const) {
      const values = oxidanerFacets(facet);
      expect(values.length).toBeGreaterThan(1);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('searchOxidaner', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(2385);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text', () => {
    const result = page({ query: 'listening', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(2385);
  });

  it('filters by skill, category and format', () => {
    const skills = page({ skills: ['writing'], limit: 50 });
    expect(skills.items.every((item) => item.skill === 'writing')).toBe(true);
    const categories = page({ categories: ['audio'], limit: 50 });
    expect(categories.items.every((item) => item.category === 'audio')).toBe(true);
    const formats = page({ formats: ['mp3'], limit: 50 });
    expect(formats.items.every((item) => item.format === 'mp3')).toBe(true);
  });

  it('sorts by skill, category and size', () => {
    expect(page({ sort: 'skill', limit: 5 }).items.map((item) => item.skill)).toEqual(
      [...page({ sort: 'skill', limit: 5 }).items.map((item) => item.skill)].sort(),
    );
    const bySize = page({ sort: 'size', order: 'desc', limit: 3 });
    expect(bySize.items[0]!.sizeBytes).toBeGreaterThanOrEqual(bySize.items[2]!.sizeBytes);
    expect(page({ sort: 'category', limit: 3 }).items.map((item) => item.category)).toEqual(
      [...page({ sort: 'category', limit: 3 }).items.map((item) => item.category)].sort(),
    );
    expect(page({ sort: 'title', order: 'desc', limit: 3 }).items).toHaveLength(3);
  });

  it('returns an empty page when nothing matches', () => {
    expect(page({ skills: ['not-a-skill'] }).items).toEqual([]);
  });
});
