import { describe, expect, it } from 'vitest';

import {
  STUDY_SKILLS,
  searchStudyNotes,
  studyNoteFacets,
  studyNoteItems,
  studyNotesMeta,
  studyNotesStats,
} from '../../src/data/studyNotes.js';

const page = (overrides: Partial<Parameters<typeof searchStudyNotes>[0]> = {}) =>
  searchStudyNotes({ limit: 10, offset: 0, ...overrides });

describe('the study-notes index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = studyNotesMeta();
    expect(meta.repository).toBe('https://github.com/Oxidaner/ielts');
    expect(meta.note).toContain('not redistributed');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('reports statistics for the whole upstream repository', () => {
    const stats = studyNotesStats();
    expect(stats.filesInRepository).toBe(2385);
    expect(stats.indexedFiles).toBe(2353);
    expect(stats.coverageRatio).toBeCloseTo(0.9866, 3);
    expect(stats.excludedJunkFiles).toBe(31);
    expect(stats.excludedNonIeltsFiles).toBe(1);
    expect(stats.bySkill.reading).toBe(1593);
    expect(stats.bySkill.listening).toBe(722);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(10);
  });

  it('counts the speaking question bank shipped in the collection', () => {
    const bank = studyNotesStats().speakingBank;
    expect(bank.sourcePath).toBe('口语/神奇题库.md');
    expect(bank.season).toBe('2025-09..12');
    expect(bank.part1Topics).toBe(18);
    expect(bank.part1Questions).toBe(79);
    expect(bank.part2CueCards).toBe(22);
    expect(bank.part3FollowUpQuestions).toBe(121);
    expect(bank.questions).toBe(200);
  });

  it('indexes every item with stable identifiers and permalinks', () => {
    const items = studyNoteItems();
    expect(items).toHaveLength(2353);
    expect(items[0]?.id).toBe('n00001');
    expect(items.at(-1)?.id).toBe('n02353');
    for (const item of items) {
      expect(item.sourceUrl.startsWith('https://github.com/Oxidaner/ielts/blob/main/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.path.length).toBeGreaterThan(0);
    }
  });
});

describe('studyNoteFacets', () => {
  it('lists sorted, distinct values per facet', () => {
    for (const facet of ['skill', 'category', 'format'] as const) {
      const values = studyNoteFacets(facet);
      expect(values.length).toBeGreaterThan(1);
      expect([...values]).toEqual([...values].sort());
      expect(new Set(values).size).toBe(values.length);
    }
    expect(STUDY_SKILLS.every((skill) => studyNoteFacets('skill').includes(skill))).toBe(true);
  });
});

describe('searchStudyNotes', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(2353);
    expect(result.hasMore).toBe(true);
  });

  it('searches by free text across title and path', () => {
    const result = page({ query: 'writing', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(2353);
  });

  it('searches the Chinese skill folders', () => {
    const result = page({ query: '作文', limit: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.path.includes('作文'))).toBe(true);
  });

  it('filters by skill, category and format', () => {
    const skills = page({ skills: ['writing'], limit: 50 });
    expect(skills.items.every((item) => item.skill === 'writing')).toBe(true);
    const categories = page({ categories: ['question-bank'], limit: 50 });
    expect(categories.items.every((item) => item.category === 'question-bank')).toBe(true);
    expect(categories.total).toBe(3);
    const formats = page({ formats: ['xlsx'], limit: 50 });
    expect(formats.items.every((item) => item.format === 'xlsx')).toBe(true);
  });

  it('sorts by title, skill, category, path and size', () => {
    expect(page({ sort: 'title', limit: 5 }).items.map((item) => item.title.toLowerCase())).toEqual(
      [...page({ sort: 'title', limit: 5 }).items.map((item) => item.title.toLowerCase())].sort(),
    );
    expect(page({ sort: 'skill', limit: 3 }).items.map((item) => item.skill)).toEqual(
      [...page({ sort: 'skill', limit: 3 }).items.map((item) => item.skill)].sort(),
    );
    expect(page({ sort: 'category', limit: 3 }).items.map((item) => item.category)).toEqual(
      [...page({ sort: 'category', limit: 3 }).items.map((item) => item.category)].sort(),
    );
    expect(page({ sort: 'path', limit: 3 }).items.map((item) => item.path)).toEqual(
      [...page({ sort: 'path', limit: 3 }).items.map((item) => item.path)].sort(),
    );
    const bySize = page({ sort: 'size', order: 'desc', limit: 3 });
    expect(bySize.items[0]!.sizeBytes).toBeGreaterThanOrEqual(bySize.items[2]!.sizeBytes);
    expect(page({ sort: 'title', order: 'desc', limit: 3 }).items.length).toBe(3);
  });

  it('returns an empty page when nothing matches', () => {
    expect(page({ categories: ['not-a-category'] }).items).toEqual([]);
    expect(page({ formats: ['not-a-format'] }).items).toEqual([]);
  });
});
