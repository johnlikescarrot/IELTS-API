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
  it('converts a Listening raw score into a band', async () => {
    const response = await server.json<{
      band: number;
      cefr: string;
      percentage: number;
      extrapolated: boolean;
      marksToNextBand: { band: number; marksNeeded: number } | null;
    }>('/v1/scores/raw?paper=listening&correct=30');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(7);
    expect(response.data.cefr).toBe('C1');
    expect(response.data.percentage).toBe(75);
    expect(response.data.extrapolated).toBe(false);
    expect(response.data.marksToNextBand).toEqual({ band: 7.5, minCorrect: 32, marksNeeded: 2 });
    expect(response.meta.note).toContain('Indicative');
  });

  it('applies the stricter General Training table', async () => {
    const academic = await server.json<{ band: number }>('/v1/scores/raw?paper=academic-reading&correct=30');
    const general = await server.json<{ band: number }>('/v1/scores/raw?paper=general-reading&correct=30');
    expect(academic.data.band).toBe(7);
    expect(general.data.band).toBe(6);
  });

  it('accepts a blank sheet and reports band 0', async () => {
    const response = await server.json<{ band: number; marksToNextBand: unknown }>(
      '/v1/scores/raw?paper=listening&correct=0',
    );
    expect(response.data.band).toBe(0);
    expect(response.data.marksToNextBand).not.toBeNull();
  });

  it('flags an extrapolated row and says so in the metadata', async () => {
    const response = await server.json<{ extrapolated: boolean }>('/v1/scores/raw?paper=listening&correct=2');
    expect(response.data.extrapolated).toBe(true);
    expect(response.meta.extrapolation).toContain('must not be quoted');
  });

  it('reports a full mark as band 9 with nothing above it', async () => {
    const response = await server.json<{ band: number; marksToNextBand: unknown }>(
      '/v1/scores/raw?paper=listening&correct=40',
    );
    expect(response.data.band).toBe(9);
    expect(response.data.marksToNextBand).toBeNull();
  });

  it('requires the paper', async () => {
    const response = await server.request('/v1/scores/raw?correct=30');
    expect(response.status).toBe(400);
  });

  it('requires the raw score', async () => {
    const response = await server.request('/v1/scores/raw?paper=listening');
    expect(response.status).toBe(400);
  });

  it('rejects a raw score above 40', async () => {
    const response = await server.request('/v1/scores/raw?paper=listening&correct=41');
    expect(response.status).toBe(400);
  });

  it('rejects an unknown paper', async () => {
    const response = await server.request('/v1/scores/raw?paper=writing&correct=30');
    expect(response.status).toBe(400);
  });
});

describe('GET /v1/scores/raw/tables', () => {
  it('publishes all three tables by default', async () => {
    const response = await server.json<{ paper: string; rows: unknown[] }[]>('/v1/scores/raw/tables');
    expect(response.data).toHaveLength(3);
    expect(response.meta.paper).toBeNull();
    expect(response.data[0]?.rows.length).toBeGreaterThan(10);
  });

  it('filters to one table', async () => {
    const response = await server.json<{ paper: string }[]>('/v1/scores/raw/tables?paper=general-reading');
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.paper).toBe('general-reading');
  });

  it('is routed before the parameterised raw endpoint', async () => {
    const response = await server.json('/v1/scores/raw/tables');
    expect(response.meta.endpoint).toBe('/v1/scores/raw/tables');
  });
});

describe('GET /v1/scores/mock', () => {
  it('turns a whole sitting into a report form', async () => {
    const response = await server.json<{
      overall: number;
      papers: { reading: { paper: string; band: number } };
      limitingSkills: string[];
    }>('/v1/scores/mock?listeningCorrect=30&readingCorrect=27&writing=6&speaking=6.5');
    expect(response.status).toBe(200);
    expect(response.data.papers.reading).toMatchObject({ paper: 'academic-reading', band: 6.5 });
    expect(response.data.overall).toBe(6.5);
    expect(response.data.limitingSkills).toEqual(['writing']);
    expect(response.meta.readingTable).toBe('academic-reading');
  });

  it('switches to the General Training reading table', async () => {
    const response = await server.json<{ papers: { reading: { paper: string; band: number } } }>(
      '/v1/scores/mock?module=general-training&listeningCorrect=30&readingCorrect=27&writing=6&speaking=6',
    );
    expect(response.data.papers.reading).toMatchObject({ paper: 'general-reading', band: 5.5 });
  });

  it('names every limiting skill when components tie', async () => {
    const response = await server.json<{ limitingSkills: string[] }>(
      '/v1/scores/mock?listeningCorrect=23&readingCorrect=23&writing=6&speaking=6',
    );
    expect(response.data.limitingSkills).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });

  it('labels the General Training writing paper', async () => {
    const response = await server.json<{ papers: { writing: { paper: string } } }>(
      '/v1/scores/mock?module=general-training&listeningCorrect=30&readingCorrect=30&writing=7&speaking=7',
    );
    expect(response.data.papers.writing.paper).toBe('general-writing');
  });

  it('requires both raw scores', async () => {
    expect((await server.request('/v1/scores/mock?readingCorrect=27&writing=6&speaking=6')).status).toBe(400);
    expect((await server.request('/v1/scores/mock?listeningCorrect=27&writing=6&speaking=6')).status).toBe(
      400,
    );
  });

  it('requires the two marked bands', async () => {
    const response = await server.request('/v1/scores/mock?listeningCorrect=30&readingCorrect=27&writing=6');
    expect(response.status).toBe(400);
  });

  it('rejects a writing band that is not reportable', async () => {
    const response = await server.request(
      '/v1/scores/mock?listeningCorrect=30&readingCorrect=27&writing=6.2&speaking=6',
    );
    expect(response.status).toBe(400);
  });
});
