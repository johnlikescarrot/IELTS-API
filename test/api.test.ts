import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { Router, toErrorResponse } from '../src/core/router.ts';
import { openApiDocument } from '../src/openapi.ts';

const app = createApp();

const get = (url: string) => app.handle({ method: 'GET', url });
const post = (url: string, body: unknown) => app.handle({ method: 'POST', url, body });

describe('discovery endpoints', () => {
  it('serves the index, health, meta and openapi documents', async () => {
    const index = await get('/');
    expect(index.status).toBe(200);
    expect((index.body as { authentication: string }).authentication).toBe('none');

    expect((await get('/health')).status).toBe(200);
    const meta = await get('/v1/meta');
    expect((meta.body as { counts: { vocabulary: number } }).counts.vocabulary).toBeGreaterThan(0);
    expect(
      (meta.body as { contentPolicy: { upstreamMaterialIncluded: boolean } }).contentPolicy
        .upstreamMaterialIncluded,
    ).toBe(false);
    const sources = await get('/v1/sources');
    expect((sources.body as { sources: unknown[] }).sources).toHaveLength(2);
    const spec = await get('/openapi.json');
    expect((spec.body as { openapi: string }).openapi).toBe('3.1.0');
    expect(Object.keys(openApiDocument().paths as object).length).toBeGreaterThan(10);
  });
});

describe('band endpoints', () => {
  it('computes overall bands', async () => {
    const response = await post('/v1/band/overall', {
      listening: 7,
      reading: 6.5,
      writing: 6,
      speaking: 7,
    });
    expect(response.status).toBe(200);
    expect((response.body as { overall: number }).overall).toBe(6.5);
  });

  it('rejects invalid overall payloads', async () => {
    expect((await post('/v1/band/overall', null)).status).toBe(400);
    expect((await post('/v1/band/overall', { listening: 7 })).status).toBe(400);
  });

  it('converts, targets and rounds', async () => {
    const convert = await get('/v1/band/convert?skill=listening&rawScore=30');
    expect((convert.body as { band: number }).band).toBe(7);
    expect((await get('/v1/band/convert?skill=reading&rawScore=30&module=general')).status).toBe(
      200,
    );
    expect((await get('/v1/band/convert?skill=diving&rawScore=30')).status).toBe(400);

    const target = await get('/v1/band/target?skill=listening&rawScore=23&targetBand=7');
    expect((target.body as { additionalMarks: number }).additionalMarks).toBe(7);
    expect((target.body as { achievable: boolean }).achievable).toBe(true);

    const rounded = await get('/v1/band/round?value=6.25');
    expect((rounded.body as { band: number }).band).toBe(6.5);
  });
});

describe('cefr endpoints', () => {
  it('serves the table and lookups', async () => {
    expect((await get('/v1/cefr')).status).toBe(200);
    expect(((await get('/v1/cefr/band/7')).body as { level: string }).level).toBe('C1');
    expect(((await get('/v1/cefr/level/b2')).body as { level: string }).level).toBe('B2');
    expect((await get('/v1/cefr/level/zz')).status).toBe(404);
  });
});

describe('vocabulary endpoints', () => {
  it('filters, paginates and looks up entries', async () => {
    const all = await get('/v1/vocabulary');
    expect((all.body as { total: number }).total).toBeGreaterThan(5);
    expect(((await get('/v1/vocabulary?sublist=1')).body as { total: number }).total).toBe(2);
    expect(((await get('/v1/vocabulary?cefr=c2')).body as { total: number }).total).toBe(1);
    expect(((await get('/v1/vocabulary?q=analyse')).body as { total: number }).total).toBe(1);
    const page = await get('/v1/vocabulary?limit=2&offset=1');
    expect((page.body as { items: unknown[] }).items).toHaveLength(2);
    expect((await get('/v1/vocabulary?limit=0')).status).toBe(400);
    expect((await get('/v1/vocabulary?cefr=zz')).status).toBe(400);
    expect((await get('/v1/vocabulary?q=')).status).toBe(400);
    expect((await get('/v1/vocabulary?sublist=99')).status).toBe(400);

    expect((await get('/v1/vocabulary/Mitigate')).status).toBe(200);
    expect((await get('/v1/vocabulary/nothing')).status).toBe(404);
    expect((await get('/v1/cohesive-devices')).status).toBe(200);
  });
});

describe('prompt endpoints', () => {
  it('lists and filters writing prompts', async () => {
    expect(((await get('/v1/prompts/writing')).body as { total: number }).total).toBe(6);
    expect(
      ((await get('/v1/prompts/writing?module=general')).body as { total: number }).total,
    ).toBe(2);
    expect(((await get('/v1/prompts/writing?task=1')).body as { total: number }).total).toBe(3);
    expect((await get('/v1/prompts/writing?task=9')).status).toBe(400);
    expect((await get('/v1/prompts/writing?module=nope')).status).toBe(400);
    expect((await get('/v1/prompts/writing/w-a2-001')).status).toBe(200);
    expect((await get('/v1/prompts/writing/missing')).status).toBe(404);
  });

  it('lists and filters speaking prompts', async () => {
    expect(((await get('/v1/prompts/speaking')).body as { total: number }).total).toBe(5);
    expect(((await get('/v1/prompts/speaking?part=2')).body as { total: number }).total).toBe(2);
    expect((await get('/v1/prompts/speaking?part=7')).status).toBe(400);
    expect((await get('/v1/prompts/speaking/s-p1-001')).status).toBe(200);
    expect((await get('/v1/prompts/speaking/missing')).status).toBe(404);
  });
});

describe('reading endpoints', () => {
  it('lists, filters and fetches passages', async () => {
    expect(((await get('/v1/reading/passages')).body as { total: number }).total).toBe(2);
    expect(
      ((await get('/v1/reading/passages?module=general')).body as { total: number }).total,
    ).toBe(1);
    expect((await get('/v1/reading/passages?module=nope')).status).toBe(400);

    const hidden = await get('/v1/reading/passages/r-a-001');
    expect(
      (hidden.body as { questions: { answer?: string }[] }).questions[0]?.answer,
    ).toBeUndefined();
    const shown = await get('/v1/reading/passages/r-a-001?includeAnswers=true');
    expect((shown.body as { questions: { answer: string }[] }).questions[0]?.answer).toBe('true');
    expect((await get('/v1/reading/passages/missing')).status).toBe(404);
  });

  it('marks submitted answers', async () => {
    const response = await post('/v1/reading/passages/r-g-001/check', {
      answers: { 'r-g-001-q1': ' Eight ', 'r-g-001-q2': 'true' },
    });
    const body = response.body as {
      score: number;
      total: number;
      percentage: number;
      results: { given: string | null; correct: boolean }[];
    };
    expect(body.score).toBe(1);
    expect(body.total).toBe(2);
    expect(body.percentage).toBe(50);
    expect(body.results[0]?.correct).toBe(true);

    const missingAnswer = await post('/v1/reading/passages/r-g-001/check', { answers: {} });
    expect((missingAnswer.body as { results: { given: null }[] }).results[0]?.given).toBeNull();
    expect((await post('/v1/reading/passages/missing/check', { answers: {} })).status).toBe(404);
    expect((await post('/v1/reading/passages/r-g-001/check', {})).status).toBe(400);
  });
});

describe('analysis endpoints', () => {
  it('analyses writing and raw text', async () => {
    const analysis = await post('/v1/writing/analyze', {
      text: 'However, cities change. Moreover, they grow.',
      task: 1,
    });
    expect((analysis.body as { task: number }).task).toBe(1);
    expect((await post('/v1/writing/analyze', { text: 'x' })).status).toBe(200);
    expect((await post('/v1/writing/analyze', { text: '' })).status).toBe(400);

    const metrics = await post('/v1/text/metrics', { text: 'A short line.' });
    expect((metrics.body as { words: number }).words).toBe(3);
    expect((await post('/v1/text/metrics', {})).status).toBe(400);
  });
});

describe('router behaviour', () => {
  it('handles unknown routes, wrong methods and HEAD', async () => {
    expect((await get('/nope')).status).toBe(404);
    expect((await post('/health', {})).status).toBe(405);
    expect((await app.handle({ method: 'HEAD', url: '/health' })).status).toBe(200);
  });

  it('supports the add() escape hatch and async handlers', async () => {
    const router = new Router();
    router.add('put', '/thing/:id', async (request) => ({
      status: 200,
      body: { id: request.params.id, method: request.method, query: request.query.get('a') },
    }));
    const response = await router.handle({ method: 'PUT', url: '/thing/42?a=b' });
    expect(response.body).toEqual({ id: '42', method: 'PUT', query: 'b' });
  });

  it('wraps unexpected errors as 500s', () => {
    expect(toErrorResponse(new Error('boom')).status).toBe(500);
    expect((toErrorResponse('boom').body as { error: { message: string } }).error.message).toBe(
      'Unknown error',
    );
  });
});
