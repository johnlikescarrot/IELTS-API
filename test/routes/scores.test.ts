import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { RawScoreResult, RawScoreTable, TargetAnalysis } from '../../src/types.js';

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

describe('GET /v1/scores/raw', () => {
  it('converts a Listening raw score into a band', async () => {
    const response = await server.json<RawScoreResult>('/v1/scores/raw?paper=listening&score=30');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7);
    expect(response.data.range).toBe('30–31');
    expect(response.data.matched).toBe(true);
    expect(response.data.percentCorrect).toBe(75);
    expect(response.data.cefr).toBe('C1');
    expect(response.data.nextBand).toEqual({ band: 7.5, rawScore: 32, marksNeeded: 2 });
    expect(response.meta.note).toContain('Indicative');
    expect(response.meta.unmatched).toBeNull();
  });

  it('applies the stricter General Training table', async () => {
    const academic = await server.json<RawScoreResult>('/v1/scores/raw?paper=reading-academic&score=30');
    const general = await server.json<RawScoreResult>('/v1/scores/raw?paper=reading-general&score=30');
    expect(academic.data.band).toBe(7);
    expect(general.data.band).toBe(6);
  });

  it('reports no next band at the top of the scale', async () => {
    const response = await server.json<RawScoreResult>('/v1/scores/raw?paper=listening&score=40');
    expect(response.data.band).toBe(9);
    expect(response.data.nextBand).toBeNull();
    expect(response.data.percentCorrect).toBe(100);
  });

  it('reports raw scores below the published range as unmatched', async () => {
    const response = await server.json<RawScoreResult>('/v1/scores/raw?paper=listening&score=2');
    expect(response.data.matched).toBe(false);
    expect(response.data.band).toBeNull();
    expect(response.data.range).toBeNull();
    expect(response.data.cefr).toBeNull();
    expect(response.data.nextBand).toBeNull();
    expect(response.meta.unmatched).toContain('below the lowest published row');
  });

  it('requires the paper', async () => {
    const response = await server.json('/v1/scores/raw?score=30');
    expect(response.status).toBe(400);
    const error = response.meta.error as { details: Record<string, string> };
    expect(error.details.allowed).toContain('reading-general');
  });

  it('requires the score', async () => {
    const response = await server.json('/v1/scores/raw?paper=listening');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('"score" is required');
  });

  it('rejects an unknown paper and an out-of-range score', async () => {
    expect((await server.json('/v1/scores/raw?paper=writing&score=30')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&score=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?paper=listening&score=-1')).status).toBe(400);
  });
});

describe('GET /v1/scores/raw-tables', () => {
  it('publishes every table', async () => {
    const response = await server.json<RawScoreTable[]>('/v1/scores/raw-tables');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    expect(response.meta.count).toBe(3);
    expect(response.meta.maximum).toBe(40);
    expect(response.data[0]?.bands[0]?.band).toBe(9);
  });

  it('restricts the response to one paper', async () => {
    const response = await server.json<RawScoreTable[]>('/v1/scores/raw-tables?paper=reading-general');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.module).toBe('general-training');
  });

  it('rejects an unknown paper', async () => {
    expect((await server.json('/v1/scores/raw-tables?paper=speaking')).status).toBe(400);
  });
});

describe('GET /v1/scores/target', () => {
  it('reports a target that is already met', async () => {
    const response = await server.json<TargetAnalysis>(
      '/v1/scores/target?target=7&listening=7&reading=7&writing=7&speaking=7',
    );
    expect(response.status).toBe(200);
    expect(response.data.met).toBe(true);
    expect(response.data.pointsNeeded).toBe(0);
    expect(response.data.balanced).toBeNull();
    expect(response.meta.rule).toContain('rounded to the nearest half band');
  });

  it('names the cheapest route to the target', async () => {
    const response = await server.json<TargetAnalysis>(
      '/v1/scores/target?target=7&listening=7&reading=7&writing=6&speaking=6.5',
    );
    expect(response.data.met).toBe(false);
    expect(response.data.current).toBe(6.5);
    expect(response.data.cheapest?.lift).toBe(0.5);
    expect(response.data.routes).toHaveLength(4);
    expect(response.meta.method).toContain('lowest reportable band');
  });

  it('falls back to a balanced lift when no single component suffices', async () => {
    const response = await server.json<TargetAnalysis>(
      '/v1/scores/target?target=7&listening=5&reading=5&writing=5&speaking=5',
    );
    expect(response.data.cheapest).toBeNull();
    expect(response.data.balanced).toEqual({ listening: 7, reading: 7, writing: 7, speaking: 7 });
  });

  it('requires the target and all four components', async () => {
    expect((await server.json('/v1/scores/target?listening=7&reading=7&writing=7&speaking=7')).status).toBe(
      400,
    );
    expect((await server.json('/v1/scores/target?target=7&listening=7')).status).toBe(400);
  });

  it('rejects a target that is not a reportable band', async () => {
    const response = await server.json(
      '/v1/scores/target?target=7.2&listening=7&reading=7&writing=7&speaking=7',
    );
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('0.5 steps');
  });
});
