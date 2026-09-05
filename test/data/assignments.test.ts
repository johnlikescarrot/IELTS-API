import { describe, expect, it } from 'vitest';

import {
  assignmentFacets,
  assignmentItems,
  assignmentMeta,
  assignmentStats,
  searchAssignments,
} from '../../src/data/assignments.js';

const page = (overrides: Partial<Parameters<typeof searchAssignments>[0]> = {}) =>
  searchAssignments({ limit: 10, offset: 0, ...overrides });

describe('the assignment index', () => {
  it('documents its provenance, pseudonymisation and limitations', () => {
    const meta = assignmentMeta();
    expect(meta.repository).toBe('https://github.com/msneloy/IELTS');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(meta.license).toContain('upstream repository');
    expect(meta.note).toContain('is redistributed');
    expect(meta.note).toContain('pseudonymised');
    expect(meta.attribution).toContain('msneloy/IELTS');
  });

  it('reports statistics for the whole archive', () => {
    const stats = assignmentStats();
    expect(stats.documents).toBe(26);
    expect(stats.submissions).toBe(24);
    expect(stats.instructorDocuments).toBe(2);
    expect(stats.documents).toBe(stats.submissions + stats.instructorDocuments);
    expect(stats.byTask.task1).toBe(20);
    expect(stats.byTask.task2).toBe(4);
    expect(stats.byGenre.essay).toBe(4);
    expect(stats.byGenre.map).toBe(3);
    expect(stats.byGenre['grammar-exercise']).toBe(1);
    expect(Object.keys(stats.byLearner)).toContain('learner-1');
    expect(Object.keys(stats.byLearner)).toContain('unattributed');
    expect(stats.firstDate).toBe('2022-08-11');
    expect(stats.lastDate).toBe('2022-08-27');
    expect(stats.totalWords).toBeGreaterThan(7_000);
    expect(stats.meanReadingEase).toBeGreaterThan(40);
    expect(stats.meanReadingEase).toBeLessThan(80);
  });

  it('indexes only metadata with unique identifiers and full provenance', () => {
    const items = assignmentItems();
    expect(items.length).toBe(assignmentStats().documents);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    for (const item of items) {
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['submission', 'instructor']).toContain(item.kind);
      expect(item.upstream.path.startsWith('Assignments/')).toBe(true);
      expect(item.upstream.path).not.toBe('');
      expect(item.upstream.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(item.upstream.url).toContain('github.com/msneloy/IELTS/blob/main/');
      expect(item.stats.words).toBeGreaterThan(0);
      expect(item.stats.typeTokenRatio).toBeGreaterThan(0);
      expect(item.stats.fleschReadingEase).toBeLessThan(120);
    }
  });

  it('never redistributes text: the index carries numbers and paths only', () => {
    for (const item of assignmentItems()) {
      const serialised = JSON.stringify(item).toLowerCase();
      expect(serialised).not.toContain('however, the expenses');
      expect(Object.keys(item)).toEqual([
        'id',
        'date',
        'kind',
        'task',
        'genre',
        'learner',
        'title',
        'stats',
        'upstream',
      ]);
    }
  });

  it('exposes sorted facet values', () => {
    expect(assignmentFacets('kind')).toEqual(['instructor', 'submission']);
    expect(assignmentFacets('learner')).toEqual([
      'instructor',
      'learner-1',
      'learner-2',
      'learner-3',
      'learner-4',
      'unattributed',
    ]);
    expect(assignmentFacets('task')).toEqual(['task1', 'task2']);
    expect(assignmentFacets('genre')).toContain('natural-process');
  });
});

describe('searchAssignments', () => {
  it('paginates in date order by default', () => {
    const first = page({ limit: 5 });
    expect(first.total).toBe(26);
    expect(first.items).toHaveLength(5);
    expect(first.hasMore).toBe(true);
    expect(first.items[0]!.id).toBe('a-2022-08-05-solution');
    const dates = first.items.map((item) => item.date);
    expect([...dates].sort()).toEqual(dates);

    const second = page({ limit: 5, offset: 5 });
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
  });

  it('filters by task, genre, learner and kind', () => {
    const essays = page({ limit: 100, tasks: ['task2'] });
    expect(essays.total).toBe(5); // four essays plus the dated Task 2 prompt list
    expect(essays.items.every((item) => item.task === 'task2')).toBe(true);

    const maps = page({ limit: 100, genres: ['map'] });
    expect(maps.total).toBe(3);
    expect(maps.items.every((item) => item.genre === 'map')).toBe(true);

    const learner1 = page({ limit: 100, learners: ['learner-1'] });
    expect(learner1.total).toBe(assignmentStats().byLearner['learner-1']);
    expect(learner1.items.every((item) => item.learner === 'learner-1')).toBe(true);

    const instructor = page({ limit: 100, kinds: ['instructor'] });
    expect(instructor.total).toBe(2);
    expect(instructor.items.every((item) => item.kind === 'instructor')).toBe(true);
  });

  it('keeps instructor documents without a task out of task filters', () => {
    const task1 = page({ limit: 100, tasks: ['task1'] });
    expect(task1.items.every((item) => item.task === 'task1')).toBe(true);
    expect(task1.items.some((item) => item.kind === 'instructor')).toBe(false);
  });

  it('filters by inclusive date range', () => {
    const window = page({ limit: 100, from: '2022-08-15', to: '2022-08-19' });
    expect(window.total).toBe(11);
    for (const item of window.items) {
      expect(item.date >= '2022-08-15').toBe(true);
      expect(item.date <= '2022-08-19').toBe(true);
    }

    const fromOnly = page({ limit: 100, from: '2022-08-27' });
    expect(fromOnly.total).toBe(5); // four Task 2 essays plus the dated prompt list

    const toOnly = page({ limit: 100, to: '2022-08-12' });
    expect(toOnly.total).toBe(7); // includes the 2022-08-05 instructor solution
  });

  it('searches free text over title, identifier, path and genre', () => {
    const hits = page({ limit: 100, query: 'pie' });
    expect(hits.total).toBeGreaterThan(0);
    expect(hits.items.every((item) => JSON.stringify(item).toLowerCase().includes('pie'))).toBe(true);

    const path = page({ limit: 100, query: '22.08.21' });
    expect(path.total).toBe(3);
  });

  it('sorts by every published key', () => {
    const words = page({ limit: 3, sort: 'words', order: 'desc' });
    expect(words.items[0]!.stats.words).toBeGreaterThanOrEqual(words.items[1]!.stats.words);
    expect(words.items[0]!.id).toBe('a-2022-08-27-riad-essay');

    const readingEase = page({ limit: 2, sort: 'readingEase', order: 'desc' });
    expect(readingEase.items[0]!.stats.fleschReadingEase).toBeGreaterThanOrEqual(
      readingEase.items[1]!.stats.fleschReadingEase,
    );

    const byGenre = page({ limit: 100, sort: 'genre' });
    const genres = byGenre.items.map((item) => item.genre);
    expect([...genres].sort()).toEqual(genres);

    const byLearner = page({ limit: 100, sort: 'learner' });
    const learners = byLearner.items.map((item) => item.learner);
    expect([...learners].sort()).toEqual(learners);
  });
});
