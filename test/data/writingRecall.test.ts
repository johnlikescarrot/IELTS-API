import { describe, expect, it } from 'vitest';

import {
  RECALL_FAMILIES,
  RECALL_THEMES,
  RECALL_TYPES,
  findRecalledPrompt,
  findRecalledPrompts,
  recallMeta,
  recallStats,
  recalledPromptsPage,
} from '../../src/data/writingRecall.js';

describe('writing recall dataset', () => {
  it('indexes the recalled prompts with complete annotations', () => {
    const stats = recallStats();
    expect(stats.rows).toBe(235);
    expect(stats.prompts).toBe(232);
    expect(stats.repeatedPrompts).toBe(3);
    expect(stats.withDifficulty).toBe(235);
    expect(stats.skippedRows).toBe(0);
    expect(stats.byType).toEqual({
      'agree-disagree': 93,
      'discuss-both-views': 62,
      'two-part': 33,
      'positive-negative': 28,
      'advantage-disadvantage': 19,
    });
    expect(Object.keys(stats.byTheme)).toEqual(RECALL_THEMES);
  });

  it('exposes the filter vocabularies', () => {
    expect(RECALL_TYPES).toHaveLength(5);
    expect(RECALL_FAMILIES).toEqual(['opinion', 'discussion', 'advantages-disadvantages', 'two-part']);
    expect(RECALL_THEMES).toContain('教育类');
  });

  it('keeps identifiers unique and occurrence counts consistent', () => {
    const prompts = findRecalledPrompts({});
    const ids = new Set(prompts.map((prompt) => prompt.id));
    expect(ids.size).toBe(prompts.length);
    const repeated = prompts.filter((prompt) => prompt.occurrences > 1);
    expect(repeated).toHaveLength(3);
    for (const prompt of prompts) {
      expect(prompt.prompt.length).toBeGreaterThan(20);
      expect(prompt.difficulty === null || [1, 2, 3].includes(prompt.difficulty)).toBe(true);
      expect(RECALL_TYPES).toContain(prompt.type);
      expect(RECALL_FAMILIES).toContain(prompt.family);
    }
  });

  it('cross-references the theme bank where a counterpart exists', () => {
    const environment = findRecalledPrompts({ theme: '环境类' });
    expect(environment.length).toBeGreaterThan(0);
    expect(environment.every((prompt) => prompt.themeGroup === 'environment')).toBe(true);
    const government = findRecalledPrompts({ theme: '政府类' });
    expect(government.length).toBeGreaterThan(0);
    expect(government.every((prompt) => prompt.themeGroup === null)).toBe(true);
  });

  it('filters by type, family and free text', () => {
    const discussions = findRecalledPrompts({ type: 'discuss-both-views' });
    expect(discussions.every((prompt) => prompt.type === 'discuss-both-views')).toBe(true);
    expect(findRecalledPrompts({ type: 'two-part' })).toHaveLength(33);

    // 121 opinion rows collapse to 120 unique prompts (one is recalled twice)
    const opinion = findRecalledPrompts({ family: 'opinion' });
    expect(opinion).toHaveLength(120);
    expect(recallStats().byFamily.opinion).toBe(121);

    expect(findRecalledPrompts({ query: 'environment' }).length).toBeGreaterThan(3);
    expect(findRecalledPrompts({ query: 'xyzzy-nothing' })).toHaveLength(0);
  });

  it('paginates and sorts, including prompts without a difficulty rating', () => {
    const page = recalledPromptsPage({ limit: 10, offset: 0 });
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(232);

    const hardest = recalledPromptsPage({ sort: 'difficulty', order: 'desc', limit: 5, offset: 0 });
    expect(hardest.items.every((prompt) => prompt.difficulty === 3)).toBe(true);

    const recurring = recalledPromptsPage({ sort: 'occurrences', order: 'desc', limit: 3, offset: 0 });
    expect(recurring.items[0]?.occurrences).toBeGreaterThanOrEqual(2);

    const tail = recalledPromptsPage({ sort: 'id', order: 'desc', limit: 2, offset: 230 });
    expect(tail.items.map((prompt) => prompt.id)).toEqual(['wr-002', 'wr-001']);
    expect(tail.hasMore).toBe(false);
  });

  it('finds single prompts and misses unknown identifiers', () => {
    const prompt = findRecalledPrompt('wr-001');
    expect(prompt?.type).toBe('agree-disagree');
    expect(prompt?.themeGroup).toBe('environment');
    expect(findRecalledPrompt('wr-999')).toBeUndefined();
  });

  it('documents its provenance honestly', () => {
    const meta = recallMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.note).toContain('not an official release');
    expect(meta.license).toContain('unlicensed');
  });
});
