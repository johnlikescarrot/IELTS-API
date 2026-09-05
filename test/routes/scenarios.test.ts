import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { DiscourseClass, ListeningScenario } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/scenarios', () => {
  it('lists every scenario with statistics', async () => {
    const response = await server.json<ListeningScenario[]>('/v1/scenarios');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(12);
    expect(response.data).toHaveLength(12);
    expect(response.meta.stats).toMatchObject({ scenarios: 12, scenarioTerms: 790 });
    expect(response.meta.sections).toEqual([1, 2, 3, 4]);
    expect(response.meta.section).toBeNull();
  });

  it('filters by listening section', async () => {
    const one = await server.json<ListeningScenario[]>('/v1/scenarios?section=1');
    expect(one.data.every((scenario) => scenario.typicalSections.includes(1))).toBe(true);
    expect(one.meta.section).toBe(1);

    const four = await server.json<ListeningScenario[]>('/v1/scenarios?section=4');
    expect(four.data.map((scenario) => scenario.id)).toEqual(['academic-lecture']);
  });

  it('searches names and terms', async () => {
    const hits = await server.json<ListeningScenario[]>('/v1/scenarios?q=rent');
    expect(hits.data.map((scenario) => scenario.id)).toContain('housing');
    const nothing = await server.json<ListeningScenario[]>('/v1/scenarios?q=xyzzy-nothing');
    expect(nothing.data).toHaveLength(0);
  });

  it('paginates', async () => {
    const response = await server.json<ListeningScenario[]>('/v1/scenarios?limit=3&offset=10');
    expect(response.data).toHaveLength(2);
    expect(response.meta.offset).toBe(10);
    expect(response.meta.hasMore).toBe(false);
  });

  it('rejects an unknown section and malformed pagination', async () => {
    expect((await server.json('/v1/scenarios?section=5')).status).toBe(400);
    expect((await server.json('/v1/scenarios?section=listening')).status).toBe(400);
    expect((await server.json('/v1/scenarios?limit=0')).status).toBe(400);
  });
});

describe('GET /v1/scenarios/discourse-markers', () => {
  it('lists the eight discourse classes', async () => {
    const response = await server.json<DiscourseClass[]>('/v1/scenarios/discourse-markers');
    expect(response.status).toBe(200);
    expect(response.meta.count).toBe(8);
    expect(response.meta.markerTotal).toBe(54);
    expect(response.data.map((entry) => entry.id)).toContain('adversative');
  });
});

describe('GET /v1/scenarios/discourse-markers/:id', () => {
  it('returns one class', async () => {
    const response = await server.json<DiscourseClass>('/v1/scenarios/discourse-markers/causal');
    expect(response.status).toBe(200);
    expect(response.data.pattern).toBe('A because B');
    expect(response.meta.markers).toBe(7);
  });

  it('404s for unknown classes', async () => {
    const response = await server.json('/v1/scenarios/discourse-markers/nope');
    expect(response.status).toBe(404);
    const details = (response.meta.error as { details: Record<string, string> }).details;
    expect(details.allowed).toContain('adversative');
  });
});

describe('GET /v1/scenarios/:id', () => {
  it('returns one scenario with all categories', async () => {
    const response = await server.json<ListeningScenario>('/v1/scenarios/housing');
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Housing and accommodation');
    expect(response.meta.totalCategories).toBe(response.data.categories.length);
    expect(response.meta.matchedCategories).toBe(response.data.categories.length);
    expect(response.meta.termTotal as number).toBeGreaterThan(50);
  });

  it('filters the categories by free text', async () => {
    const response = await server.json<ListeningScenario>('/v1/scenarios/housing?q=payment');
    expect(Number(response.meta.matchedCategories)).toBeLessThan(Number(response.meta.totalCategories));
    expect(response.data.categories.map((category) => category.name)).toContain('rent and payment');
  });

  it('404s for unknown scenarios', async () => {
    const response = await server.json('/v1/scenarios/nope');
    expect(response.status).toBe(404);
    expect((response.meta.error as { message: string }).message).toContain('No listening scenario');
  });
});
