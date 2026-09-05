import { describe, expect, it } from 'vitest';

import {
  RECALL_KINDS,
  RECALL_PARTS,
  RECALL_SKILLS,
  RECALL_TIERS,
  findRecallItem,
  recallCollections,
  recallFacets,
  recallItems,
  recallMeta,
  recallStats,
  searchRecallItems,
} from '../../src/data/recall.js';

const page = (overrides: Partial<Parameters<typeof searchRecallItems>[0]> = {}) =>
  searchRecallItems({ limit: 10, offset: 0, ...overrides });

describe('the exam-recall index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = recallMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole upstream repository', () => {
    const stats = recallStats();
    expect(stats.indexedItems).toBe(423);
    expect(stats.bySkill).toEqual({ speaking: 94, reading: 323, listening: 6 });
    expect(stats.repository.filesInRepository).toBe(2385);
    expect(stats.repository.byFormat.pdf).toBe(1282);
    expect(stats.repository.bySkill.reading).toBeGreaterThan(1000);
  });

  it('measures the seasonal speaking structure', () => {
    const speaking = recallStats().speaking;
    expect(speaking.part1Topics).toBe(18);
    expect(speaking.part1Questions).toBe(79);
    expect(speaking.cueCards).toBe(76);
    expect(speaking.cueCardsNew).toBe(27);
    expect(speaking.cueCardsRetained).toBe(49);
    expect(speaking.cueCardsByCategory).toEqual({ events: 26, objects: 25, people: 16, places: 9 });
    expect(speaking.bankCueCards).toBe(22);
    expect(speaking.bankPart3Questions).toBe(121);
  });

  it('measures the reading and listening structure', () => {
    const stats = recallStats();
    expect(stats.reading.articles).toBe(323);
    expect(stats.reading.backupFilesExcluded).toBe(11);
    expect(stats.reading.nonArticleFilesExcluded).toBe(2);
    expect(stats.reading.byPart).toEqual({ 1: 96, 2: 104, 3: 123 });
    expect(stats.reading.byCollection['sept-2025']).toBe(81);
    expect(stats.listening).toEqual({ testSets: 6, answers: 240, audioTracks: 24 });
  });

  it('indexes every item with provenance', () => {
    for (const item of recallItems()) {
      expect(item.sourceUrl.startsWith('https://github.com/Oxidaner/ielts/blob/main/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.id.length).toBeGreaterThan(0);
    }
  });
});

describe('recallFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['kind', 'skill', 'collection', 'tier', 'category', 'status', 'season'] as const) {
      const values = recallFacets(facet);
      expect(values.length).toBeGreaterThan(0);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('publishes the expected facet values', () => {
    expect(recallFacets('kind')).toEqual([
      'listening-test',
      'reading-article',
      'speaking-cue-card',
      'speaking-topic',
    ]);
    expect(recallFacets('skill')).toEqual(['listening', 'reading', 'speaking']);
    // No background-tier article survives in the indexed HTML set; the tier
    // itself stays part of the taxonomy (`RECALL_TIERS`).
    expect(recallFacets('tier')).toEqual(['high', 'next']);
    expect(RECALL_TIERS).toEqual(['high', 'next', 'background']);
    expect(recallFacets('category')).toEqual(['events', 'objects', 'people', 'places']);
    expect(recallFacets('status')).toEqual(['new', 'retained']);
    expect(recallFacets('season')).toContain('2025-09');
    expect(recallCollections()).toContain('sept-2025');
  });
});

describe('findRecallItem', () => {
  it('finds items case-insensitively and tolerates whitespace', () => {
    expect(findRecallItem('sp1-01-machine')?.title).toBe('Machine');
    expect(findRecallItem(' SP1-01-MACHINE ')?.id).toBe('sp1-01-machine');
    expect(findRecallItem('ls-241123l')?.questions).toBe(40);
    expect(findRecallItem('does-not-exist')).toBeUndefined();
  });
});

describe('searchRecallItems', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(423);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text across titles and identifiers', () => {
    expect(page({ query: 'tea', limit: 100 }).total).toBeGreaterThan(5);
    expect(page({ query: 'sp2-', limit: 100 }).total).toBe(76);
    expect(page({ query: '打哈欠' }).total).toBeGreaterThan(0);
    expect(page({ query: 'zzz-not-present' }).total).toBe(0);
  });

  it('filters by kind and skill', () => {
    expect(page({ kinds: ['listening-test'], limit: 100 }).total).toBe(6);
    expect(page({ kinds: ['speaking-topic', 'speaking-cue-card'], limit: 100 }).total).toBe(94);
    expect(page({ skills: ['reading'], limit: 100 }).total).toBe(323);
  });

  it('filters by collection, tier and part', () => {
    expect(page({ collections: ['sept-2025'], limit: 100 }).total).toBe(81);
    const high = page({ tiers: ['high'], limit: 500 });
    expect(high.total).toBe(197);
    expect(high.items.every((item) => item.tier === 'high')).toBe(true);
    expect(page({ parts: [2], limit: 500 }).items.every((item) => item.part === 2)).toBe(true);
  });

  it('filters by category, status and season', () => {
    const people = page({ categories: ['people'], limit: 100 });
    expect(people.total).toBe(16);
    expect(people.items.every((item) => item.category === 'people')).toBe(true);
    expect(page({ statuses: ['retained'], limit: 100 }).total).toBe(49);
    expect(page({ seasons: ['2025-09/2025-12'], limit: 100 }).total).toBe(94);
  });

  it('combines filters', () => {
    const result = page({
      skills: ['speaking'],
      kinds: ['speaking-cue-card'],
      statuses: ['new'],
      limit: 100,
    });
    expect(result.total).toBe(27);
  });

  it('sorts by every key in both directions', () => {
    const byTitle = page({ sort: 'title', limit: 5 });
    const titles = byTitle.items.map((item) => item.title.toLowerCase());
    expect([...titles]).toEqual([...titles].sort());
    const byTitleDesc = page({ sort: 'title', order: 'desc', limit: 5 });
    const first = byTitleDesc.items[0]?.title.toLowerCase() ?? '';
    const second = byTitleDesc.items[1]?.title.toLowerCase() ?? '';
    expect(first >= second).toBe(true);
    const byQuestions = page({ sort: 'questions', order: 'desc', limit: 500 });
    expect(byQuestions.items[0]?.questions).toBe(40);
    const byPart = page({ sort: 'part', order: 'asc', limit: 5 });
    expect(byPart.items[0]?.part).toBeNull(); // items without a part sort as 0
    const byId = page({ sort: 'id', limit: 3 });
    expect(byId.items[0]?.id).toBe('ls-241123l');
  });

  it('ignores empty filter arrays', () => {
    expect(
      page({
        kinds: [],
        skills: [],
        collections: [],
        tiers: [],
        categories: [],
        statuses: [],
        seasons: [],
        parts: [],
      }).total,
    ).toBe(423);
  });
});

describe('the recall constants', () => {
  it('cover the observed data', () => {
    expect(RECALL_PARTS).toEqual([1, 2, 3]);
    expect(RECALL_KINDS).toHaveLength(4);
    expect(RECALL_SKILLS).toHaveLength(3);
  });
});
