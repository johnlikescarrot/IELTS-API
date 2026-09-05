import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

const PASSAGE = [
  'Urban transport policy has changed considerably over the last decade.',
  'Many cities have restricted private vehicles in their historic centres.',
  'However, critics argue that such restrictions harm small businesses.',
].join(' ');

const encoded = encodeURIComponent(PASSAGE);

describe('GET /v1/analyze/readability', () => {
  it('measures a passage supplied as a query parameter', async () => {
    const response = await server.json<{
      measurement: { words: number; fleschReadingEase: number; reliable: boolean };
      corpus: unknown[];
      caveats: string[];
    }>(`/v1/analyze/readability?text=${encoded}`);
    expect(response.status).toBe(200);
    expect(response.data.measurement.words).toBeGreaterThan(20);
    expect(response.data.measurement.reliable).toBe(true);
    expect(response.data.corpus.length).toBeGreaterThan(0);
    expect(response.meta.formulae).toBeTypeOf('object');
    expect(response.meta.privacy).toContain('never stored');
  });

  it('measures a passage supplied as a text/plain body', async () => {
    const response = await server.request('/v1/analyze/readability', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: PASSAGE,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const payload = (await response.json()) as { data: { measurement: { words: number } } };
    expect(payload.data.measurement.words).toBeGreaterThan(20);
  });

  it('measures a passage supplied as JSON', async () => {
    const response = await server.request('/v1/analyze/readability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: PASSAGE }),
    });
    expect(response.status).toBe(200);
  });

  it('measures a passage supplied as a form field', async () => {
    const response = await server.request('/v1/analyze/readability', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text: PASSAGE }).toString(),
    });
    expect(response.status).toBe(200);
  });

  it('rejects a request with no text', async () => {
    const response = await server.request('/v1/analyze/readability');
    expect(response.status).toBe(400);
  });

  it('rejects text with nothing measurable', async () => {
    const response = await server.request('/v1/analyze/readability?text=12345');
    expect(response.status).toBe(422);
  });

  it('rejects text over the character limit', async () => {
    const response = await server.request('/v1/analyze/readability', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'word '.repeat(11000),
    });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { meta: { error: { details: { max: string } } } };
    expect(payload.meta.error.details.max).toBe('50000');
  });

  it('rejects an unsupported content type', async () => {
    const response = await server.request('/v1/analyze/readability', {
      method: 'POST',
      headers: { 'content-type': 'application/xml' },
      body: '<text/>',
    });
    expect(response.status).toBe(415);
  });
});

describe('GET /v1/analyze/vocabulary', () => {
  it('profiles a text against the Cambridge headword list', async () => {
    const response = await server.json<{
      cambridgeMatches: number;
      matched: { word: string }[];
      lexicalDensity: number;
    }>(`/v1/analyze/vocabulary?text=${encoded}&sample=3`);
    expect(response.status).toBe(200);
    expect(response.data.lexicalDensity).toBeGreaterThan(0);
    expect(response.data.matched.length).toBeLessThanOrEqual(3);
    expect(response.meta.referenceList).toContain('Cambridge');
  });

  it('rejects an out-of-range sample size', async () => {
    const response = await server.request(`/v1/analyze/vocabulary?text=${encoded}&sample=999`);
    expect(response.status).toBe(400);
  });

  it('rejects text with nothing to profile', async () => {
    const response = await server.request('/v1/analyze/vocabulary?text=98765');
    expect(response.status).toBe(422);
  });
});

describe('GET /v1/analyze/cohesion', () => {
  it('inventories the cohesive devices in a text', async () => {
    const response = await server.json<{
      words: number;
      total: number;
      devices: { phrase: string; relation: string }[];
      missingRelations: string[];
    }>(`/v1/analyze/cohesion?text=${encoded}`);
    expect(response.status).toBe(200);
    expect(response.data.words).toBeGreaterThan(0);
    expect(response.data.devices.some((device) => device.phrase === 'however')).toBe(true);
    expect(response.meta.inventorySize).toBeGreaterThan(50);
  });

  it('rejects text with nothing to scan', async () => {
    const response = await server.request('/v1/analyze/cohesion?text=4444');
    expect(response.status).toBe(422);
  });
});

describe('GET /v1/analyze/writing', () => {
  const essay = [
    'Some people believe governments should fund public transport rather than new roads.',
    '',
    'Firstly, public transport moves far more people for each unit of scarce road space.',
    '',
    'In conclusion, sustained investment in public transport is the more responsible policy.',
  ].join('\n');

  it('defaults to Task 2 and never returns a band score', async () => {
    const response = await server.json<{
      task: string;
      minimumWords: number;
      observations: { criterion: string }[];
    }>(`/v1/analyze/writing?text=${encodeURIComponent(essay)}`);
    expect(response.status).toBe(200);
    expect(response.data.task).toBe('task-2');
    expect(response.data.minimumWords).toBe(250);
    expect(response.data.observations.length).toBeGreaterThan(0);
    expect(response.meta.notABandScore).toContain('never returns a band score');
  });

  it('accepts an explicit task', async () => {
    const response = await server.json<{ task: string; minimumWords: number }>(
      `/v1/analyze/writing?task=task-1&text=${encodeURIComponent(essay)}`,
    );
    expect(response.data.task).toBe('task-1');
    expect(response.data.minimumWords).toBe(150);
  });

  it('rejects an unknown task', async () => {
    const response = await server.request(`/v1/analyze/writing?task=task-3&text=${encoded}`);
    expect(response.status).toBe(400);
  });

  it('rejects a response with nothing to analyse', async () => {
    const response = await server.request('/v1/analyze/writing?text=2024');
    expect(response.status).toBe(422);
  });

  it('accepts a long response as a POST body', async () => {
    const response = await server.request('/v1/analyze/writing?task=task-2', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `${essay}\n\n${'Investment pays off over time. '.repeat(60)}` }),
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { data: { meetsMinimumLength: boolean } };
    expect(payload.data.meetsMinimumLength).toBe(true);
  });
});

describe('GET /v1/analyze/devices', () => {
  it('lists the whole inventory', async () => {
    const response = await server.json<{ phrase: string }[]>('/v1/analyze/devices');
    expect(response.data.length).toBe(response.meta.count);
    expect(response.meta.relation).toBeNull();
    expect(response.meta.register).toBeNull();
  });

  it('filters by relation and register', async () => {
    const response = await server.json<{ relation: string; register: string }[]>(
      '/v1/analyze/devices?relation=contrast&register=academic',
    );
    expect(response.data.length).toBeGreaterThan(0);
    for (const device of response.data) {
      expect(device.relation).toBe('contrast');
      expect(device.register).toBe('academic');
    }
  });

  it('rejects an unknown relation', async () => {
    const response = await server.request('/v1/analyze/devices?relation=nonsense');
    expect(response.status).toBe(400);
  });

  it('does not accept a body', async () => {
    const response = await server.request('/v1/analyze/devices', { method: 'POST', body: 'x' });
    expect(response.status).toBe(405);
  });
});
