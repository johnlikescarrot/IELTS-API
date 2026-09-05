import { describe, expect, it } from 'vitest';

import {
  READING_LEVELS,
  READING_QUESTION_TYPES,
  findReadingItem,
  randomReadingItems,
  reading,
  readingItems,
  readingMeta,
  readingStats,
  readingTopics,
  searchReading,
} from '../../src/data/reading.js';

const page = (overrides: Partial<Parameters<typeof searchReading>[0]> = {}) =>
  searchReading({ limit: 10, offset: 0, ...overrides });

describe('the reading item bank', () => {
  it('documents its provenance and its original authorship', () => {
    const meta = readingMeta();
    expect(meta.name).toContain('Reading');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.attribution).toContain('original');
    expect(meta.inspiredBy).toContain('github.com');
    expect(meta.levels).toEqual(['A1-A2', 'B1-B2', 'C1-C2']);
    expect(meta.questionTypes.length).toBeGreaterThan(5);
  });

  it('holds one item per stable identifier with a passage and questions', () => {
    const items = readingItems();
    expect(items.length).toBeGreaterThan(8);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) {
      expect(item.passage.length).toBeGreaterThan(80);
      expect(item.wordCount).toBeGreaterThan(0);
      expect(READING_LEVELS).toContain(item.level);
      expect(item.questions.length).toBeGreaterThan(0);
      for (const question of item.questions) {
        expect(READING_QUESTION_TYPES).toContain(question.type);
        expect(question.answer.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(Object.keys(question.options).length).toBeGreaterThan(0);
      }
    }
  });

  it('reports statistics that reconcile with the items', () => {
    const stats = readingStats();
    expect(stats.items).toBe(readingItems().length);
    const questionSum = readingItems().reduce((total, item) => total + item.questions.length, 0);
    expect(stats.questions).toBe(questionSum);
    const levelSum = Object.values(stats.byLevel).reduce((total, count) => total + count, 0);
    expect(levelSum).toBe(stats.items);
  });

  it('lists distinct topics and levels', () => {
    expect(READING_LEVELS).toEqual(['A1-A2', 'B1-B2', 'C1-C2']);
    expect(readingTopics().length).toBeGreaterThan(3);
    expect([...readingTopics()]).toEqual([...readingTopics()].sort());
  });
});

describe('searchReading', () => {
  it('paginates without filters', () => {
    const result = page({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(readingItems().length);
    expect(result.hasMore).toBe(true);
  });

  it('honours the offset', () => {
    expect(page({ limit: 2, offset: 3 }).items.map((item) => item.id)).toEqual(
      page({ limit: 5 })
        .items.slice(3, 5)
        .map((item) => item.id),
    );
  });

  it('searches free text across title, topic, passage and questions', () => {
    const byTitle = page({ query: 'wetlands', limit: 5 });
    expect(byTitle.total).toBeGreaterThan(0);
    const byQuestion = page({ query: 'Seventeenth', limit: 5 });
    expect(byQuestion.total).toBeGreaterThan(0);
  });

  it('filters by CEFR level', () => {
    const result = page({ levels: ['C1-C2'], limit: 50 });
    expect(result.items.every((item) => item.level === 'C1-C2')).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by topic', () => {
    const topic = readingTopics()[0] as string;
    const result = page({ topics: [topic], limit: 50 });
    expect(result.items.every((item) => item.topic === topic)).toBe(true);
  });

  it('filters to items that contain every requested question type', () => {
    const result = page({ questionTypes: ['multiple-choice', 'true-false-not-given'], limit: 50 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      const types = item.questions.map((question) => question.type);
      expect(types).toContain('multiple-choice');
      expect(types).toContain('true-false-not-given');
    }
  });

  it('sorts by level, title, topic and word count', () => {
    const byLevel = page({ sort: 'level', limit: 50 });
    const order = READING_LEVELS;
    const positions = byLevel.items.map((item) => order.indexOf(item.level));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    const byWords = page({ sort: 'wordCount', order: 'desc', limit: 3 });
    expect(byWords.items[0]!.wordCount).toBeGreaterThanOrEqual(byWords.items[2]!.wordCount);

    const byTitle = page({ sort: 'title', limit: 3 });
    expect(byTitle.items.map((item) => item.title)).toEqual(
      [...byTitle.items.map((item) => item.title)].sort((a, b) => a.localeCompare(b)),
    );

    const byTopic = page({ sort: 'topic', limit: 50 });
    const topics = byTopic.items.map((item) => item.topic);
    expect(topics).toEqual([...topics].sort());
  });

  it('returns an empty page when nothing matches', () => {
    const result = page({ query: 'zzzzznotareadingword' });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

describe('findReadingItem', () => {
  it('returns the matching item', () => {
    const item = findReadingItem('r_a1_001');
    expect(item?.id).toBe('r_a1_001');
    expect(item?.title.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown ids', () => {
    expect(findReadingItem('nope')).toBeUndefined();
  });
});

describe('randomReadingItems', () => {
  it('is deterministic for a seed', () => {
    expect(randomReadingItems('2026-09-05', 3)).toEqual(randomReadingItems('2026-09-05', 3));
  });

  it('returns distinct items in the requested amount', () => {
    const items = randomReadingItems('reading', 4);
    expect(items).toHaveLength(4);
    expect(new Set(items.map((item) => item.id)).size).toBe(4);
  });

  it('changes with the seed', () => {
    expect(randomReadingItems('a', 5)).not.toEqual(randomReadingItems('b', 5));
  });

  it('restricts the pool by level', () => {
    const items = randomReadingItems('reading', 50, 'A1-A2');
    expect(items.every((item) => item.level === 'A1-A2')).toBe(true);
  });

  it('returns an empty list for a level with no items', () => {
    expect(randomReadingItems('reading', 3, 'C1-C2')).toHaveLength(3);
  });
});

describe('reading()', () => {
  it('loads the dataset from disk', () => {
    expect(reading().items.length).toBeGreaterThan(0);
  });
});
