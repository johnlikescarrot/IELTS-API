import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('meta routes', () => {
  it('serves a welcome payload at /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('IELTS-API');
    expect(res.body.auth).toBe('none');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

  it('serves health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/api/v1/vocabulary']).toBeDefined();
  });

  it('serves dataset counts', async () => {
    const res = await request(app).get('/api/v1/meta');
    expect(res.status).toBe(200);
    expect(res.body.counts.vocabulary).toBeGreaterThan(50);
    expect(res.body.counts.grammarRules).toBeGreaterThan(10);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope/not-here');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

describe('vocabulary', () => {
  it('lists entries with default pagination', async () => {
    const res = await request(app).get('/api/v1/vocabulary');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(50);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
    expect(res.body.items).toHaveLength(20);
  });

  it('supports search', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ search: 'sustainable' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].word).toBe('sustainable');
  });

  it('filters by level', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ level: 'C2', limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const item of res.body.items) expect(item.level).toBe('C2');
  });

  it('rejects an invalid level', async () => {
    const res = await request(app).get('/api/v1/vocabulary').query({ level: 'Z9' });
    expect(res.status).toBe(400);
  });

  it('filters by category and part of speech', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ category: 'health', pos: 'noun', limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.category).toBe('health');
      expect(item.partOfSpeech).toBe('noun');
    }
  });

  it('sorts by word', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ sort: 'word', limit: 100 });
    const words = res.body.items.map((i: { word: string }) => i.word);
    expect([...words].sort((a, b) => a.localeCompare(b))).toEqual(words);
  });

  it('sorts by level', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ sort: 'level', limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].level).toBe('B1');
  });

  it('ignores unknown sort values', async () => {
    const res = await request(app).get('/api/v1/vocabulary').query({ sort: 'bogus' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('supports limit and offset', async () => {
    const res = await request(app)
      .get('/api/v1/vocabulary')
      .query({ limit: 5, offset: 5 });
    expect(res.body.items).toHaveLength(5);
    expect(res.body.offset).toBe(5);
  });

  it('caps limit and falls back on bad values', async () => {
    const capped = await request(app).get('/api/v1/vocabulary').query({ limit: 5000 });
    expect(capped.body.limit).toBe(100);
    const fallback = await request(app).get('/api/v1/vocabulary').query({ limit: 'abc' });
    expect(fallback.body.limit).toBe(20);
    const zero = await request(app).get('/api/v1/vocabulary').query({ limit: 0 });
    expect(zero.body.limit).toBe(20);
    const negOffset = await request(app).get('/api/v1/vocabulary').query({ offset: -4 });
    expect(negOffset.body.offset).toBe(0);
  });

  it('serves random entries', async () => {
    const one = await request(app).get('/api/v1/vocabulary/random');
    expect(one.body.count).toBe(1);
    expect(one.body.items).toHaveLength(1);
    const three = await request(app).get('/api/v1/vocabulary/random').query({ count: 3 });
    expect(three.body.items).toHaveLength(3);
    const bad = await request(app)
      .get('/api/v1/vocabulary/random')
      .query({ count: 'lots' });
    expect(bad.body.items).toHaveLength(1);
  });

  it('serves an entry by id', async () => {
    const res = await request(app).get('/api/v1/vocabulary/v001');
    expect(res.status).toBe(200);
    expect(res.body.word).toBe('sustainable');
  });

  it('returns 404 for unknown vocabulary id', async () => {
    const res = await request(app).get('/api/v1/vocabulary/xxx');
    expect(res.status).toBe(404);
  });
});

describe('writing', () => {
  it('lists task 1 prompts and filters by category', async () => {
    const all = await request(app).get('/api/v1/writing/task1');
    expect(all.body.total).toBeGreaterThan(5);
    const maps = await request(app)
      .get('/api/v1/writing/task1')
      .query({ category: 'map' });
    expect(maps.body.total).toBe(1);
    const search = await request(app)
      .get('/api/v1/writing/task1')
      .query({ search: 'internet' });
    expect(search.body.total).toBe(1);
  });

  it('lists task 2 prompts', async () => {
    const res = await request(app)
      .get('/api/v1/writing/task2')
      .query({ category: 'opinion' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('lists samples and filters by task', async () => {
    const all = await request(app).get('/api/v1/writing/samples');
    expect(all.body.total).toBeGreaterThan(3);
    const t1 = await request(app).get('/api/v1/writing/samples').query({ task: 1 });
    expect(t1.body.total).toBe(2);
    for (const s of t1.body.items) expect(s.task).toBe(1);
    const search = await request(app)
      .get('/api/v1/writing/samples')
      .query({ search: 'tourism' });
    expect(search.body.total).toBe(1);
  });

  it('rejects an invalid sample task filter', async () => {
    const res = await request(app).get('/api/v1/writing/samples').query({ task: 3 });
    expect(res.status).toBe(400);
  });

  it('serves tips and common mistakes', async () => {
    const tips = await request(app).get('/api/v1/writing/tips');
    expect(tips.body.count).toBeGreaterThan(5);
    const mistakes = await request(app).get('/api/v1/writing/common-mistakes');
    expect(mistakes.body.total).toBeGreaterThan(5);
    const search = await request(app)
      .get('/api/v1/writing/common-mistakes')
      .query({ search: 'articles' });
    expect(search.body.total).toBe(1);
  });
});

describe('speaking', () => {
  it('lists part 1, 2 and 3 topics', async () => {
    const p1 = await request(app).get('/api/v1/speaking/part1');
    const p2 = await request(app).get('/api/v1/speaking/part2');
    const p3 = await request(app).get('/api/v1/speaking/part3');
    expect(p1.body.total).toBeGreaterThan(3);
    expect(p2.body.total).toBeGreaterThan(3);
    expect(p3.body.total).toBeGreaterThan(3);
  });

  it('supports topic search', async () => {
    const res = await request(app)
      .get('/api/v1/speaking/part1')
      .query({ search: 'music' });
    expect(res.body.total).toBe(1);
  });

  it('serves speaking tips', async () => {
    const res = await request(app).get('/api/v1/speaking/tips');
    expect(res.body.count).toBeGreaterThan(3);
  });
});

describe('reading and listening', () => {
  it('serves reading resources', async () => {
    const types = await request(app).get('/api/v1/reading/question-types');
    const tips = await request(app).get('/api/v1/reading/tips');
    const practice = await request(app).get('/api/v1/reading/practice');
    expect(types.body.count).toBeGreaterThan(5);
    expect(tips.body.count).toBeGreaterThan(3);
    expect(practice.body.count).toBeGreaterThan(1);
  });

  it('serves listening resources', async () => {
    const types = await request(app).get('/api/v1/listening/question-types');
    const tips = await request(app).get('/api/v1/listening/tips');
    const practice = await request(app).get('/api/v1/listening/practice');
    expect(types.body.count).toBeGreaterThan(3);
    expect(tips.body.count).toBeGreaterThan(3);
    expect(practice.body.count).toBeGreaterThan(1);
  });
});

describe('language', () => {
  it('lists grammar rules with search', async () => {
    const all = await request(app).get('/api/v1/grammar');
    expect(all.body.total).toBeGreaterThan(10);
    const search = await request(app).get('/api/v1/grammar').query({ search: 'passive' });
    expect(search.body.total).toBe(1);
  });

  it('serves a grammar rule by id', async () => {
    const res = await request(app).get('/api/v1/grammar/g-01');
    expect(res.status).toBe(200);
    expect(res.body.title).toContain('Articles');
  });

  it('returns 404 for unknown grammar id', async () => {
    const res = await request(app).get('/api/v1/grammar/g-99');
    expect(res.status).toBe(404);
  });

  it('lists collocations and filters by formality', async () => {
    const all = await request(app).get('/api/v1/collocations');
    expect(all.body.total).toBeGreaterThan(5);
    const formal = await request(app)
      .get('/api/v1/collocations')
      .query({ formality: 'formal' });
    for (const c of formal.body.items) expect(c.formality).toBe('formal');
    const search = await request(app)
      .get('/api/v1/collocations')
      .query({ search: 'deadline' });
    expect(search.body.total).toBe(1);
  });

  it('rejects an invalid formality', async () => {
    const res = await request(app)
      .get('/api/v1/collocations')
      .query({ formality: 'royal' });
    expect(res.status).toBe(400);
  });

  it('lists idioms and phrasal verbs', async () => {
    const idioms = await request(app).get('/api/v1/idioms');
    const phrasal = await request(app).get('/api/v1/phrasal-verbs');
    expect(idioms.body.total).toBeGreaterThan(5);
    expect(phrasal.body.total).toBeGreaterThan(5);
    const search = await request(app).get('/api/v1/idioms').query({ search: 'midnight' });
    expect(search.body.total).toBe(1);
    const psearch = await request(app)
      .get('/api/v1/phrasal-verbs')
      .query({ search: 'carry out' });
    expect(psearch.body.total).toBe(1);
  });
});

describe('resources', () => {
  it('lists curated external links', async () => {
    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(3);
    expect(res.body.items[0].url).toMatch(/^https:\/\//);
  });

  it('filters by category and supports search', async () => {
    const official = await request(app)
      .get('/api/v1/resources')
      .query({ category: 'official' });
    expect(official.body.total).toBeGreaterThan(0);
    for (const r of official.body.items) expect(r.category).toBe('official');
    const search = await request(app)
      .get('/api/v1/resources')
      .query({ search: 'community' });
    expect(search.body.total).toBe(1);
  });
});

describe('study plans', () => {
  it('lists plans and serves one by id', async () => {
    const all = await request(app).get('/api/v1/study-plans');
    expect(all.body.count).toBe(3);
    const one = await request(app).get('/api/v1/study-plans/plan-4-week');
    expect(one.status).toBe(200);
    expect(one.body.weeks).toBe(4);
  });

  it('returns 404 for unknown plan id', async () => {
    const res = await request(app).get('/api/v1/study-plans/plan-99-week');
    expect(res.status).toBe(404);
  });
});

describe('calculators', () => {
  it('computes the overall band', async () => {
    const res = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 7, reading: 7.5, writing: 6.5, speaking: 7 });
    expect(res.status).toBe(200);
    expect(res.body.mean).toBe(7);
    expect(res.body.overall).toBe(7);
  });

  it('applies IELTS rounding rules', async () => {
    const up = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 8, reading: 8, writing: 8, speaking: 7 });
    expect(up.body.overall).toBe(8);
    const half = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 6.5, reading: 6.5, writing: 6.5, speaking: 7 });
    expect(half.body.overall).toBe(6.5);
  });

  it('rejects missing, out-of-range and off-grid scores', async () => {
    const missing = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 7, reading: 7, writing: 7 });
    expect(missing.status).toBe(400);
    const range = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 7, reading: 7, writing: 7, speaking: 10 });
    expect(range.status).toBe(400);
    const grid = await request(app)
      .get('/api/v1/calculators/overall')
      .query({ listening: 7, reading: 7, writing: 7, speaking: 7.3 });
    expect(grid.status).toBe(400);
  });

  it('converts listening raw scores', async () => {
    const res = await request(app)
      .get('/api/v1/calculators/listening')
      .query({ raw: 30 });
    expect(res.body).toEqual({ raw: 30, band: 7 });
  });

  it('rejects bad listening raw scores', async () => {
    expect((await request(app).get('/api/v1/calculators/listening')).status).toBe(400);
    expect(
      (await request(app).get('/api/v1/calculators/listening').query({ raw: 41 })).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/v1/calculators/listening').query({ raw: 'x' }))
        .status,
    ).toBe(400);
  });

  it('converts reading raw scores for both test types', async () => {
    const academic = await request(app)
      .get('/api/v1/calculators/reading')
      .query({ raw: 30 });
    expect(academic.body).toEqual({ raw: 30, type: 'academic', band: 7 });
    const general = await request(app)
      .get('/api/v1/calculators/reading')
      .query({ raw: 30, type: 'general' });
    expect(general.body).toEqual({ raw: 30, type: 'general', band: 6 });
  });

  it('rejects bad reading inputs', async () => {
    expect(
      (await request(app).get('/api/v1/calculators/reading').query({ raw: 99 })).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get('/api/v1/calculators/reading')
          .query({ raw: 20, type: 'fun' })
      ).status,
    ).toBe(400);
  });
});
