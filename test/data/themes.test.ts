import { describe, expect, it } from 'vitest';

import { EXAM_THEMES, THEME_GROUPS, findThemes } from '../../src/data/themes.js';

describe('the exam theme bank', () => {
  it('publishes fifty themes in eleven groups', () => {
    expect(EXAM_THEMES).toHaveLength(50);
    expect(THEME_GROUPS).toHaveLength(11);
    expect(new Set(EXAM_THEMES.map((theme) => theme.id)).size).toBe(50);
    expect(new Set(EXAM_THEMES.map((theme) => theme.name)).size).toBe(50);
  });

  it('describes every theme consistently', () => {
    for (const theme of EXAM_THEMES) {
      expect(theme.id).toMatch(/^th-\d{2}$/);
      expect(THEME_GROUPS).toContain(theme.group);
      expect(theme.keywords).toHaveLength(5);
      expect(theme.skills.length).toBeGreaterThanOrEqual(2);
      for (const skill of theme.skills) {
        expect(['listening', 'reading', 'writing', 'speaking']).toContain(skill);
      }
    }
  });
});

describe('findThemes', () => {
  it('returns everything without a filter', () => {
    expect(findThemes()).toHaveLength(50);
  });

  it('filters by group, skill and free text', () => {
    const group = findThemes({ group: 'environment' });
    expect(group.length).toBeGreaterThan(3);
    expect(group.every((theme) => theme.group === 'environment')).toBe(true);

    const listening = findThemes({ skill: 'listening' });
    expect(listening.every((theme) => theme.skills.includes('listening'))).toBe(true);
    expect(listening.length).toBeLessThan(50);

    const search = findThemes({ query: 'carbon' });
    expect(search).toHaveLength(1);
    expect(search[0]!.name).toContain('Climate');
    expect(findThemes({ query: 'zzzz' })).toHaveLength(0);
  });

  it('combines filters', () => {
    const combined = findThemes({ group: 'technology', skill: 'writing', query: 'privacy' });
    expect(combined).toHaveLength(1);
    expect(combined[0]!.id).toBe('th-12');
  });
});
