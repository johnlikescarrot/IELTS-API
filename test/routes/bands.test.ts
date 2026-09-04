import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { BandDescriptor, BandScaleEntry } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/bands', () => {
  it('returns the whole scale', async () => {
    const response = await server.json<BandScaleEntry[]>('/v1/bands');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(19);
    expect(response.meta.count).toBe(19);
    expect(response.meta.step).toBe(0.5);
  });
});

describe('GET /v1/bands/descriptors', () => {
  it('defaults to the speaking criteria', async () => {
    const response = await server.json<BandDescriptor[]>('/v1/bands/descriptors');
    expect(response.data).toHaveLength(40);
    expect(response.meta.set).toBe('speaking');
    expect(response.meta.criterion).toBeNull();
  });

  it('filters by set', async () => {
    const response = await server.json<BandDescriptor[]>('/v1/bands/descriptors?set=writing-task-2');
    expect(response.data).toHaveLength(40);
    expect(response.data.every((row) => row.set === 'writing-task-2')).toBe(true);
  });

  it('filters by criterion', async () => {
    const response = await server.json<BandDescriptor[]>('/v1/bands/descriptors?criterion=pronunciation');
    expect(response.data).toHaveLength(10);
    expect(response.meta.criterion).toBe('pronunciation');
  });

  it('filters by band', async () => {
    const response = await server.json<BandDescriptor[]>('/v1/bands/descriptors?set=speaking&band=9');
    expect(response.data).toHaveLength(4);
    expect(response.meta.band).toBe(9);
  });

  it('rejects an unknown set', async () => {
    expect((await server.json('/v1/bands/descriptors?set=listening')).status).toBe(400);
  });

  it('rejects an out-of-range band', async () => {
    expect((await server.json('/v1/bands/descriptors?band=10')).status).toBe(400);
  });
});

describe('GET /v1/bands/:band', () => {
  it('returns a whole band with its four descriptors', async () => {
    const response = await server.json<{
      band: number;
      cefr: string;
      descriptors: BandDescriptor[];
      bracketDescriptors: BandDescriptor[];
    }>('/v1/bands/7');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7);
    expect(response.data.cefr).toBe('C1');
    expect(response.data.descriptors).toHaveLength(12);
    expect(response.data.bracketDescriptors).toEqual([]);
    expect(response.meta.bracket).toEqual([7]);
  });

  it('brackets half bands between two whole bands', async () => {
    const response = await server.json<{
      descriptors: BandDescriptor[];
      bracketDescriptors: BandDescriptor[];
    }>('/v1/bands/7.5');
    expect(response.meta.bracket).toEqual([7, 8]);
    expect(response.data.descriptors).toEqual([]);
    expect(response.data.bracketDescriptors).toHaveLength(24);
    expect(response.data.bracketDescriptors.every((row) => row.band === 7 || row.band === 8)).toBe(true);
  });

  it('returns 404 for a band outside the scale', async () => {
    expect((await server.json('/v1/bands/9.5')).status).toBe(404);
  });

  it('returns 400 for a malformed band', async () => {
    expect((await server.json('/v1/bands/seven')).status).toBe(400);
  });
});
