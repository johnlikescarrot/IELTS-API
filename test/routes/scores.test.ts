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

describe('GET /v1/scores/raw-to-band', () => {
  it('converts a listening raw score', async () => {
    const response = await server.json<{
      scale: string;
      raw: number;
      band: number;
      label: string;
      cefr: string;
      belowPublishedRows: boolean;
    }>('/v1/scores/raw-to-band?scale=listening&raw=30');
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      scale: 'listening',
      raw: 30,
      band: 7,
      label: 'Good user',
      cefr: 'C1',
      belowPublishedRows: false,
    });
    expect(response.meta.note).toContain('Indicative conversion');
  });

  it('converts academic and general training reading raw scores', async () => {
    const academic = await server.json<{ band: number }>(
      '/v1/scores/raw-to-band?scale=academic-reading&raw=33',
    );
    expect(academic.data.band).toBe(7.5);
    const general = await server.json<{ band: number }>(
      '/v1/scores/raw-to-band?scale=general-reading&raw=30',
    );
    expect(general.data.band).toBe(6);
  });

  it('flags raw scores below the published rows', async () => {
    const response = await server.json<{ band: number; belowPublishedRows: boolean }>(
      '/v1/scores/raw-to-band?scale=general-reading&raw=2',
    );
    expect(response.data.band).toBe(2);
    expect(response.data.belowPublishedRows).toBe(true);
  });

  it('requires scale and raw', async () => {
    expect((await server.json('/v1/scores/raw-to-band')).status).toBe(400);
    expect((await server.json('/v1/scores/raw-to-band?scale=listening')).status).toBe(400);
    expect((await server.json('/v1/scores/raw-to-band?raw=30')).status).toBe(400);
  });

  it('rejects unknown scales and out-of-range raw scores', async () => {
    expect((await server.json('/v1/scores/raw-to-band?scale=nope&raw=30')).status).toBe(400);
    expect((await server.json('/v1/scores/raw-to-band?scale=listening&raw=many')).status).toBe(400);
    expect((await server.json('/v1/scores/raw-to-band?scale=listening&raw=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw-to-band?scale=listening&raw=-1')).status).toBe(400);
  });
});

describe('GET /v1/scores/raw-tables', () => {
  it('lists every table expanded to one row per raw score', async () => {
    const response = await server.json<{
      tables: { scale: string; thresholds: unknown[]; rows: { raw: number; band: number }[] }[];
    }>('/v1/scores/raw-tables');
    expect(response.status).toBe(200);
    expect(response.data.tables).toHaveLength(3);
    for (const table of response.data.tables) {
      expect(table.rows).toHaveLength(41);
      expect(table.thresholds.length).toBeGreaterThan(5);
    }
    expect(response.meta.count).toBe(3);
  });

  it('restricts the listing to one scale', async () => {
    const response = await server.json<{ tables: { scale: string }[] }>(
      '/v1/scores/raw-tables?scale=listening',
    );
    expect(response.data.tables).toHaveLength(1);
    expect(response.data.tables[0]?.scale).toBe('listening');
    expect(response.meta.count).toBe(1);
  });

  it('rejects unknown scales', async () => {
    expect((await server.json('/v1/scores/raw-tables?scale=nope')).status).toBe(400);
  });
});
