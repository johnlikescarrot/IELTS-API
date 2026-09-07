import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';
import { findWord } from '../../src/data/vocabulary.js';
import { primarySenseText } from '../../src/lib/quiz.js';

import type { TestServer } from '../helpers/server.js';
import type { StudyPlan, VocabularyEntry } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/study/plan', () => {
  it('builds an eight-week plan with every default applied', async () => {
    const response = await server.json<StudyPlan>('/v1/study/plan?target=7');
    expect(response.status).toBe(200);
    expect(response.data.inputs).toEqual({
      target: 7,
      weeks: 8,
      hoursPerWeek: 10,
      wordsPerDay: 10,
      providedComponents: [],
      defaultedComponents: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(response.data.current.components).toEqual({
      listening: 5.5,
      reading: 5.5,
      writing: 5.5,
      speaking: 5.5,
    });
    expect(response.data.weekly).toHaveLength(8);
    expect(response.data.vocabulary.headwordsAvailable).toBe(4174);
    expect(response.meta.method).toContain('Gaps are weighted');
  });

  it('echoes supplied components and applies defaults only to the rest', async () => {
    const response = await server.json<StudyPlan>(
      '/v1/study/plan?target=7&listening=6&reading=6.5&weeks=12&hoursPerWeek=14&wordsPerDay=20',
    );
    expect(response.data.inputs.providedComponents).toEqual(['listening', 'reading']);
    expect(response.data.inputs.defaultedComponents).toEqual(['writing', 'speaking']);
    expect(response.data.current.components.writing).toBe(5.5);
    expect(response.data.current.components.listening).toBe(6);
    expect(response.data.weekly).toHaveLength(12);
    expect(response.data.vocabulary.wordsPerWeek).toBe(140);
  });

  it('is deterministic for identical queries', async () => {
    const first = await server.json('/v1/study/plan?target=6.5&weeks=6');
    const second = await server.json('/v1/study/plan?target=6.5&weeks=6');
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('requires the target parameter', async () => {
    const response = await server.json('/v1/study/plan');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('target');
  });

  it('rejects targets below the planning floor', async () => {
    const response = await server.json('/v1/study/plan?target=3.5');
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string>; message: string };
    expect(error.details.min).toBe('4');
    expect(error.message).toContain('at least 4');
  });

  it('rejects non-band targets and components', async () => {
    const badTarget = await server.json('/v1/study/plan?target=7.25');
    expect(badTarget.status).toBe(400);

    const badComponent = await server.json('/v1/study/plan?target=7&speaking=12');
    expect(badComponent.status).toBe(400);
    expect((badComponent.meta.error as { details: Record<string, string> }).details.parameter).toBe(
      'speaking',
    );
  });

  it('validates the time budget', async () => {
    const zeroWeeks = await server.json('/v1/study/plan?target=7&weeks=0');
    expect(zeroWeeks.status).toBe(400);

    const longWeeks = await server.json('/v1/study/plan?target=7&weeks=53');
    expect(longWeeks.status).toBe(400);

    const heavyHours = await server.json('/v1/study/plan?target=7&hoursPerWeek=80.5');
    expect(heavyHours.status).toBe(400);

    const lowHours = await server.json('/v1/study/plan?target=7&hoursPerWeek=0.5');
    expect(lowHours.status).toBe(400);
  });
});

describe('GET /v1/study/retention', () => {
  it('evaluates the forgetting curve with the default stability', async () => {
    const response = await server.json<{
      formula: string;
      days: number;
      stabilityDays: number;
      retention: number;
      halfLifeDays: number;
      target: null;
    }>('/v1/study/retention');
    expect(response.status).toBe(200);
    expect(response.data.formula).toBe('R = exp(-days / stabilityDays)');
    expect(response.data.days).toBe(1);
    expect(response.data.stabilityDays).toBe(1);
    expect(response.data.retention).toBe(0.3679);
    expect(response.data.halfLifeDays).toBe(0.69);
    expect(response.data.target).toBeNull();
    expect(response.meta.method).toContain('Ebbinghaus');
  });

  it('accepts an explicit elapsed time and stability', async () => {
    const response = await server.json<{ retention: number; days: number }>(
      '/v1/study/retention?days=7&stability=7',
    );
    expect(response.data.days).toBe(7);
    expect(response.data.retention).toBe(0.3679);

    const immediate = await server.json<{ retention: number; target: null }>('/v1/study/retention?days=0');
    expect(immediate.data.retention).toBe(1);
    expect(immediate.data.target).toBeNull();
  });

  it('inverts the curve towards a target retention', async () => {
    const response = await server.json<{
      target: {
        retention: number;
        daysUntil: number;
        lastWholeDay: number;
        retentionAtLastWholeDay: number;
      };
    }>('/v1/study/retention?stability=7&target=0.5');
    expect(response.data.target).toEqual({
      retention: 0.5,
      daysUntil: 4.85,
      lastWholeDay: 4,
      retentionAtLastWholeDay: 0.5647,
    });
  });

  it('is deterministic', async () => {
    const first = await server.json('/v1/study/retention?days=10&stability=3.5&target=0.6');
    const second = await server.json('/v1/study/retention?days=10&stability=3.5&target=0.6');
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('validates its parameters', async () => {
    const cases = [
      '/v1/study/retention?days=-1',
      '/v1/study/retention?days=3651',
      '/v1/study/retention?days=1.5',
      '/v1/study/retention?stability=0',
      '/v1/study/retention?stability=400',
      '/v1/study/retention?stability=abc',
      '/v1/study/retention?target=1',
      '/v1/study/retention?target=0.04',
      '/v1/study/retention?days=2&days=3',
    ];
    for (const path of cases) {
      const response = await server.json(path);
      expect(response.status).toBe(400);
    }
  });
});

describe('GET /v1/study/review', () => {
  it('builds a seven-day calendar over the whole headword list by default', async () => {
    const response = await server.json<{
      window: { from: string; days: number; newPerDay: number };
      scope: { headwords: number; onePassDays: number };
      schedule: { reviewDays: number[]; stabilityDays: number; stabilityGrowth: number };
      days: {
        date: string;
        index: number;
        new: unknown[];
        reviews: { word: string; reviewDay: number; gapDays: number; retention: number }[];
        counts: { new: number; reviews: number };
      }[];
      totals: { newWords: number; reviews: number };
    }>('/v1/study/review?date=2026-09-07');
    expect(response.status).toBe(200);
    expect(response.data.window).toEqual({ from: '2026-09-07', days: 7, newPerDay: 10 });
    expect(response.data.scope).toEqual({ headwords: 4174, onePassDays: 418 });
    expect(response.data.schedule.reviewDays).toEqual([1, 2, 4, 7, 15, 30]);
    expect(response.data.schedule.stabilityDays).toBe(1);
    expect(response.data.schedule.stabilityGrowth).toBe(2);
    expect(response.data.days).toHaveLength(7);
    expect(response.data.days[0]).toMatchObject({
      date: '2026-09-07',
      index: 0,
      counts: { new: 10, reviews: 0 },
    });
    expect(response.data.days[1]?.counts.reviews).toBe(10);
    expect(response.data.days[1]?.reviews?.[0]).toMatchObject({
      reviewDay: 1,
      gapDays: 1,
      retention: 0.3679,
    });
    expect(response.data.days[4]?.counts.reviews).toBe(30);
    expect(response.data.days[5]?.counts.reviews).toBe(30);
    expect(response.data.days[6]?.counts.reviews).toBe(30);
    expect(response.data.totals).toEqual({ newWords: 70, reviews: 140 });
  });

  it('respects a custom ladder, stability and growth', async () => {
    const response = await server.json<{
      days: {
        date: string;
        new: { id: string; word: string }[];
        reviews: { word: string; reviewDay: number; retention: number }[];
      }[];
    }>(
      '/v1/study/review?date=2026-09-07&days=5&newPerDay=2&order=recurrence&reviewDays=1,3&stability=2&growth=3',
    );
    expect(response.data.days[0]?.new.map((word) => word.word)).toEqual(['abnormal', 'absorb']);
    expect(response.data.days[3]?.new.map((word) => word.word)).toEqual(['admission', 'adversity']);
    // Day 3 reviews: day-2 words at gap 1 and day-0 words at gap 3 (stability 2*3).
    expect(response.data.days[3]?.reviews.map((review) => review.word)).toEqual([
      'acoustic',
      'adapt',
      'abnormal',
      'absorb',
    ]);
    expect(response.data.days[3]?.reviews.every((review) => review.retention === 0.6065)).toBe(true);
    expect(response.data.days[1]?.reviews.every((review) => review.reviewDay === 1)).toBe(true);
  });

  it('is deterministic for identical queries', async () => {
    const path = '/v1/study/review?date=2026-09-07&days=14&newPerDay=5&order=length';
    const first = await server.json(path);
    const second = await server.json(path);
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('filters the scope by volume and part of speech', async () => {
    const response = await server.json<{ scope: { headwords: number } }>(
      '/v1/study/review?date=2026-09-07&pos=adverb',
    );
    expect(response.data.scope.headwords).toBe(53);

    const filtered = await server.json<{ days: { new: { word: string }[] }[] }>(
      '/v1/study/review?date=2026-09-07&volume=22&pos=adverb&newPerDay=50',
    );
    expect(filtered.data.days[0]?.new).toHaveLength(11);
  });

  it('notes an empty or saturated scope instead of failing', async () => {
    const empty = await server.json<{ scope: { headwords: number } }>(
      '/v1/study/review?date=2026-09-07&pos=pronoun',
    );
    expect(empty.status).toBe(200);
    expect(empty.data.scope.headwords).toBe(0);
    expect((empty.meta.notes as string[])[0]).toContain('No vocabulary entries');

    const saturated = await server.json<{ scope: { headwords: number } }>(
      '/v1/study/review?date=2026-09-07&volume=3&pos=noun&newPerDay=50',
    );
    expect(saturated.data.scope.headwords).toBe(6);
    expect((saturated.meta.notes as string[])[0]).toContain('smaller than newPerDay');
  });

  it('validates the review ladder', async () => {
    const cases = [
      '/v1/study/review?reviewDays=1,2,2',
      '/v1/study/review?reviewDays=2,1',
      '/v1/study/review?reviewDays=0,1',
      '/v1/study/review?reviewDays=366',
      '/v1/study/review?reviewDays=1,x',
      '/v1/study/review?reviewDays=,',
      '/v1/study/review?reviewDays=1,2,3,4,5,6,7,8,9,10,11,12,13',
    ];
    for (const path of cases) {
      const response = await server.json(path);
      expect(response.status).toBe(400);
      expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe(
        'reviewDays',
      );
    }
  });

  it('validates the remaining parameters', async () => {
    const cases = [
      '/v1/study/review?days=0',
      '/v1/study/review?days=91',
      '/v1/study/review?newPerDay=0',
      '/v1/study/review?newPerDay=51',
      '/v1/study/review?order=random',
      '/v1/study/review?stability=0.04',
      '/v1/study/review?growth=5.5',
      '/v1/study/review?date=2026-13-01',
      '/v1/study/review?volume=23',
      '/v1/study/review?pos=verb,noun,zzz',
    ];
    for (const path of cases) {
      const response = await server.json(path);
      expect(response.status).toBe(400);
    }
  });
});

describe('GET /v1/study/quiz', () => {
  it('builds a deterministic practice set with answer keys', async () => {
    const response = await server.json<{
      date: string;
      count: number;
      items: { id: string; word: string; pos: string; prompt: string; options: string[]; answer: number }[];
      optionsPerItem: number;
      reduced: boolean;
    }>('/v1/study/quiz?date=2026-09-07');
    expect(response.status).toBe(200);
    expect(response.data.date).toBe('2026-09-07');
    expect(response.data.items).toHaveLength(5);
    expect(response.data.optionsPerItem).toBe(4);
    expect(response.data.reduced).toBe(false);
    for (const item of response.data.items) {
      expect(item.options).toHaveLength(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(4);
      expect(item.prompt).toContain(`"${item.word}"`);
      expect(new Set(item.options.map((text) => text.toLowerCase())).size).toBe(4);
    }
  });

  it('keeps the correct definition in the answer position', async () => {
    const response = await server.json<{ items: { word: string; options: string[]; answer: number }[] }>(
      '/v1/study/quiz?date=2026-09-08&count=8',
    );
    for (const item of response.data.items) {
      const entry = findWord(item.word);
      expect(entry).toBeDefined();
      expect(item.options[item.answer]).toBe(primarySenseText(entry as VocabularyEntry));
    }
  });

  it('is deterministic for identical queries', async () => {
    const path = '/v1/study/quiz?date=2026-09-07&count=10&volume=10,11,12&pos=noun';
    const first = await server.json(path);
    const second = await server.json(path);
    expect(JSON.stringify(second.data)).toBe(JSON.stringify(first.data));
  });

  it('filters by volume and part of speech', async () => {
    const response = await server.json<{
      items: { word: string; pos: string }[];
      scope: { headwords: number };
    }>('/v1/study/quiz?date=2026-09-07&volume=22&pos=adverb&count=20');
    expect(response.data.items).toHaveLength(11);
    expect(response.data.items.every((item) => item.pos === 'adverb')).toBe(true);
    expect(response.data.scope.headwords).toBe(11);
  });

  it('notes scopes that are empty or smaller than the request', async () => {
    const empty = await server.json<{ items: unknown[] }>('/v1/study/quiz?date=2026-09-07&pos=pronoun');
    expect(empty.status).toBe(200);
    expect(empty.data.items).toEqual([]);
    expect((empty.meta.notes as string[])[0]).toContain('No vocabulary entries');

    const small = await server.json<{ items: unknown[]; count: number }>(
      '/v1/study/quiz?date=2026-09-07&volume=3&pos=noun&count=20',
    );
    expect(small.data.items).toHaveLength(6);
    expect((small.meta.notes as string[])[0]).toContain('6 items were generated');

    const single = await server.json<{ items: unknown[] }>(
      '/v1/study/quiz?date=2026-09-07&volume=22&pos=verb&count=20',
    );
    expect(single.data.items).toHaveLength(1);
    expect((single.meta.notes as string[])[0]).toContain('1 item was generated');
  });

  it('validates its parameters', async () => {
    const cases = [
      '/v1/study/quiz?count=0',
      '/v1/study/quiz?count=21',
      '/v1/study/quiz?count=abc',
      '/v1/study/quiz?date=2026-02-30',
      '/v1/study/quiz?volume=0',
      '/v1/study/quiz?pos=noun,adverb,banana',
    ];
    for (const path of cases) {
      const response = await server.json(path);
      expect(response.status).toBe(400);
    }
  });
});
