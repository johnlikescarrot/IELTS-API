import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { PracticeItem, PracticeItemType, PracticeStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/practice', () => {
  it('returns provenance, series, statistics and facets', async () => {
    const response = await server.json<{
      meta: { repository: string };
      series: { id: string; name: string }[];
      stats: PracticeStats;
    }>('/v1/practice');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    expect(response.data.series).toHaveLength(4);
    expect(response.data.series[0]!.name).toContain('Listening 102');
    expect(response.data.stats.items).toBe(1804);
    const facets = response.meta.facets as { series: string[]; level: string[]; type: string[] };
    expect(facets.series).toHaveLength(4);
    expect(facets.level).toContain('A1-A2');
    expect(facets.type).toContain('multiple_choice');
    expect(response.meta.note).toContain('redistributed');
  });
});

describe('GET /v1/practice/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<PracticeStats>('/v1/practice/stats');
    expect(response.data.questions.total).toBe(15558);
    expect(response.data.questions.bySeries['reading-1232']).toBe(7939);
    expect(response.data.wordsHistogram['250']).toBeGreaterThan(0);
  });
});

describe('GET /v1/practice/types', () => {
  it('returns the curated item-type taxonomy with occurrences', async () => {
    const response = await server.json<PracticeItemType[]>('/v1/practice/types');
    expect(response.data).toHaveLength(14);
    expect(response.meta.count).toBe(14);
    expect(response.meta.note).toContain('metadata');
    const multipleChoice = response.data.find((entry) => entry.id === 'multiple-choice');
    expect(multipleChoice!.occurrences).toBe(4116);
    expect(multipleChoice!.aliases).toContain('multiple_choice');
    const summary = response.data.find((entry) => entry.id === 'summary-completion');
    expect(summary!.skills).toEqual(['reading']);
  });
});

describe('GET /v1/practice/lessons', () => {
  it('paginates the index', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/lessons?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(1804);
    expect(response.meta.sort).toBe('id');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.query).toBeNull();
    expect(response.meta.note).toContain('not redistributed');
  });

  it('filters by series, level, type, skill and kind', async () => {
    const series = await server.json<PracticeItem[]>('/v1/practice/lessons?series=reading-1232&limit=100');
    expect(series.data.every((item) => item.series === 'reading-1232')).toBe(true);
    expect(series.meta.total).toBe(1232);
    expect(series.meta.series).toEqual(['reading-1232']);

    const level = await server.json<PracticeItem[]>('/v1/practice/lessons?level=a1-a2,Advanced&limit=100');
    expect(level.data.every((item) => ['A1-A2', 'Advanced'].includes(item.level ?? ''))).toBe(true);
    expect(level.meta.total).toBe(198 + 34);

    const type = await server.json<PracticeItem[]>('/v1/practice/lessons?type=matching_headings&limit=1');
    expect(type.meta.total).toBeGreaterThan(0);

    const skill = await server.json<PracticeItem[]>('/v1/practice/lessons?skill=listening&limit=1');
    expect(skill.meta.total).toBe(303);

    const kind = await server.json<PracticeItem[]>('/v1/practice/lessons?kind=full-test&limit=1');
    expect(kind.meta.total).toBe(470);
  });

  it('searches free text', async () => {
    const response = await server.json<PracticeItem[]>('/v1/practice/lessons?q=basic&limit=5');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.query).toBe('basic');
  });

  it('sorts by words and questions', async () => {
    const words = await server.json<PracticeItem[]>('/v1/practice/lessons?sort=words&order=desc&limit=2');
    expect((words.data[0]!.words ?? 0) >= (words.data[1]!.words ?? 0)).toBe(true);
    const questions = await server.json<PracticeItem[]>('/v1/practice/lessons?sort=questions&limit=2');
    expect((questions.data[0]!.questions ?? 0) <= (questions.data[1]!.questions ?? 0)).toBe(true);
    expect(questions.meta.sort).toBe('questions');
  });

  it('rejects unknown facet values and bad parameters', async () => {
    expect((await server.json('/v1/practice/lessons?series=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?level=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?type=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?kind=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?sort=nope')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?limit=0')).status).toBe(400);
    expect((await server.json('/v1/practice/lessons?offset=2001')).status).toBe(400);
  });
});

describe('GET /v1/practice/lessons/:id', () => {
  it('returns one item by stable identifier', async () => {
    const response = await server.json<PracticeItem>('/v1/practice/lessons/reading_a1_a2_001');
    expect(response.status).toBe(200);
    expect(response.data.series).toBe('reading-1232');
    expect(response.meta.id).toBe('reading_a1_a2_001');
    expect(response.meta.series).toBe('reading-1232');
  });

  it('matches the identifier case-insensitively', async () => {
    const response = await server.json<PracticeItem>('/v1/practice/lessons/LISTENING-204-TEST-1');
    expect(response.status).toBe(200);
    expect(response.data.kind).toBe('full-test');
  });

  it('404s for unknown identifiers', async () => {
    const response = await server.json('/v1/practice/lessons/reading_a1_a2_9999');
    expect(response.status).toBe(404);
    const error = response.meta.error as { code: string; details: Record<string, string> };
    expect(error.code).toBe('not_found');
    expect(error.details.hint).toContain('/v1/practice/lessons');
  });
});
