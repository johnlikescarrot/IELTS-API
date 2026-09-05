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
  it('converts Listening marks to a band and reports the margins', async () => {
    const response = await server.json<{
      band: number;
      matched: boolean;
      row: { min: number; max: number; band: number };
      oneBandAhead: { band: number; correct: number };
      oneBandBehind: { band: number; correct: number };
    }>('/v1/scores/raw?skill=listening&correct=27');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(6.5);
    expect(response.data.matched).toBe(true);
    expect(response.data.row).toEqual({ min: 26, max: 29, band: 6.5 });
    expect(response.data.oneBandAhead).toEqual({ band: 7, correct: 30 });
    expect(response.data.oneBandBehind).toEqual({ band: 6, correct: 25 });
    expect(response.meta.questions).toBe(40);
  });

  it('uses the module-specific Reading table', async () => {
    const academic = await server.json<{ band: number }>(
      '/v1/scores/raw?skill=reading&module=academic&correct=39',
    );
    expect(academic.data.band).toBe(9);
    const general = await server.json<{ band: number }>(
      '/v1/scores/raw?skill=reading&module=general-training&correct=39',
    );
    expect(general.data.band).toBe(8.5);
  });

  it('accepts a module for Listening but reports the shared table', async () => {
    const response = await server.json<{ module: null }>(
      '/v1/scores/raw?skill=listening&module=general-training&correct=30',
    );
    expect(response.status).toBe(200);
    expect(response.data.module).toBeNull();
  });

  it('reports scores below the published rows without inventing a band', async () => {
    const response = await server.json<{
      band: number | null;
      oneBandAhead: { band: number; correct: number };
    }>('/v1/scores/raw?skill=listening&correct=3');
    expect(response.data.band).toBeNull();
    expect(response.data.oneBandAhead).toEqual({ band: 3, correct: 6 });
  });

  it('requires skill, module for reading, and correct', async () => {
    expect((await server.json('/v1/scores/raw?correct=27')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?skill=writing&correct=27')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?skill=reading&correct=27')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?skill=listening')).status).toBe(400);
  });

  it('rejects out-of-range correct counts', async () => {
    expect((await server.json('/v1/scores/raw?skill=listening&correct=41')).status).toBe(400);
  });
});

describe('GET /v1/scores/raw/tables', () => {
  it('serves every conversion table with provenance', async () => {
    const response =
      await server.json<{ id: string; rows: { min: number; max: number; band: number }[] }[]>(
        '/v1/scores/raw/tables',
      );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.data.map((table) => table.id)).toEqual([
      'listening',
      'reading-academic',
      'reading-general-training',
    ]);
    expect(response.data.every((table) => table.rows.length > 10)).toBe(true);
    expect(response.meta.total).toBe(3);
    expect(String(response.meta.note)).toContain('Indicative conversion');
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
