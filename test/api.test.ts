import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('IELTS API', () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an index of free, unauthenticated endpoints', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.free).toBe(true);
    expect(body.authentication).toBe('none');
    expect(body.endpoints.health).toBe('/health');
  });

  it('reports health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    expect(res.json().service).toBe('ielts-api');
  });

  it('can build an app with logging enabled', async () => {
    const logged = buildApp({ logger: true });
    const res = await logged.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    await logged.close();
  });

  describe('band-scores', () => {
    it('lists all overall band descriptors', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/band-scores' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(10);
      expect(body.bands).toHaveLength(10);
    });

    it('returns a descriptor for a valid integer band', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/band-scores/7' });
      expect(res.statusCode).toBe(200);
      expect(res.json().band).toBe(7);
    });

    it('returns 404 for a half band that has no overall descriptor', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/band-scores/6.5' });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for an invalid band value', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/band-scores/abc' });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('listening score', () => {
    it('converts a raw score to a band', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/listening?correct=32' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.section).toBe('listening');
      expect(body.band).toBe(7.5);
      expect(body.nextBand).toBe(8);
    });

    it('returns a null next band at the top', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/listening?correct=40' });
      expect(res.statusCode).toBe(200);
      expect(res.json().band).toBe(9);
      expect(res.json().nextBand).toBeNull();
    });

    it('rejects non-numeric input', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/listening?correct=abc' });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects scores above the maximum', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/listening?correct=41' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('reading score', () => {
    it('defaults to the academic module', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/reading?correct=15' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.module).toBe('academic');
      expect(body.band).toBe(5);
    });

    it('supports an explicit academic module', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/score/reading?correct=30&module=academic',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().band).toBe(7);
    });

    it('supports the general-training module', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/score/reading?correct=15&module=general-training',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.module).toBe('general-training');
      expect(body.band).toBe(4.5);
    });

    it('treats an empty module as academic', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/reading?correct=15&module=' });
      expect(res.statusCode).toBe(200);
      expect(res.json().module).toBe('academic');
    });

    it('returns a null next band at the top of the reading table', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/score/reading?correct=40' });
      expect(res.statusCode).toBe(200);
      expect(res.json().band).toBe(9);
      expect(res.json().nextBand).toBeNull();
    });

    it('rejects an unknown module', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/score/reading?correct=15&module=foo',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('overall score', () => {
    it('computes the overall band from components', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/score/overall',
        payload: { listening: 7.5, reading: 6.5, writing: 6.5, speaking: 7 },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.overall).toBe(7);
      expect(body.average).toBe(6.875);
    });

    it('rejects a request with missing components', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/score/overall', payload: {} });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('treats an absent body as an empty object', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/score/overall' });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects components that are not valid bands', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/score/overall',
        payload: { listening: 'x', reading: 6.5, writing: 6.5, speaking: 7 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('writing criteria', () => {
    it('lists all writing criteria', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/writing/criteria' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(4);
    });

    it('returns a single criterion', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/writing/criteria/lexical-resource',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Lexical Resource');
    });

    it('returns 404 for an unknown criterion', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/writing/criteria/nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('speaking criteria', () => {
    it('lists all speaking criteria', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/speaking/criteria' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(4);
    });

    it('returns a single criterion', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/speaking/criteria/pronunciation' });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Pronunciation');
    });

    it('returns 404 for an unknown criterion', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/speaking/criteria/nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('vocabulary', () => {
    it('lists the whole vocabulary', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/vocabulary' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(24);
    });

    it('searches the vocabulary', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/vocabulary?q=education' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBeGreaterThan(0);
    });

    it('returns a single entry', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/vocabulary/word-001' });
      expect(res.statusCode).toBe(200);
      expect(res.json().word).toBe('ameliorate');
    });

    it('returns 404 for an unknown entry', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/vocabulary/nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('mistakes', () => {
    it('lists the whole set of mistakes', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/mistakes' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(12);
    });

    it('searches the mistakes', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/mistakes?q=grammar' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBeGreaterThan(0);
    });
  });

  describe('resources', () => {
    it('lists every resource', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/resources' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(12);
    });

    it('filters by skill', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/resources?skill=writing' });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBeGreaterThan(0);
    });

    it('combines skill and query filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/resources?skill=writing&q=grammar',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().resources.length).toBeGreaterThan(0);
    });

    it('supports pagination', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/resources?page=2&limit=2' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.page).toBe(2);
      expect(body.resources).toHaveLength(2);
    });

    it('clamps page and limit to at least one', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/resources?page=0&limit=0' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.page).toBe(1);
      expect(body.resources.length).toBeGreaterThan(0);
    });

    it('rejects an invalid limit', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/resources?limit=abc' });
      expect(res.statusCode).toBe(400);
    });
  });

  it('returns a structured 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});
