import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { CatalogEntry } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

interface CollectionSummary {
  id: string;
  totalEntries: number;
  artifacts: { name: string; entriesAvailable: number }[];
  resolveEndpoint: string;
}

describe('GET /v1/catalog', () => {
  it('indexes the four collections with totals', async () => {
    const response = await server.json<{ id: string }[]>('/v1/catalog');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(4);
    expect(response.meta.entries).toBe(102 + 204 + 1232 + 315);
    expect(response.meta.availableFiles).toBe(4606);
    expect(response.meta.licenseNote).toContain('Metadata only');
    expect(response.meta.upstream).toContain('UPGRADE-YOUR-IELTS-SKILLS');
  });
});

describe('GET /v1/catalog/:collectionId', () => {
  it('summarises one collection', async () => {
    const response = await server.json<CollectionSummary>('/v1/catalog/listening-204-full-test');
    expect(response.status).toBe(200);
    expect(response.data.totalEntries).toBe(204);
    expect(response.data.resolveEndpoint).toBe('/v1/catalog/listening-204-full-test/entries/:index');
    const json = response.data.artifacts.find((artifact) => artifact.name === 'questionsJson');
    expect(json?.entriesAvailable).toBe(201);
  });

  it('404s on unknown collections', async () => {
    const response = await server.json('/v1/catalog/speaking-99-basic');
    expect(response.status).toBe(404);
  });
});

describe('GET /v1/catalog/:collectionId/entries/:index', () => {
  it('resolves a graded reading lesson from a global index', async () => {
    const response = await server.json<CatalogEntry>('/v1/catalog/reading-1232-basic/entries/200');
    expect(response.status).toBe(200);
    expect(response.data.level).toBe('B1-B2');
    expect(response.data.indexWithinLevel).toBe(2);
    const json = response.data.artifacts.find((artifact) => artifact.name === 'lessonJson');
    expect(json?.rawUrl).toContain('B1-B2/lesson_002.json');
    expect(json?.available).toBe(true);
  });

  it('exposes verified upstream gaps', async () => {
    const response = await server.json<CatalogEntry>('/v1/catalog/listening-204-full-test/entries/83');
    const audio = response.data.artifacts.find((artifact) => artifact.name === 'testAudio');
    expect(audio?.available).toBe(false);
    const player = response.data.artifacts.find((artifact) => artifact.name === 'testPlayer');
    expect(player?.available).toBe(true);
  });

  it('400s on non-numeric indexes and 404s on missing entries', async () => {
    expect((await server.json('/v1/catalog/listening-102-basic/entries/abc')).status).toBe(400);
    expect((await server.json('/v1/catalog/listening-102-basic/entries/0')).status).toBe(404);
    expect((await server.json('/v1/catalog/listening-102-basic/entries/103')).status).toBe(404);
    expect((await server.json('/v1/catalog/reading-315-full-test/entries/105')).status).toBe(404);
    expect((await server.json('/v1/catalog/nope/entries/1')).status).toBe(404);
  });
});
