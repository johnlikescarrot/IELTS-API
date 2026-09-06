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

describe('GET /v1/scores/raw', () => {
  it('serves the three published conversion tables', async () => {
    const response = await server.json<{ tables: { test: string; rows: unknown[] }[] }>('/v1/scores/raw');
    expect(response.status).toBe(200);
    expect(response.data.tables.map((table) => table.test)).toEqual([
      'listening',
      'academic-reading',
      'general-training-reading',
    ]);
    expect(response.data.tables[0]?.rows).toHaveLength(14);
    expect(response.meta.note).toContain('One mark per correct answer');
  });
});

describe('GET /v1/scores/raw/convert', () => {
  it('converts 32/40 on Listening to band 7.5 with the CEFR level', async () => {
    const response = await server.json<{ band: number; range: [number, number]; cefr: string }>(
      '/v1/scores/raw/convert?test=listening&correct=32',
    );
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7.5);
    expect(response.data.range).toEqual([32, 34]);
    expect(response.data.cefr).toBe('C1');
    expect(response.meta.note).toContain('Representative published conversion');
  });

  it('applies the stricter General Training table', async () => {
    const response = await server.json<{ band: number; name: string }>(
      '/v1/scores/raw/convert?test=general-training-reading&correct=30',
    );
    expect(response.data.band).toBe(6.0);
    expect(response.data.name).toContain('General Training');
  });

  it('reports null below the published floor with an explaining note', async () => {
    const response = await server.json<{ band: number | null; belowFloor: boolean }>(
      '/v1/scores/raw/convert?test=listening&correct=2',
    );
    expect(response.status).toBe(200);
    expect(response.data.band).toBeNull();
    expect(response.data.belowFloor).toBe(true);
    expect(response.meta.note).toContain('below the published floor');
  });

  it('requires test and correct', async () => {
    expect((await server.json('/v1/scores/raw/convert')).status).toBe(400);
    expect((await server.json('/v1/scores/raw/convert?test=listening')).status).toBe(400);
    expect((await server.json('/v1/scores/raw/convert?correct=30')).status).toBe(400);
  });

  it('rejects unknown papers, non-integers and out-of-range scores', async () => {
    expect((await server.json('/v1/scores/raw/convert?test=writing&correct=30')).status).toBe(400);
    expect((await server.json('/v1/scores/raw/convert?test=listening&correct=thirty')).status).toBe(400);
    expect((await server.json('/v1/scores/raw/convert?test=listening&correct=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw/convert?test=listening&correct=-1')).status).toBe(400);
  });
});

describe('GET /v1/scores/mock-report', () => {
  it('converts raw papers, folds in examiner bands and reports the overall', async () => {
    const response = await server.json<{
      overall: number;
      cefr: string;
      weakestSkills: string[];
      components: { skill: string; band: number }[];
    }>('/v1/scores/mock-report?listeningCorrect=32&readingCorrect=30&writing=6&speaking=6');
    expect(response.status).toBe(200);
    expect(response.data.components.map((component) => component.band)).toEqual([7.5, 7.0, 6, 6]);
    expect(response.data.overall).toBe(6.5);
    expect(response.data.cefr).toBe('B2');
    expect(response.data.weakestSkills).toEqual(['writing', 'speaking']);
  });

  it('withholds the overall when only the objective papers are reported', async () => {
    const response = await server.json<{ overall: number | null; explanation: string }>(
      '/v1/scores/mock-report?listeningCorrect=30&readingCorrect=30',
    );
    expect(response.status).toBe(200);
    expect(response.data.overall).toBeNull();
    expect(response.data.explanation).toContain('withheld');
  });

  it('uses the General Training reading table when asked', async () => {
    const response = await server.json<{ components: { band: number | null }[] }>(
      '/v1/scores/mock-report?module=general-training&listeningCorrect=35&readingCorrect=34&writing=7&speaking=7',
    );
    expect(response.data.components[1]?.band).toBe(7.0);
  });

  it('requires the two objective raw scores', async () => {
    expect((await server.json('/v1/scores/mock-report')).status).toBe(400);
    expect((await server.json('/v1/scores/mock-report?listeningCorrect=30')).status).toBe(400);
    expect((await server.json('/v1/scores/mock-report?readingCorrect=30')).status).toBe(400);
  });

  it('rejects malformed module and examiner bands', async () => {
    expect(
      (await server.json('/v1/scores/mock-report?module=nope&listeningCorrect=30&readingCorrect=30')).status,
    ).toBe(400);
    expect(
      (await server.json('/v1/scores/mock-report?listeningCorrect=30&readingCorrect=30&writing=6.25')).status,
    ).toBe(400);
    expect(
      (await server.json('/v1/scores/mock-report?listeningCorrect=30&readingCorrect=30&speaking=abc')).status,
    ).toBe(400);
  });
});
