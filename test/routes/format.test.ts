import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TEST_BLUEPRINTS } from '../../src/data/format.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { TestBlueprint } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

interface ResolvedBlueprint extends TestBlueprint {
  totalMinutes: number;
  minutesPerItem: number;
  questionTypes: { id: string }[];
  conversion: { component: string; name: string } | null;
}

describe('GET /v1/format', () => {
  it('lists every paper', async () => {
    const response = await server.json<TestBlueprint[]>('/v1/format');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(TEST_BLUEPRINTS.length);
    expect(response.meta.academicTestMinutes).toBe(160);
    expect(response.meta.skill).toBeNull();
  });

  it('filters by skill', async () => {
    const response = await server.json<TestBlueprint[]>('/v1/format?skill=writing');
    expect(response.data).toHaveLength(2);
    expect(response.data.every((blueprint) => blueprint.skill === 'writing')).toBe(true);
    expect(response.meta.skill).toBe('writing');
  });

  it('rejects an unknown skill', async () => {
    expect((await server.json('/v1/format?skill=grammar')).status).toBe(400);
  });
});

describe('GET /v1/format/:module', () => {
  it('resolves an objectively marked paper with its conversion table', async () => {
    const response = await server.json<ResolvedBlueprint>('/v1/format/reading-academic');
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('Academic Reading');
    expect(response.data.totalMinutes).toBe(60);
    expect(response.data.minutesPerItem).toBe(1.5);
    expect(response.data.questionTypes).toHaveLength(11);
    expect(response.data.conversion?.component).toBe('reading-academic');
    expect(response.meta.conversionEndpoint).toBe('/v1/scores/raw?component=reading-academic');
  });

  it('adds the transfer time to the Listening total', async () => {
    const response = await server.json<ResolvedBlueprint>('/v1/format/listening');
    expect(response.data.totalMinutes).toBe(40);
    expect(response.data.questionTypes).toHaveLength(6);
  });

  it('reports no conversion table for an examiner-rated paper', async () => {
    const response = await server.json<ResolvedBlueprint>('/v1/format/speaking');
    expect(response.data.conversion).toBeNull();
    expect(response.data.questionTypes).toHaveLength(0);
    expect(response.meta.conversionEndpoint).toBeNull();
    expect(response.meta.scoring).toBe('analytic');
  });

  it('resolves every advertised module', async () => {
    for (const blueprint of TEST_BLUEPRINTS) {
      const response = await server.json<ResolvedBlueprint>(`/v1/format/${blueprint.module}`);
      expect(response.status, blueprint.module).toBe(200);
    }
  });

  it('404s on an unknown module', async () => {
    const response = await server.json('/v1/format/reading-intergalactic');
    expect(response.status).toBe(404);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'listening',
    );
  });
});
