import { describe, expect, it } from 'vitest';

import {
  PRACTICE_MODULES,
  practice,
  practiceFacets,
  practiceItems,
  practiceMeta,
  practiceStats,
  searchPractice,
} from '../../src/data/practice.js';

const page = (overrides: Partial<Parameters<typeof searchPractice>[0]> = {}) =>
  searchPractice({ limit: 10, offset: 0, ...overrides });

describe('the practice corpus index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = practiceMeta();
    expect(meta.repository).toBe('https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    expect(meta.license).toContain('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole practice corpus', () => {
    const stats = practiceStats();
    expect(stats.modulesInRepository).toBeGreaterThan(5000);
    expect(stats.practiceItems).toBeGreaterThan(1000);
    expect(stats.audioFiles).toBe(310);
    expect(stats.byModule['reading-band']).toBe(1232);
    expect(stats.byModule['reading-full-test']).toBe(314);
    expect(stats.byModule['listening-full-test']).toBe(204);
    expect(stats.byModule['listening-basic']).toBe(102);
  });

  it('indexes only metadata, never content', () => {
    for (const item of practiceItems()) {
      expect(item.sourceUrl.startsWith('https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS')).toBe(
        true,
      );
      expect(item.title.length).toBeGreaterThan(0);
      expect(PRACTICE_MODULES).toContain(item.module);
    }
  });

  it('sorts level facets and includes the CEFR levels', () => {
    const levels = practiceFacets('level');
    expect(levels).toContain('A1-A2');
    expect(levels).toContain('Advanced');
    expect([...levels]).toEqual([...levels].sort());
  });
});

describe('practiceFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['module', 'level', 'format'] as const) {
      const values = practiceFacets(facet);
      expect(values.length).toBeGreaterThan(1);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('searchPractice', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(practiceStats().practiceItems);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text', () => {
    const result = page({ query: 'London Underground', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by module, level and format', () => {
    const modules = page({ modules: ['reading-band'], limit: 50 });
    expect(modules.items.every((item) => item.module === 'reading-band')).toBe(true);
    const levels = page({ levels: ['B1-B2'], limit: 50 });
    expect(levels.items.every((item) => item.level === 'B1-B2')).toBe(true);
    const formats = page({ formats: ['json'], limit: 50 });
    expect(formats.items.every((item) => item.format === 'json')).toBe(true);
  });

  it('sorts by title, module, level and size', () => {
    expect(page({ sort: 'module', limit: 5 }).items.map((item) => item.module)).toEqual(
      [...page({ sort: 'module', limit: 5 }).items.map((item) => item.module)].sort(),
    );
    const bySize = page({ sort: 'size', order: 'desc', limit: 3 });
    expect(bySize.items[0]!.sizeBytes ?? 0).toBeGreaterThanOrEqual(bySize.items[2]!.sizeBytes ?? 0);
    expect(page({ sort: 'level', limit: 5 }).items.length).toBe(5);
  });

  it('returns an empty page when nothing matches', () => {
    expect(page({ formats: ['definitely-not-a-format'] }).items).toEqual([]);
    expect(page({ sort: 'level', limit: 10 }).items.length).toBe(10);
  });
});

describe('practice()', () => {
  it('loads the dataset from disk', () => {
    expect(practice().items.length).toBeGreaterThan(0);
  });
});
