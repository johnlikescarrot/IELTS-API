import { describe, expect, it } from 'vitest';

import {
  READING_LEVELS,
  READING_PASSAGES,
  READING_TOPICS,
  findPassage,
  readingStats,
  searchReading,
} from '../../src/data/reading.js';

import type { ReadingQuery } from '../../src/data/reading.js';
import type { ReadingSummary } from '../../src/types.js';
import type { Page } from '../../src/lib/search.js';

const page = (overrides: Partial<ReadingQuery> = {}): Page<ReadingSummary> =>
  searchReading({ limit: 50, offset: 0, ...overrides });

describe('the graded reading dataset', () => {
  it('is internally consistent', () => {
    expect(READING_PASSAGES.length).toBeGreaterThanOrEqual(8);
    for (const passage of READING_PASSAGES) {
      expect(READING_LEVELS).toContain(passage.cefrLevel);
      expect(READING_TOPICS).toContain(passage.topic);
      expect(passage.summary.length).toBeGreaterThan(20);
      expect(passage.minutes).toBeGreaterThanOrEqual(5);
      expect(passage.questions).toHaveLength(3);
      const formats = passage.questions.map((question) => question.format);
      expect(formats).toContain('multiple-choice');
      expect(formats).toContain('true-false-notgiven');
      expect(formats).toContain('short-answer');
      for (const question of passage.questions) {
        expect(question.id.startsWith(`${passage.id}-`)).toBe(true);
        expect(question.prompt.length).toBeGreaterThan(10);
        expect(question.explanation.length).toBeGreaterThan(10);
        if (question.format === 'multiple-choice') {
          expect(question.options?.length).toBeGreaterThanOrEqual(4);
          expect(question.options).toContain(question.answer);
        } else if (question.format === 'true-false-notgiven') {
          expect(question.options).toBeUndefined();
          expect(['True', 'False', 'Not given']).toContain(question.answer);
        } else {
          expect(question.options).toBeUndefined();
        }
      }
    }
  });

  it('keeps unique identifiers', () => {
    const ids = READING_PASSAGES.map((passage) => passage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports aggregate statistics', () => {
    const stats = readingStats();
    expect(stats.passages).toBe(READING_PASSAGES.length);
    expect(stats.questions).toBe(READING_PASSAGES.length * 3);
    expect(stats.words).toBeGreaterThan(1500);
    expect(stats.byLevel['B2']).toBe(3);
    expect(stats.byLevel['A2']).toBe(2);
  });

  it('exposes collection summaries without the full text', () => {
    const result = page();
    expect(result.total).toBe(READING_PASSAGES.length);
    const first = result.items[0] as ReadingSummary;
    expect('text' in (first as object)).toBe(false);
    expect(first.wordCount).toBeGreaterThan(100);
    expect(first.questionCount).toBe(3);
  });

  it('filters by level, topic and free text', () => {
    expect(page({ level: 'B2' }).items.every((item) => item.cefrLevel === 'B2')).toBe(true);
    expect(page({ level: 'C2' }).total).toBe(0);
    const science = page({ topic: 'science' });
    expect(science.total).toBeGreaterThanOrEqual(2);
    const river = page({ query: 'river' });
    expect(river.total).toBeGreaterThan(0);
    expect(page({ query: 'zzz-no-such-thing' }).total).toBe(0);
  });

  it('orders passages by level, then identifier', () => {
    const keys = page().items.map((item) => `${READING_LEVELS.indexOf(item.cefrLevel)}:${item.id}`);
    expect([...keys]).toEqual([...keys].sort());
  });

  it('paginates', () => {
    const result = page({ limit: 4, offset: 4 });
    expect(result.items).toHaveLength(4);
    expect(result.offset).toBe(4);
    expect(result.hasMore).toBe(true);
  });

  it('finds one full passage, case- and whitespace-insensitively', () => {
    const target = READING_PASSAGES[0] as (typeof READING_PASSAGES)[number];
    const found = findPassage(`  ${target.id.toUpperCase()}  `);
    expect(found?.id).toBe(target.id);
    expect(found?.text.length).toBeGreaterThan(100);
    expect(findPassage('rd-nope')).toBeUndefined();
  });
});
