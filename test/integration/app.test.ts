import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../../src/app.js';
import { loadConfig, type AppConfig } from '../../src/config.js';

const testConfig: AppConfig = loadConfig({ NODE_ENV: 'test', PORT: '0' });

async function buildApp(): Promise<FastifyInstance> {
  return createApp(testConfig);
}

async function getJson(
  app: FastifyInstance,
  url: string
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  const response = await app.inject({ method: 'GET', url });
  return {
    status: response.statusCode,
    body: response.json(),
    headers: response.headers as Record<string, string>
  };
}

describe('meta routes', () => {
  it('GET / returns the self-documenting API index', async () => {
    const app = await buildApp();
    const { status, body } = await getJson(app, '/');
    expect(status).toBe(200);
    expect(body.data.name).toBe('IELTS API');
    expect(body.data.authentication).toBe('none');
    expect(body.data.cost).toBe('free');
    expect(body.data.docs.length).toBeGreaterThan(20);
    await app.close();
  });

  it('GET /v1 returns the same index', async () => {
    const app = await buildApp();
    const { status, body } = await getJson(app, '/v1');
    expect(status).toBe(200);
    expect(body.data.version).toBe('1.0.0');
    await app.close();
  });

  it('GET /health reports liveness', async () => {
    const app = await buildApp();
    const { status, body } = await getJson(app, '/health');
    expect(status).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    await app.close();
  });

  it('answers HEAD requests for GET routes', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'HEAD', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.headers.etag).toBeDefined();
    await app.close();
  });
});

describe('vocabulary routes', () => {
  it('GET /v1/vocab/awl summarises the Academic Word List', async () => {
    const app = await buildApp();
    const { status, body, headers } = await getJson(app, '/v1/vocab/awl');
    expect(status).toBe(200);
    expect(body.data.wordCount).toBe(570);
    expect(body.data.sublistCount).toBe(10);
    expect(headers['cache-control']).toContain('max-age=86400');
    await app.close();
  });

  it('GET /v1/vocab/awl/sublists/:sublist paginates words', async () => {
    const app = await buildApp();
    const first = await getJson(app, '/v1/vocab/awl/sublists/1?page=1&limit=10');
    expect(first.status).toBe(200);
    expect(first.body.data.words).toHaveLength(10);
    expect(first.body.data.words[0].word).toBe('sector');
    expect(first.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 60,
      totalPages: 6,
      hasNextPage: true
    });
    const last = await getJson(app, '/v1/vocab/awl/sublists/1?page=6&limit=10');
    expect(last.body.data.words).toHaveLength(10);
    expect(last.body.meta.hasNextPage).toBe(false);
    const beyond = await getJson(app, '/v1/vocab/awl/sublists/1?page=99&limit=10');
    expect(beyond.body.data.words).toEqual([]);
    const tenth = await getJson(app, '/v1/vocab/awl/sublists/10?limit=30');
    expect(tenth.body.data.words).toHaveLength(30);
    await app.close();
  });

  it('validates the sublist parameter', async () => {
    const app = await buildApp();
    for (const url of [
      '/v1/vocab/awl/sublists/0',
      '/v1/vocab/awl/sublists/11',
      '/v1/vocab/awl/sublists/abc'
    ]) {
      const { status, body } = await getJson(app, url);
      expect(status, url).toBe(400);
      expect(body.error.code).toBe('validation_error');
      expect(body.error.details.issues.length).toBeGreaterThan(0);
    }
    await app.close();
  });

  it('GET /v1/vocab/awl/words/:word resolves one word and 404s unknown words', async () => {
    const app = await buildApp();
    const found = await getJson(app, '/v1/vocab/awl/words/RESEARCH');
    expect(found.status).toBe(200);
    expect(found.body.data.word).toBe('research');
    expect(found.body.data.sublist).toBe(1);
    const missing = await getJson(app, '/v1/vocab/awl/words/zzznotaword');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('not_found');
    expect(missing.body.requestId).toBeDefined();
    await app.close();
  });

  it('GET /v1/vocab/awl/random is seeded-deterministic and cache-varied', async () => {
    const app = await buildApp();
    const a = await getJson(app, '/v1/vocab/awl/random?count=5&seed=hello');
    const b = await getJson(app, '/v1/vocab/awl/random?count=5&seed=hello');
    expect(a.body.data.words).toEqual(b.body.data.words);
    expect(a.body.data.seed).toBe('hello');
    expect(a.headers['cache-control']).toContain('max-age=86400');
    const unseeded = await getJson(app, '/v1/vocab/awl/random?count=2');
    expect(unseeded.body.data.seed).toBeNull();
    expect(unseeded.headers['cache-control']).toBe('no-store');
    const fromSublist = await getJson(app, '/v1/vocab/awl/random?count=3&sublist=4&seed=s');
    expect(fromSublist.body.data.words.every((w: { sublist: number }) => w.sublist === 4)).toBe(
      true
    );
    await app.close();
  });

  it('validates random-word query parameters', async () => {
    const app = await buildApp();
    expect((await getJson(app, '/v1/vocab/awl/random?count=0')).status).toBe(400);
    expect((await getJson(app, '/v1/vocab/awl/random?count=51')).status).toBe(400);
    expect((await getJson(app, '/v1/vocab/awl/random?sublist=99')).status).toBe(400);
    await app.close();
  });

  it('GET /v1/vocab/topics lists packs; :topicId returns one or 404s', async () => {
    const app = await buildApp();
    const all = await getJson(app, '/v1/vocab/topics');
    expect(all.body.data.topics).toHaveLength(12);
    const one = await getJson(app, '/v1/vocab/topics/education');
    expect(one.body.data.words).toHaveLength(8);
    const missing = await getJson(app, '/v1/vocab/topics/astrophysics');
    expect(missing.status).toBe(404);
    await app.close();
  });

  it('GET /v1/vocab/topics/random serves seeded topic vocabulary', async () => {
    const app = await buildApp();
    const a = await getJson(app, '/v1/vocab/topics/random?count=3&topicId=health&seed=t');
    const b = await getJson(app, '/v1/vocab/topics/random?count=3&topicId=health&seed=t');
    expect(a.body.data.entries).toEqual(b.body.data.entries);
    expect(a.body.data.entries[0].topicId).toBe('health');
    const unseeded = await getJson(app, '/v1/vocab/topics/random?count=1');
    expect(unseeded.body.data.seed).toBeNull();
    expect(unseeded.headers['cache-control']).toBe('no-store');
    await app.close();
  });

  it('GET /v1/vocab/search spans both datasets with scope filtering', async () => {
    const app = await buildApp();
    const all = await getJson(app, '/v1/vocab/search?q=carbon');
    expect(all.status).toBe(200);
    expect(all.body.meta.scope).toBe('all');
    expect(all.body.data.topics.length).toBeGreaterThan(0);
    const awlOnly = await getJson(app, '/v1/vocab/search?q=evidence&scope=awl');
    expect(awlOnly.body.data.awl.length).toBeGreaterThan(0);
    expect(awlOnly.body.data.topics).toEqual([]);
    const topicsOnly = await getJson(app, '/v1/vocab/search?q=solar&scope=topics');
    expect(topicsOnly.body.data.awl).toEqual([]);
    expect(topicsOnly.body.data.topics.length).toBeGreaterThan(0);
    const invalid = await getJson(app, '/v1/vocab/search?q=');
    expect(invalid.status).toBe(400);
    await app.close();
  });
});

describe('question routes', () => {
  it('GET /v1/questions filters and paginates', async () => {
    const app = await buildApp();
    const writing = await getJson(app, '/v1/questions?skill=writing&part=2&limit=100');
    expect(
      writing.body.data.every(
        (q: { skill: string; part: number }) => q.skill === 'writing' && q.part === 2
      )
    ).toBe(true);
    const topic = await getJson(app, '/v1/questions?topic=health');
    expect(
      topic.body.data.every((q: { topic: string }) => q.topic.toLowerCase().includes('health'))
    ).toBe(true);
    const invalid = await getJson(app, '/v1/questions?part=7');
    expect(invalid.status).toBe(400);
    await app.close();
  });

  it('GET /v1/questions/:id finds one question or 404s', async () => {
    const app = await buildApp();
    const found = await getJson(app, '/v1/questions/sp2-person-you-admire');
    expect(found.status).toBe(200);
    expect(found.body.data.task).toContain('Describe a person you admire');
    const missing = await getJson(app, '/v1/questions/nope');
    expect(missing.status).toBe(404);
    await app.close();
  });

  it('GET /v1/questions/random is seeded-deterministic', async () => {
    const app = await buildApp();
    const a = await getJson(app, '/v1/questions/random?seed=fixed&skill=speaking');
    const b = await getJson(app, '/v1/questions/random?seed=fixed&skill=speaking');
    expect(a.body.data.id).toBe(b.body.data.id);
    const unseeded = await getJson(app, '/v1/questions/random?skill=speaking');
    expect(unseeded.body.data.skill).toBe('speaking');
    expect(unseeded.headers['cache-control']).toBe('no-store');
    const invalid = await getJson(app, '/v1/questions/random?skill=listening');
    expect(invalid.status).toBe(400);
    await app.close();
  });
});

describe('scoring routes', () => {
  it('GET /v1/scoring/tables returns every module table', async () => {
    const app = await buildApp();
    const { body } = await getJson(app, '/v1/scoring/tables');
    expect(body.data.modules).toHaveLength(3);
    for (const module of body.data.modules) {
      expect(module.table).toHaveLength(41);
    }
    expect(body.data.note).toContain('Approximate');
    await app.close();
  });

  it('GET /v1/scoring/conversion converts valid raw scores and rejects bad ones', async () => {
    const app = await buildApp();
    const good = await getJson(app, '/v1/scoring/conversion?module=listening&raw=34');
    expect(good.body.data.band).toBe(7.5);
    const gt = await getJson(app, '/v1/scoring/conversion?module=reading-general-training&raw=15');
    expect(gt.body.data.band).toBe(4);
    expect((await getJson(app, '/v1/scoring/conversion?module=writing&raw=10')).status).toBe(400);
    expect((await getJson(app, '/v1/scoring/conversion?module=listening&raw=41')).status).toBe(400);
    expect((await getJson(app, '/v1/scoring/conversion?module=listening&raw=-2')).status).toBe(400);
    await app.close();
  });

  it('POST /v1/scoring/overall computes the overall band', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/scoring/overall',
      payload: { listening: 7, reading: 7, writing: 6, speaking: 5 }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.overall).toBe(6.5);
    const missing = await app.inject({
      method: 'POST',
      url: '/v1/scoring/overall',
      payload: { listening: 7 }
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json().error.code).toBe('validation_error');
    await app.close();
  });

  it('rejects malformed and empty JSON bodies with the request_error envelope', async () => {
    const app = await buildApp();
    const malformed = await app.inject({
      method: 'POST',
      url: '/v1/scoring/overall',
      payload: '{not json',
      headers: { 'content-type': 'application/json' }
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().error.code).toBe('request_error');
    const empty = await app.inject({
      method: 'POST',
      url: '/v1/scoring/overall',
      payload: '',
      headers: { 'content-type': 'application/json' }
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.code).toBe('request_error');
    await app.close();
  });
});

describe('band descriptor routes', () => {
  it('GET /v1/bands lists the nine-band scale; :band returns one', async () => {
    const app = await buildApp();
    const all = await getJson(app, '/v1/bands');
    expect(all.body.data.scale).toHaveLength(9);
    const one = await getJson(app, '/v1/bands/7');
    expect(one.body.data.name).toBe('Good user');
    expect((await getJson(app, '/v1/bands/0')).status).toBe(400);
    expect((await getJson(app, '/v1/bands/ten')).status).toBe(400);
    await app.close();
  });

  it('GET /v1/bands/writing/:task returns criteria, optionally filtered', async () => {
    const app = await buildApp();
    const task1 = await getJson(app, '/v1/bands/writing/1');
    expect(task1.body.data.criteria).toHaveLength(4);
    expect(task1.body.data.criteria[0].criterion).toBe('Task Achievement');
    const task2 = await getJson(app, '/v1/bands/writing/2');
    expect(task2.body.data.criteria[0].criterion).toBe('Task Response');
    const filtered = await getJson(app, '/v1/bands/writing/2?criterion=lexical-resource');
    expect(filtered.body.data.criteria).toHaveLength(1);
    expect(filtered.body.data.criteria[0].descriptors).toHaveLength(5);
    const task1Filtered = await getJson(
      app,
      '/v1/bands/writing/1?criterion=coherence-and-cohesion'
    );
    expect(task1Filtered.body.data.criteria).toHaveLength(1);
    expect(task1Filtered.body.data.task).toBe(1);
    const unknown = await getJson(app, '/v1/bands/writing/2?criterion=style-points');
    expect(unknown.status).toBe(404);
    expect((await getJson(app, '/v1/bands/writing/3')).status).toBe(400);
    await app.close();
  });

  it('GET /v1/bands/speaking returns criteria, optionally filtered', async () => {
    const app = await buildApp();
    const all = await getJson(app, '/v1/bands/speaking');
    expect(all.body.data.criteria).toHaveLength(4);
    const filtered = await getJson(app, '/v1/bands/speaking?criterion=pronunciation');
    expect(filtered.body.data.criteria[0].criterion).toBe('Pronunciation');
    expect((await getJson(app, '/v1/bands/speaking?criterion=')).status).toBe(400);
    expect((await getJson(app, '/v1/bands/speaking?criterion=charisma')).status).toBe(404);
    await app.close();
  });
});

describe('mistake routes', () => {
  it('GET /v1/mistakes lists and filters with pagination metadata', async () => {
    const app = await buildApp();
    const all = await getJson(app, '/v1/mistakes');
    expect(all.body.data.mistakes).toHaveLength(20);
    expect(all.body.meta.categories.length).toBe(8);
    const filtered = await getJson(app, '/v1/mistakes?category=articles&limit=1');
    expect(filtered.body.data.mistakes).toHaveLength(1);
    expect(filtered.body.meta.total).toBe(2);
    expect((await getJson(app, '/v1/mistakes?category=not-a-category')).status).toBe(400);
    await app.close();
  });

  it('GET /v1/mistakes/:id finds one or 404s', async () => {
    const app = await buildApp();
    const found = await getJson(app, '/v1/mistakes/mist-007');
    expect(found.body.data.category).toBe('punctuation');
    expect((await getJson(app, '/v1/mistakes/mist-999')).status).toBe(404);
    await app.close();
  });

  it('GET /v1/mistakes/random serves a seeded correction quiz', async () => {
    const app = await buildApp();
    const a = await getJson(app, '/v1/mistakes/random?count=4&seed=quiz');
    const b = await getJson(app, '/v1/mistakes/random?count=4&seed=quiz');
    expect(a.body.data.quiz).toEqual(b.body.data.quiz);
    for (const item of a.body.data.quiz) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answerIndex]).toBeDefined();
    }
    const unseeded = await getJson(app, '/v1/mistakes/random?count=2');
    expect(unseeded.body.data.seed).toBeNull();
    expect(unseeded.headers['cache-control']).toBe('no-store');
    expect((await getJson(app, '/v1/mistakes/random?count=21')).status).toBe(400);
    await app.close();
  });
});

describe('practice routes', () => {
  it('GET /v1/practice/mock-test builds a deterministic full test', async () => {
    const app = await buildApp();
    const a = await getJson(app, '/v1/practice/mock-test?seed=tuesday');
    const b = await getJson(app, '/v1/practice/mock-test?seed=tuesday');
    expect(a.body.data).toEqual(b.body.data);
    expect(a.body.data.speaking.part2.task).toContain('Describe');
    expect(a.body.data.writing.task1.variant).toBe('academic');
    expect(a.headers['cache-control']).toContain('max-age=86400');
    const unseeded = await getJson(app, '/v1/practice/mock-test');
    expect(unseeded.body.data.seed).toBeNull();
    expect(unseeded.headers['cache-control']).toBe('no-store');
    await app.close();
  });

  it('GET /v1/practice/vocab-quiz builds seeded quizzes', async () => {
    const app = await buildApp();
    const quiz = await getJson(app, '/v1/practice/vocab-quiz?count=3&topicId=environment&seed=q1');
    expect(quiz.body.data.quiz).toHaveLength(3);
    for (const card of quiz.body.data.quiz) {
      expect(card.options).toHaveLength(4);
      expect(card.options[card.answerIndex]).toBe(card.meaning);
    }
    const unseeded = await getJson(app, '/v1/practice/vocab-quiz?count=2');
    expect(unseeded.body.data.seed).toBeNull();
    expect(unseeded.headers['cache-control']).toBe('no-store');
    expect((await getJson(app, '/v1/practice/vocab-quiz?count=0')).status).toBe(400);
    await app.close();
  });

  it('GET /v1/practice/study-plan generates weekly plans', async () => {
    const app = await buildApp();
    const plan = await getJson(
      app,
      '/v1/practice/study-plan?currentBand=5.5&targetBand=7&weeks=3&seed=p'
    );
    expect(plan.body.data.mode).toBe('improvement');
    expect(plan.body.data.schedule).toHaveLength(3);
    const unseeded = await getJson(
      app,
      '/v1/practice/study-plan?currentBand=5&targetBand=6&weeks=1'
    );
    expect(unseeded.headers['cache-control']).toBe('no-store');
    const maintenance = await getJson(
      app,
      '/v1/practice/study-plan?currentBand=7&targetBand=7&weeks=2'
    );
    expect(maintenance.body.data.mode).toBe('maintenance');
    await app.close();
  });

  it('validates study-plan inputs', async () => {
    const app = await buildApp();
    expect(
      (await getJson(app, '/v1/practice/study-plan?currentBand=7&targetBand=6&weeks=2')).status
    ).toBe(400);
    expect(
      (await getJson(app, '/v1/practice/study-plan?currentBand=12&targetBand=6&weeks=2')).status
    ).toBe(400);
    expect(
      (await getJson(app, '/v1/practice/study-plan?currentBand=6&targetBand=7&weeks=0')).status
    ).toBe(400);
    expect(
      (await getJson(app, '/v1/practice/study-plan?currentBand=abc&targetBand=7&weeks=2')).status
    ).toBe(400);
    await app.close();
  });
});

describe('cross-cutting behaviour', () => {
  it('sends 404 envelopes for unknown routes', async () => {
    const app = await buildApp();
    const { status, body } = await getJson(app, '/definitely/not/here');
    expect(status).toBe(404);
    expect(body.error.code).toBe('route_not_found');
    expect(body.error.message).toContain('GET:/definitely/not/here');
    await app.close();
  });

  it('sends strong security headers on every response', async () => {
    const app = await buildApp();
    const { headers } = await getJson(app, '/health');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
    await app.close();
  });

  it('supports conditional GET with ETag/If-None-Match', async () => {
    const app = await buildApp();
    const first = await app.inject({ method: 'GET', url: '/v1/vocab/topics' });
    expect(first.statusCode).toBe(200);
    const etag = first.headers.etag as string;
    expect(etag).toMatch(/^W\//);
    const conditional = await app.inject({
      method: 'GET',
      url: '/v1/vocab/topics',
      headers: { 'if-none-match': etag }
    });
    expect(conditional.statusCode).toBe(304);
    expect(conditional.body).toBe('');
    const changed = await app.inject({
      method: 'GET',
      url: '/v1/vocab/topics',
      headers: { 'if-none-match': 'W/"outdated"' }
    });
    expect(changed.statusCode).toBe(200);
    await app.close();
  });

  it('reflects any origin when CORS is open', async () => {
    const app = await buildApp();
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/scoring/overall',
      headers: {
        origin: 'https://example.org',
        'access-control-request-method': 'POST'
      }
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://example.org');
    await app.close();
  });

  it('boots with the production logger configuration', async () => {
    const prodConfig: AppConfig = { ...testConfig, env: 'production', logLevel: 'error' };
    const app = await createApp(prodConfig);
    const { status, body } = await getJson(app, '/health');
    expect(status).toBe(200);
    expect(body.data.status).toBe('ok');
    await app.close();
  });

  it('honours a CORS allow-list when configured', async () => {
    const restrictedConfig: AppConfig = { ...testConfig, corsOrigins: ['https://allowed.example'] };
    const app = await createApp(restrictedConfig);
    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://allowed.example' }
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example');
    const denied = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' }
    });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });

  it('exposes the same envelope shape everywhere', async () => {
    const app = await buildApp();
    const success = await getJson(app, '/v1/bands/5');
    expect(Object.keys(success.body)).toEqual(['data']);
    const failure = await getJson(app, '/v1/bands/99');
    expect(Object.keys(failure.body)).toEqual(['error', 'requestId']);
    await app.close();
  });
});
