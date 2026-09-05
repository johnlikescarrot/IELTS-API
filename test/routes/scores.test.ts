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

interface RawScore {
  paper: string;
  module: string;
  raw: number;
  rawMax: number;
  band: number | null;
  range: [number, number] | null;
  display: string | null;
  cefr: string | null;
  nextBand: number | null;
  marksToNextBand: number | null;
  matched: boolean;
}

describe('GET /v1/scores/raw', () => {
  it('converts a listening raw mark with its range and next-band distance', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?paper=listening&raw=32');
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      paper: 'listening',
      module: 'both',
      raw: 32,
      rawMax: 40,
      band: 7.5,
      range: [32, 34],
      display: '32–34',
      cefr: 'C1',
      nextBand: 8,
      marksToNextBand: 3,
      matched: true,
    });
    expect(response.meta.note).toContain('vary slightly');
  });

  it('applies the higher general-training thresholds to the same raw mark', async () => {
    const academic = await server.json<RawScore>('/v1/scores/raw?paper=academic-reading&raw=30');
    expect(academic.data.band).toBe(7);
    const general = await server.json<RawScore>('/v1/scores/raw?paper=general-reading&raw=30');
    expect(general.data.band).toBe(6);
    expect(general.data.marksToNextBand).toBe(2);
  });

  it('reports the ceiling without a next band', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?paper=general-reading&raw=40');
    expect(response.data.band).toBe(9);
    expect(response.data.display).toBe('40');
    expect(response.data.nextBand).toBeNull();
    expect(response.data.marksToNextBand).toBeNull();
  });

  it('leaves marks below the published floor unmatched with the distance to band', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?paper=listening&raw=10');
    expect(response.data.matched).toBe(false);
    expect(response.data.band).toBeNull();
    expect(response.data.range).toBeNull();
    expect(response.data.nextBand).toBe(4);
    expect(response.data.marksToNextBand).toBe(1);
    expect(response.meta.note).toContain('below the lowest published row');
  });

  it('requires paper and raw', async () => {
    const missingPaper = await server.json('/v1/scores/raw?raw=30');
    expect(missingPaper.status).toBe(400);
    expect((missingPaper.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'listening',
    );
    expect((await server.json('/v1/scores/raw?paper=listening')).status).toBe(400);
  });

  it('rejects unknown papers and out-of-range or fractional marks', async () => {
    expect((await server.json('/v1/scores/raw?paper=speaking&raw=30')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&raw=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&raw=-1')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&raw=30.5')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&raw=many')).status).toBe(400);
  });
});

describe('GET /v1/scores/tables', () => {
  it('publishes every raw-score table with provenance', async () => {
    const response =
      await server.json<
        { id: string; entries: { band: number; min: number; max: number }[]; sourceUrl: string }[]
      >('/v1/scores/tables');
    expect(response.status).toBe(200);
    expect(response.data.map((table) => table.id)).toEqual([
      'listening',
      'academic-reading',
      'general-reading',
    ]);
    expect(response.meta.count).toBe(3);
    for (const table of response.data) {
      expect(table.entries.length).toBeGreaterThan(10);
      expect(table.sourceUrl).toContain('https://');
    }
  });
});
