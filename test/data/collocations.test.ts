import { describe, expect, it } from 'vitest';

import {
  COLLOCATION_KINDS,
  COLLOCATION_POLARITIES,
  collocationDimensions,
  collocationItems,
  collocationsMeta,
  collocationsStats,
  observedDimensions,
  observedGroups,
  randomCollocations,
  searchCollocations,
} from '../../src/data/collocations.js';

const page = (overrides: Partial<Parameters<typeof searchCollocations>[0]> = {}) =>
  searchCollocations({ limit: 10, offset: 0, ...overrides });

describe('the collocation bank', () => {
  it('documents its provenance and its limitations', () => {
    const meta = collocationsMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.source).toBe('口语/口语part 3方法论.md');
    expect(meta.sourceUrl).toContain('blob/738c60828118f8f9d720e548b73245dd0fe70a30');
    expect(meta.note).toContain('not redistributed');
    expect(meta.license).toBe('CC BY 4.0');
  });

  it('reports statistics consistent with the items', () => {
    const stats = collocationsStats();
    const items = collocationItems();
    expect(stats.phrases).toBe(items.length);
    expect(stats.phrases).toBe(245);
    expect(stats.distinctPhrases).toBeLessThan(stats.phrases);
    expect(stats.dimensions).toBe(14);
    expect(stats.byKind.frame).toBe(8);
    const polarities = Object.values(stats.byPolarity).reduce((sum, count) => sum + count, 0);
    expect(polarities).toBe(stats.phrases);
    const dimensions = Object.values(stats.byDimension).reduce((sum, count) => sum + count, 0);
    expect(dimensions).toBe(stats.phrases);
  });

  it('keeps stable identifiers and non-empty phrases', () => {
    const items = collocationItems();
    expect(items[0]?.id).toBe('c0001');
    expect(items.at(-1)?.id).toBe('c0245');
    for (const item of items) {
      expect(item.phrase.length).toBeGreaterThan(1);
      expect(item.dimension.length).toBeGreaterThan(0);
      expect(item.group.length).toBeGreaterThan(0);
      expect(COLLOCATION_POLARITIES).toContain(item.polarity);
      expect(COLLOCATION_KINDS).toContain(item.kind);
    }
  });
});

describe('collocationDimensions', () => {
  it('catalogues every dimension with a live phrase count', () => {
    const catalogue = collocationDimensions();
    expect(catalogue).toHaveLength(14);
    const counts = collocationsStats().byDimension;
    for (const dimension of catalogue) {
      expect(dimension.label.length).toBeGreaterThan(0);
      expect(dimension.description.length).toBeGreaterThan(0);
      expect(dimension.source.length).toBeGreaterThan(0);
      expect(dimension.phrases).toBe(counts[dimension.id] ?? 0);
    }
    expect(observedDimensions()).toEqual(catalogue.map((dimension) => dimension.id).sort());
  });

  it('lists the sub-groups used inside a dimension and across the bank', () => {
    const personality = observedGroups('personality');
    expect(personality).toContain('introverted-traits');
    expect(personality).toContain('extroverted-feelings');
    expect(observedGroups()).toContain('positive-emotions');
    expect(new Set(observedGroups()).size).toBe(observedGroups().length);
  });
});

describe('searchCollocations', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 4 });
    expect(result.items).toHaveLength(4);
    expect(result.total).toBe(245);
    expect(result.hasMore).toBe(true);
  });

  it('searches phrases and glosses by free text', () => {
    const english = page({ query: 'money', limit: 10 });
    expect(english.total).toBeGreaterThan(0);
    const chinese = page({ query: '情绪', limit: 10 });
    expect(chinese.total).toBeGreaterThan(0);
    expect(chinese.items.every((item) => item.gloss?.includes('情绪'))).toBe(true);
  });

  it('filters by dimension, group, polarity and kind', () => {
    const dimensions = page({ dimensions: ['money'], limit: 50 });
    expect(dimensions.items.every((item) => item.dimension === 'money')).toBe(true);
    expect(dimensions.total).toBe(31);
    const groups = page({ groups: ['introverted-traits'], limit: 50 });
    expect(groups.items.every((item) => item.group === 'introverted-traits')).toBe(true);
    const polarities = page({ polarities: ['negative'], limit: 100 });
    expect(polarities.items.every((item) => item.polarity === 'negative')).toBe(true);
    expect(polarities.total).toBe(45);
    const kinds = page({ kinds: ['frame'], limit: 50 });
    expect(kinds.items.every((item) => item.kind === 'frame')).toBe(true);
    expect(kinds.total).toBe(8);
  });

  it('combines filters', () => {
    const result = page({ dimensions: ['money'], polarities: ['negative'], limit: 50 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.dimension === 'money' && item.polarity === 'negative')).toBe(
      true,
    );
  });

  it('sorts by phrase, dimension and polarity', () => {
    expect(page({ sort: 'phrase', limit: 5 }).items.map((item) => item.phrase.toLowerCase())).toEqual(
      [...page({ sort: 'phrase', limit: 5 }).items.map((item) => item.phrase.toLowerCase())].sort(),
    );
    expect(page({ sort: 'dimension', limit: 3 }).items.map((item) => item.dimension)).toEqual(
      [...page({ sort: 'dimension', limit: 3 }).items.map((item) => item.dimension)].sort(),
    );
    expect(page({ sort: 'polarity', limit: 3 }).items.map((item) => item.polarity)).toEqual(
      [...page({ sort: 'polarity', limit: 3 }).items.map((item) => item.polarity)].sort(),
    );
    expect(page({ sort: 'phrase', order: 'desc', limit: 3 }).items.length).toBe(3);
  });

  it('returns an empty page when nothing matches', () => {
    expect(page({ dimensions: ['not-a-dimension'] }).items).toEqual([]);
    expect(page({ groups: ['not-a-group'] }).items).toEqual([]);
    expect(page({ kinds: ['not-a-kind'] }).items).toEqual([]);
    expect(page({ polarities: ['not-a-polarity'] }).items).toEqual([]);
    expect(page({ query: 'zzzz-not-a-phrase' }).items).toEqual([]);
  });
});

describe('randomCollocations', () => {
  it('is deterministic for a seed', () => {
    expect(randomCollocations('2025-09', 3)).toEqual(randomCollocations('2025-09', 3));
  });

  it('returns distinct entries in the requested amount', () => {
    const entries = randomCollocations('ielts-api', 4);
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(4);
  });

  it('changes with the seed', () => {
    expect(randomCollocations('a', 5)).not.toEqual(randomCollocations('b', 5));
  });
});
