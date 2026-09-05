import { describe, expect, it } from 'vitest';

import {
  THEMES,
  THEME_CATEGORIES,
  THEME_META,
  THEME_SKILLS,
  findTheme,
  randomThemes,
  searchThemes,
  themeStats,
} from '../../src/data/themes.js';

describe('theme dataset', () => {
  it('exposes exactly 50 themes ordered by rank', () => {
    expect(THEMES).toHaveLength(50);
    THEMES.forEach((theme, index) => {
      expect(theme.rank).toBe(index + 1);
      expect(theme.id).toBe(`th-${String(index + 1).padStart(3, '0')}`);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.group.length).toBeGreaterThan(0);
      expect(theme.skills.length).toBeGreaterThan(0);
      expect(theme.questionTypes.length).toBeGreaterThan(0);
      expect(theme.keywords.length).toBeGreaterThanOrEqual(3);
      expect(theme.prompts).toHaveLength(3);
      theme.prompts.forEach((prompt) => {
        expect(prompt.length).toBeGreaterThan(10);
      });
    });
  });

  it('exposes metadata describing provenance and license', () => {
    expect(THEME_META.themes).toBe(50);
    expect(THEME_META.categories).toBe(THEME_CATEGORIES.length);
    expect(THEME_META.skills).toBe(THEME_SKILLS.length);
    expect(THEME_META.license).toBe('CC BY 4.0');
    expect(THEME_META.sourceUrl).toContain('UPGRADE-YOUR-IELTS-SKILLS');
  });

  it('looks up a theme by id (case-insensitive)', () => {
    const theme = findTheme('th-001');
    expect(theme).toBeDefined();
    expect(theme?.name).toBe('Higher education vs vocational training');
    expect(theme?.rank).toBe(1);

    const themeUpper = findTheme('TH-001');
    expect(themeUpper).toEqual(theme);

    expect(findTheme('th-999')).toBeUndefined();
  });

  it('searches themes with query, category, skill, and question type filters', () => {
    const all = searchThemes({ limit: 100, offset: 0 });
    expect(all.total).toBe(50);
    expect(all.items).toHaveLength(50);

    const education = searchThemes({ limit: 10, offset: 0, category: 'education' });
    expect(education.total).toBeGreaterThan(0);
    education.items.forEach((theme) => expect(theme.category).toBe('education'));

    const writing = searchThemes({ limit: 10, offset: 0, skill: 'writing' });
    expect(writing.total).toBeGreaterThan(0);
    writing.items.forEach((theme) => expect(theme.skills).toContain('writing'));

    const listening = searchThemes({ limit: 10, offset: 0, skill: 'listening' });
    expect(listening.total).toBeGreaterThan(0);
    expect(listening.total).toBeLessThan(50);
    listening.items.forEach((theme) => expect(theme.skills).toContain('listening'));

    const problemSolution = searchThemes({ limit: 10, offset: 0, questionType: 'problem-solution' });
    expect(problemSolution.total).toBeGreaterThan(0);
    problemSolution.items.forEach((theme) => expect(theme.questionTypes).toContain('problem-solution'));

    const keywordSearch = searchThemes({ limit: 10, offset: 0, query: 'university' });
    expect(keywordSearch.total).toBeGreaterThan(0);
    expect(keywordSearch.items[0]?.name).toBe('Higher education vs vocational training');

    const noMatch = searchThemes({ limit: 10, offset: 0, query: 'nonexistent-query-xyz' });
    expect(noMatch.total).toBe(0);
    expect(noMatch.items).toHaveLength(0);
  });

  it('returns deterministic random samples for a given seed', () => {
    const sampleA = randomThemes('seed-123', 3);
    const sampleB = randomThemes('seed-123', 3);
    expect(sampleA).toHaveLength(3);
    expect(sampleA).toEqual(sampleB);

    const sampleC = randomThemes('different-seed', 3);
    expect(sampleC).toHaveLength(3);
  });

  it('computes aggregate statistics across themes, categories, and skills', () => {
    const stats = themeStats();
    expect(stats.themes).toBe(50);
    expect(stats.categories).toBe(THEME_CATEGORIES.length);
    expect(stats.totalPrompts).toBe(150);
    expect(stats.meanPrompts).toBe(3);
    expect(stats.bySkill.writing).toBeGreaterThan(0);
    expect(stats.byCategory.education).toBeGreaterThan(0);
  });
});
