import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DATASET_IDS } from '../../src/data/provenance.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { DatasetRecord } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/datasets', () => {
  it('lists every dataset with provenance metadata', async () => {
    const response = await server.json<DatasetRecord[]>('/v1/datasets');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(DATASET_IDS.length);
    expect(response.meta.count).toBe(DATASET_IDS.length);
    expect(response.meta.total).toBe(DATASET_IDS.length);
    expect(response.meta.derivation).toBeNull();
    expect(response.meta.licenses).toEqual({ code: 'MIT', data: 'CC BY 4.0' });
    expect(response.meta.digest).toContain('sha256');
    const vocabulary = response.data.find((record) => record.id === 'vocabulary');
    expect(vocabulary?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('filters by derivation', async () => {
    const response = await server.json<DatasetRecord[]>('/v1/datasets?derivation=extracted');
    expect(response.data.every((record) => record.derivation === 'extracted')).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.derivation).toBe('extracted');
  });

  it('rejects an unknown derivation', async () => {
    const response = await server.json('/v1/datasets?derivation=guessed');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('must be one of');
  });

  it('searches names and descriptions', async () => {
    const response = await server.json<DatasetRecord[]>('/v1/datasets?q=readability');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.id).toBe('practice-tests');
  });

  it('combines a search with a derivation filter', async () => {
    const response = await server.json<DatasetRecord[]>('/v1/datasets?q=vocabulary&derivation=original');
    expect(response.data.every((record) => record.derivation === 'original')).toBe(true);
  });
});

describe('GET /v1/datasets/:id', () => {
  it('returns one provenance record', async () => {
    const response = await server.json<DatasetRecord>('/v1/datasets/raw-scores');
    expect(response.status).toBe(200);
    expect(response.data.name).toContain('Raw-score');
    expect(response.data.endpoints).toContain('/v1/scores/raw');
    expect(response.meta.licenses).toEqual({ code: 'MIT', data: 'CC BY 4.0' });
  });

  it('matches identifiers case-insensitively', async () => {
    const response = await server.json<DatasetRecord>('/v1/datasets/VOCABULARY');
    expect(response.data.id).toBe('vocabulary');
  });

  it('404s for an unknown dataset', async () => {
    const response = await server.json('/v1/datasets/does-not-exist');
    expect(response.status).toBe(404);
    const error = response.meta.error as { details: Record<string, string> };
    expect(error.details.known).toContain('vocabulary');
  });
});
