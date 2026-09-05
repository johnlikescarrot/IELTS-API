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

interface Overall {
  mean: number;
  overall: number;
  cefr: string;
  spread: number;
  explanation: string;
}

describe('GET /v1/scores/overall', () => {
  it('computes the overall band and the CEFR level', async () => {
    const response = await server.json<Overall>(
      '/v1/scores/overall?listening=7&reading=6.5&writing=6&speaking=7',
    );
    expect(response.status).toBe(200);
    expect(response.data.overall).toBe(6.5);
    expect(response.data.cefr).toBe('B2');
    expect(response.meta.rule).toContain('rounded to the nearest half band');
  });

  it('applies the IELTS tie-break rule', async () => {
    const response = await server.json<Overall>(
      '/v1/scores/overall?listening=7&reading=6&writing=6&speaking=6',
    );
    expect(response.data.mean).toBe(6.25);
    expect(response.data.overall).toBe(6.5);
    expect(response.data.explanation).toContain('rounds a .25/.75 mean up');
  });

  it('accepts band 0 for a component that was not attempted', async () => {
    const response = await server.json<Overall>(
      '/v1/scores/overall?listening=0&reading=0&writing=0&speaking=0',
    );
    expect(response.data.overall).toBe(0);
  });

  it('requires every component', async () => {
    const response = await server.json('/v1/scores/overall?listening=7');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('reading');
  });

  it('rejects non-band components', async () => {
    const response = await server.json('/v1/scores/overall?listening=7.25&reading=6&writing=6&speaking=6');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/scores/convert', () => {
  it('converts to CEFR', async () => {
    const response = await server.json<{ to: { value: string } }>('/v1/scores/convert?band=7&to=cefr');
    expect(response.status).toBe(200);
    expect(response.data.to.value).toBe('C1');
  });

  it('converts to a range scale', async () => {
    const response = await server.json<{ to: { value: [number, number]; display: string } }>(
      '/v1/scores/convert?band=7&to=toefl-ibt',
    );
    expect(response.data.to.value).toEqual([94, 101]);
    expect(response.data.to.display).toBe('94–101');
    expect(response.meta.note).toContain('Indicative concordance');
  });

  it('reports when a band has no published concordance', async () => {
    const response = await server.json<{ matched: boolean; to: { value: null } }>(
      '/v1/scores/convert?band=3&to=duolingo',
    );
    expect(response.data.matched).toBe(false);
    expect(response.data.to.value).toBeNull();
    expect(response.meta.note).toContain('No published concordance');
  });

  it('requires the target scale', async () => {
    const response = await server.json('/v1/scores/convert?band=7');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain('cefr');
  });

  it('requires the band', async () => {
    expect((await server.json('/v1/scores/convert?to=cefr')).status).toBe(400);
  });

  it('rejects unknown target scales', async () => {
    expect((await server.json('/v1/scores/convert?band=7&to=cambridge-fce')).status).toBe(400);
  });
});

describe('GET /v1/scores/raw', () => {
  interface RawLookup {
    module: { id: string; name: string; questions: number };
    correct: number;
    matched: boolean;
    band: number | null;
    cefr: string | null;
    row: { min: number; max: number; band: number } | null;
    nextBand: { band: number; correct: number; additionalNeeded: number } | null;
  }

  it('converts correct answers to a band with the gap to the next band', async () => {
    const response = await server.json<RawLookup>('/v1/scores/raw?module=listening&correct=30');
    expect(response.status).toBe(200);
    expect(response.data.matched).toBe(true);
    expect(response.data.band).toBe(7);
    expect(response.data.cefr).toBe('C1');
    expect(response.data.row).toEqual({ min: 30, max: 31, band: 7 });
    expect(response.data.nextBand).toEqual({ band: 7.5, correct: 32, additionalNeeded: 2 });
    expect(response.meta.sourceUrl).toContain('ielts.org');
  });

  it('reports no next band above band 9', async () => {
    const response = await server.json<RawLookup>('/v1/scores/raw?module=listening&correct=40');
    expect(response.data.band).toBe(9);
    expect(response.data.nextBand).toBeNull();
  });

  it('reports raw scores below the published floor as unmatched', async () => {
    const response = await server.json<RawLookup>('/v1/scores/raw?module=reading-general-training&correct=5');
    expect(response.status).toBe(200);
    expect(response.data.matched).toBe(false);
    expect(response.data.band).toBeNull();
    expect(response.data.cefr).toBeNull();
    expect(response.data.row).toBeNull();
    expect(response.meta.note).toContain('below the published table');
  });

  it('returns the full published table when no mark is supplied', async () => {
    interface RawTable {
      module: { id: string };
      floor: number;
      rows: { min: number; max: number; band: number; cefr: string }[];
    }
    const response = await server.json<RawTable>('/v1/scores/raw?module=reading-general-training');
    expect(response.status).toBe(200);
    expect(response.data.floor).toBe(4);
    expect(response.data.rows).toHaveLength(11);
    expect(response.data.rows[0]).toEqual({ min: 40, max: 40, band: 9, cefr: 'C2' });
  });

  it('reverses a band to the minimum correct answers required', async () => {
    interface RawReverse {
      band: number;
      matched: boolean;
      minCorrect: number | null;
    }
    const response = await server.json<RawReverse>('/v1/scores/raw?module=reading-general-training&band=7');
    expect(response.status).toBe(200);
    expect(response.data.matched).toBe(true);
    expect(response.data.minCorrect).toBe(34);
  });

  it('reports bands outside the table as unmatched', async () => {
    const response = await server.json<{ matched: boolean; minCorrect: number | null }>(
      '/v1/scores/raw?module=listening&band=3',
    );
    expect(response.status).toBe(200);
    expect(response.data.matched).toBe(false);
    expect(response.data.minCorrect).toBeNull();
    expect(response.meta.note).toContain('outside this table');
  });

  it('requires the module', async () => {
    const response = await server.json('/v1/scores/raw');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'listening',
    );
  });

  it('rejects unknown modules', async () => {
    expect((await server.json('/v1/scores/raw?module=writing&correct=30')).status).toBe(400);
  });

  it('rejects the combination of correct and band', async () => {
    expect((await server.json('/v1/scores/raw?module=listening&correct=30&band=7')).status).toBe(400);
  });

  it('rejects out-of-range or malformed marks and bands', async () => {
    expect((await server.json('/v1/scores/raw?module=listening&correct=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?module=listening&correct=abc')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?module=listening&band=7.25')).status).toBe(400);
  });
});

describe('GET /v1/scores/interpret', () => {
  it('maps a TOEFL score back to a band', async () => {
    const response = await server.json<{ matched: boolean; to: { band: number } }>(
      '/v1/scores/interpret?scale=toefl-ibt&score=95',
    );
    expect(response.data.matched).toBe(true);
    expect(response.data.to.band).toBe(7);
  });

  it('reports scores outside the published ranges', async () => {
    const response = await server.json<{ matched: boolean }>(
      '/v1/scores/interpret?scale=toefl-ibt&score=200',
    );
    expect(response.data.matched).toBe(false);
    expect(response.meta.note).toContain('outside the published');
  });

  it('reports scales that have no numeric ranges', async () => {
    const response = await server.json<{ matched: boolean }>('/v1/scores/interpret?scale=cefr&score=100');
    expect(response.data.matched).toBe(false);
  });

  it('requires scale and score', async () => {
    expect((await server.json('/v1/scores/interpret')).status).toBe(400);
    expect((await server.json('/v1/scores/interpret?scale=cefr')).status).toBe(400);
  });

  it('rejects unknown scales', async () => {
    expect((await server.json('/v1/scores/interpret?scale=nope&score=1')).status).toBe(400);
  });
});
