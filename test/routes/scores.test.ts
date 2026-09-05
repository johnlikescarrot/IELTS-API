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

interface RawConversion {
  module: string;
  moduleName: string;
  correct: number;
  outOf: number;
  scaledCorrect: number;
  percentage: number;
  band: number;
  cefr: string;
  label: string;
  bandRange: { minCorrect: number; maxCorrect: number };
  nextBand: { band: number; minCorrect: number; marksNeeded: number } | null;
  sensitivity: { minusOne: number | null; plusOne: number | null; stable: boolean };
  target: { band: number; minCorrect: number | null; marksNeeded: number | null; achieved: boolean } | null;
}

describe('GET /v1/scores/raw', () => {
  it('converts an Academic Reading raw score', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=reading-academic&correct=29');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(6.5);
    expect(response.data.moduleName).toBe('Academic Reading');
    expect(response.data.bandRange).toEqual({ minCorrect: 27, maxCorrect: 29 });
    expect(response.data.nextBand).toEqual({ band: 7, minCorrect: 30, marksNeeded: 1 });
    expect(response.meta.provenance).toBe('indicative-consensus');
    expect(response.meta.note).toContain('equates every test version separately');
  });

  it('applies a different table to General Training Reading', async () => {
    const academic = await server.json<RawConversion>('/v1/scores/raw?module=reading-academic&correct=30');
    const general = await server.json<RawConversion>('/v1/scores/raw?module=reading-general&correct=30');
    expect(academic.data.band).toBe(7);
    expect(general.data.band).toBe(6);
  });

  it('converts a Listening raw score', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=30');
    expect(response.data.band).toBe(7);
    expect(response.data.cefr).toBe('C1');
    expect(response.data.percentage).toBe(75);
  });

  it('flags a raw score that sits on a band boundary', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=30');
    expect(response.data.sensitivity).toEqual({ minusOne: 6.5, plusOne: 7, stable: false });
    expect(response.meta.threshold).toContain('band boundary');
  });

  it('does not flag a raw score in the middle of a band', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=24');
    expect(response.data.sensitivity.stable).toBe(true);
    expect(response.meta.threshold).toBeUndefined();
  });

  it('rescales a shorter practice section and says so', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=7&outOf=10');
    expect(response.data.scaledCorrect).toBe(28);
    expect(response.data.band).toBe(6.5);
    expect(response.meta.rescaling).toContain('Rescaling is not equating');
    expect(response.meta.rescaling).toContain('moves the scaled score by 4.0');
  });

  it('omits the rescaling note for a full paper', async () => {
    const response = await server.json('/v1/scores/raw?module=listening&correct=20&outOf=40');
    expect(response.meta.rescaling).toBeUndefined();
  });

  it('reports progress towards a target band', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=26&target=7');
    expect(response.data.target).toEqual({ band: 7, minCorrect: 30, marksNeeded: 4, achieved: false });
  });

  it('reports a target that has already been reached', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=36&target=7');
    expect(response.data.target?.achieved).toBe(true);
    expect(response.data.target?.marksNeeded).toBe(0);
  });

  it('accepts a raw score of zero', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=0');
    expect(response.status).toBe(200);
    expect(response.data.band).toBe(2.5);
  });

  it('accepts full marks', async () => {
    const response = await server.json<RawConversion>('/v1/scores/raw?module=listening&correct=40');
    expect(response.data.band).toBe(9);
    expect(response.data.nextBand).toBeNull();
    expect(response.data.sensitivity.plusOne).toBeNull();
  });

  it('requires the module', async () => {
    const response = await server.json('/v1/scores/raw?correct=30');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain(
      'reading-general',
    );
  });

  it('rejects an unknown module', async () => {
    expect((await server.json('/v1/scores/raw?module=writing&correct=30')).status).toBe(400);
  });

  it('requires the raw score', async () => {
    const response = await server.json('/v1/scores/raw?module=listening');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.parameter).toBe('correct');
  });

  it('rejects a raw score outside 0-40', async () => {
    expect((await server.json('/v1/scores/raw?module=listening&correct=41')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?module=listening&correct=-1')).status).toBe(400);
  });

  it('rejects a raw score that exceeds the section length', async () => {
    const response = await server.json('/v1/scores/raw?module=listening&correct=9&outOf=5');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('cannot exceed');
  });

  it('rejects an out-of-range section length', async () => {
    expect((await server.json('/v1/scores/raw?module=listening&correct=1&outOf=0')).status).toBe(400);
    expect((await server.json('/v1/scores/raw?module=listening&correct=1&outOf=41')).status).toBe(400);
  });

  it('rejects a target that is not a reportable band', async () => {
    expect((await server.json('/v1/scores/raw?module=listening&correct=30&target=7.25')).status).toBe(400);
  });
});

describe('GET /v1/scores/raw/tables', () => {
  interface TablesPayload {
    tables: {
      module: string;
      rows: { band: number; minCorrect: number; maxCorrect: number }[];
      anchors: { band: number; marks: number }[];
      provenance: string;
    }[];
    variants: {
      id: string;
      module: string;
      disagreements: { correct: number; consensusBand: number; variantBand: number }[];
      disagreeingScores: number;
      agreementRate: number;
    }[];
  }

  it('publishes all three tables with their official anchors', async () => {
    const response = await server.json<TablesPayload>('/v1/scores/raw/tables');
    expect(response.status).toBe(200);
    expect(response.data.tables.map((table) => table.module)).toEqual([
      'listening',
      'reading-academic',
      'reading-general',
    ]);
    expect(response.meta.count).toBe(3);
    expect(response.meta.totalQuestions).toBe(40);
    expect(response.meta.caveat).toContain('no official raw-score table exists');
    for (const table of response.data.tables) {
      expect(table.provenance).toBe('indicative-consensus');
      expect(table.anchors.length).toBeGreaterThan(0);
      expect(table.rows[0]?.maxCorrect).toBe(40);
    }
  });

  it('computes where published sources disagree', async () => {
    const response = await server.json<TablesPayload>('/v1/scores/raw/tables');
    const variant = response.data.variants.find((entry) => entry.id === 'general-upper-bands');
    expect(variant).toBeDefined();
    expect(variant?.disagreements).toEqual([{ correct: 37, consensusBand: 8, variantBand: 7.5 }]);
    expect(variant?.disagreeingScores).toBe(1);
    expect(variant?.agreementRate).toBe(97.6);
    expect(response.meta.disagreementMethod).toContain('41 possible raw scores');
  });

  it('filters both tables and variants by module', async () => {
    const response = await server.json<TablesPayload>('/v1/scores/raw/tables?module=listening');
    expect(response.data.tables).toHaveLength(1);
    expect(response.data.tables[0]?.module).toBe('listening');
    expect(response.meta.count).toBe(1);
    expect(response.data.variants.length).toBeGreaterThan(0);
    for (const variant of response.data.variants) {
      expect(variant.module).toBe('listening');
    }
  });

  it('returns no variants for a module that has none recorded', async () => {
    const response = await server.json<TablesPayload>('/v1/scores/raw/tables?module=reading-academic');
    expect(response.data.tables).toHaveLength(1);
    expect(response.data.variants).toEqual([]);
  });

  it('rejects an unknown module', async () => {
    expect((await server.json('/v1/scores/raw/tables?module=speaking')).status).toBe(400);
  });
});
