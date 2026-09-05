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
  component: string;
  raw: number;
  outOf: number;
  accuracy: number;
  band: number;
  range: { min: number; max: number };
  basis: string;
  disagreement: string | null;
  nextBand: { band: number; raw: number; additionalCorrect: number } | null;
  marginToLoseBand: number | null;
  cefr: string;
  table: string;
}

describe('GET /v1/scores/raw', () => {
  it('converts a Listening raw score', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=listening&raw=30');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7);
    expect(response.data.outOf).toBe(40);
    expect(response.data.accuracy).toBe(0.75);
    expect(response.data.cefr).toBe('C1');
    expect(response.meta.provenance).toBe('indicative');
  });

  it('converts the same raw score differently for the two Reading modules', async () => {
    const academic = await server.json<RawScore>('/v1/scores/raw?component=reading-academic&raw=30');
    const general = await server.json<RawScore>('/v1/scores/raw?component=reading-general-training&raw=30');
    expect(academic.data.band).toBe(7);
    expect(general.data.band).toBe(6);
  });

  it('reports the marginal cost of the next half band', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=reading-academic&raw=28');
    expect(response.data.nextBand).toEqual({ band: 7, raw: 30, additionalCorrect: 2 });
    expect(response.data.marginToLoseBand).toBe(1);
  });

  it('reports no next band at the top of the scale', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=listening&raw=40');
    expect(response.data.band).toBe(9);
    expect(response.data.nextBand).toBeNull();
  });

  it('surfaces a contested boundary and the basis of the row', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=listening&raw=30');
    expect(response.data.disagreement).toContain('older');
    expect(response.meta.basis).toBe('published');
  });

  it('flags an extrapolated boundary', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=listening&raw=5');
    expect(response.data.basis).toBe('extrapolated');
  });

  it('accepts a raw score of zero', async () => {
    const response = await server.json<RawScore>('/v1/scores/raw?component=listening&raw=0');
    expect(response.data.band).toBe(0);
    expect(response.data.marginToLoseBand).toBeNull();
  });

  it('requires the component', async () => {
    const response = await server.json('/v1/scores/raw?raw=30');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'listening',
    );
  });

  it('requires the raw score', async () => {
    const response = await server.json('/v1/scores/raw?component=listening');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('raw');
  });

  it('rejects an unknown component', async () => {
    expect((await server.json('/v1/scores/raw?component=writing&raw=30')).status).toBe(400);
  });

  it('rejects a raw score above the number of questions', async () => {
    const response = await server.json('/v1/scores/raw?component=listening&raw=99');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('outside the');
  });

  it('rejects a negative and a non-integer raw score', async () => {
    expect((await server.json('/v1/scores/raw?component=listening&raw=-1')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?component=listening&raw=7.5')).status).toBe(400);
  });
});

describe('GET /v1/scores/tables', () => {
  it('publishes all three conversion tables', async () => {
    const response = await server.json<{ component: string; rows: unknown[] }[]>('/v1/scores/tables');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.questions).toBe(40);
    expect(response.meta.component).toBeNull();
  });

  it('counts the extrapolated and contested rows', async () => {
    const response = await server.json('/v1/scores/tables');
    expect(response.meta.extrapolatedRows).toBeGreaterThan(0);
    expect(response.meta.contestedRows).toBeGreaterThan(0);
  });

  it('restricts the response to one table', async () => {
    const response = await server.json<{ component: string }[]>(
      '/v1/scores/tables?component=reading-academic',
    );
    expect(response.data).toHaveLength(1);
    expect(response.data[0]!.component).toBe('reading-academic');
    expect(response.meta.component).toBe('reading-academic');
  });

  it('rejects an unknown component', async () => {
    expect((await server.json('/v1/scores/tables?component=speaking')).status).toBe(400);
  });
});
