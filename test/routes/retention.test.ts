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

/** Shape of the error detail block carried in `meta.error`. */
function details(meta: Record<string, unknown>): Record<string, string> {
  return (meta.error as { details: Record<string, string> }).details;
}

describe('GET /v1/retention', () => {
  it('indexes the family and the schedulers in it', async () => {
    const response = await server.json<{
      schedulers: { id: string; claimsEbbinghaus: boolean }[];
      endpoints: string[];
      misattributed: number;
    }>('/v1/retention');
    expect(response.status).toBe(200);
    expect(response.data.schedulers).toHaveLength(5);
    expect(response.data.endpoints).toContain('/v1/retention/compare');
    expect(response.data.misattributed).toBe(1);
    expect(response.meta.caveat).toContain('published no review schedule');
    expect(response.meta.stateless).toContain('pure function');
  });
});

describe('GET /v1/retention/curve', () => {
  it('publishes the savings table, the fit and the residuals', async () => {
    const response = await server.json<{
      equation: { k: number; c: number; formula: string };
      observations: { minutes: number; savings: Record<string, number>; residual: number }[];
      studies: { id: string; meanSavings: number }[];
      fitQuality: { maximumAbsoluteResidual: number; meanAbsoluteResidual: number };
      evaluated: null;
    }>('/v1/retention/curve');
    expect(response.status).toBe(200);
    expect(response.data.equation.k).toBe(1.84);
    expect(response.data.equation.c).toBe(1.25);
    expect(response.data.observations).toHaveLength(7);
    expect(response.data.observations[0]?.savings.ebbinghaus).toBe(0.582);
    expect(response.data.studies).toHaveLength(4);
    expect(response.data.fitQuality.maximumAbsoluteResidual).toBeLessThan(0.035);
    expect(response.data.evaluated).toBeNull();
    expect(response.meta.measure).toContain('Savings, not recall');
    expect(response.meta.generalisability).toContain('nonsense syllables');
  });

  it('evaluates the equation at a requested lag', async () => {
    const response = await server.json<{ evaluated: { minutes: number; savings: number } }>(
      '/v1/retention/curve?minutes=1440',
    );
    expect(response.data.evaluated.minutes).toBe(1440);
    expect(response.data.evaluated.savings).toBeCloseTo(30.4, 1);
  });

  it('rejects a lag outside the domain', async () => {
    const response = await server.json('/v1/retention/curve?minutes=0');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('minutes');
  });
});

describe('GET /v1/retention/schedulers', () => {
  it('lists every scheduler with its provenance and variants', async () => {
    const response = await server.json<{
      schedulers: { id: string; provenance: string }[];
      variants: { id: string; disagreeingReviews: number; ladderLabels: string[] }[];
    }>('/v1/retention/schedulers');
    expect(response.status).toBe(200);
    expect(response.data.schedulers).toHaveLength(5);
    expect(response.data.variants.length).toBeGreaterThan(0);
    const calendar = response.data.variants.find((variant) => variant.id === 'leitner-calendar');
    expect(calendar?.disagreeingReviews).toBe(3);
    expect(calendar?.ladderLabels).toHaveLength(5);
    expect(response.meta.disagreementMethod).toContain('review by review');
  });

  it('filters by provenance and drops the variants that no longer apply', async () => {
    const response = await server.json<{
      schedulers: { id: string; provenance: string }[];
      variants: { scheduler: string }[];
    }>('/v1/retention/schedulers?provenance=folk-pedagogical');
    expect(response.data.schedulers).toHaveLength(1);
    expect(response.data.schedulers[0]?.id).toBe('ebbinghaus-folk');
    for (const variant of response.data.variants) {
      expect(variant.scheduler).toBe('ebbinghaus-folk');
    }
  });

  it('rejects an unknown provenance', async () => {
    const response = await server.json('/v1/retention/schedulers?provenance=peer-reviewed');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('provenance');
  });
});

describe('GET /v1/retention/schedulers/:id', () => {
  it('expands a fixed ladder into published and exact labels', async () => {
    const response = await server.json<{
      id: string;
      ladderTable: { review: number; seconds: number; label: string; exact: string }[];
      variants: unknown[];
    }>('/v1/retention/schedulers/pimsleur-1967');
    expect(response.status).toBe(200);
    expect(response.data.ladderTable).toHaveLength(11);
    const fifth = response.data.ladderTable[4];
    expect(fifth?.label).toBe('1 hour');
    expect(fifth?.exact).toBe('52.08 minutes');
    expect(response.meta.unbounded).toBe(true);
  });

  it('repeats the attribution caveat for the misattributed ladder', async () => {
    const response = await server.json<{ claimsEbbinghaus: boolean; variants: { id: string }[] }>(
      '/v1/retention/schedulers/ebbinghaus-folk',
    );
    expect(response.data.claimsEbbinghaus).toBe(true);
    expect(response.data.variants.map((variant) => variant.id)).toContain('folk-ladder-6step');
    expect(response.meta.caveat).toContain('published no review schedule');
    expect(response.meta.unbounded).toBe(false);
  });

  it('gives the scheduler note when there is nothing to correct', async () => {
    const response = await server.json<{ claimsEbbinghaus: boolean }>('/v1/retention/schedulers/sm-2');
    expect(response.data.claimsEbbinghaus).toBe(false);
    expect(response.meta.caveat).toContain('I(1) = 1 day');
  });

  it('404s an unknown scheduler', async () => {
    const response = await server.json('/v1/retention/schedulers/fsrs-5');
    expect(response.status).toBe(404);
    expect(details(response.meta).id).toBe('fsrs-5');
  });
});

describe('GET /v1/retention/schedule', () => {
  it('builds a dated calendar from a learning date', async () => {
    const response = await server.json<{
      reviews: { review: number; at: string; intervalDays: number }[];
      summary: { reviews: number; terminalIntervalDays: number };
      inputs: { start: string };
    }>('/v1/retention/schedule?scheduler=ebbinghaus-folk&start=2026-01-01&horizonDays=40');
    expect(response.status).toBe(200);
    expect(response.data.inputs.start).toBe('2026-01-01T00:00:00.000Z');
    expect(response.data.reviews[0]?.at).toBe('2026-01-01T00:05:00.000Z');
    expect(response.data.summary.reviews).toBe(8);
    expect(response.data.summary.terminalIntervalDays).toBe(15);
    expect(response.meta.determinism).toContain('Byte-identical');
  });

  it('is byte-identical across requests', async () => {
    const path = '/v1/retention/schedule?scheduler=sm-2&start=2026-03-01&horizonDays=400';
    const [first, second] = await Promise.all([server.request(path), server.request(path)]);
    expect(await first.text()).toBe(await second.text());
  });

  it('defaults the learning date to today', async () => {
    const response = await server.json<{ inputs: { start: string } }>(
      '/v1/retention/schedule?scheduler=leitner-5box',
    );
    expect(response.data.inputs.start.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it('honours the grade, the horizon, the cap and the recall target', async () => {
    const response = await server.json<{
      reviews: { state: { lapses: number } }[];
      summary: { reachedHorizon: boolean };
      inputs: { quality: number; maxReviews: number; targetRecall: number };
    }>('/v1/retention/schedule?scheduler=half-life&quality=1&horizonDays=60&maxReviews=4&targetRecall=0.75');
    expect(response.data.inputs).toMatchObject({ quality: 1, maxReviews: 4, targetRecall: 0.75 });
    expect(response.data.reviews).toHaveLength(4);
    expect(response.data.summary.reachedHorizon).toBe(true);
    expect(response.data.reviews.at(-1)?.state.lapses).toBe(4);
  });

  it('requires a scheduler', async () => {
    const response = await server.json('/v1/retention/schedule');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('scheduler');
  });

  it('rejects an unknown scheduler', async () => {
    const response = await server.json('/v1/retention/schedule?scheduler=fsrs');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('scheduler');
  });

  it('rejects a malformed start date', async () => {
    const response = await server.json('/v1/retention/schedule?scheduler=sm-2&start=2026-13-01');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('start');
  });
});

describe('GET /v1/retention/grade', () => {
  it('grades a review and returns the interval it earns', async () => {
    const response = await server.json<{
      correct: boolean;
      intervalDays: number;
      before: { easeFactor: number };
      after: { easeFactor: number; repetitions: number };
      atCeiling: boolean;
    }>('/v1/retention/grade?scheduler=sm-2&quality=5&repetitions=2&previousIntervalSeconds=518400');
    expect(response.status).toBe(200);
    expect(response.data.correct).toBe(true);
    expect(response.data.before.easeFactor).toBe(2.5);
    expect(response.data.after.easeFactor).toBe(2.6);
    expect(response.data.after.repetitions).toBe(3);
    expect(response.data.intervalDays).toBe(15);
    expect(response.data.atCeiling).toBe(false);
    expect(response.meta.stateless).toContain('No progress is stored');
  });

  it('accepts an explicit easiness factor and recall target', async () => {
    const response = await server.json<{ before: { easeFactor: number }; intervalDays: number }>(
      '/v1/retention/grade?scheduler=sm-2&quality=4&repetitions=3&previousIntervalSeconds=864000&easeFactor=1.9&targetRecall=0.8',
    );
    expect(response.data.before.easeFactor).toBe(1.9);
    expect(response.data.intervalDays).toBe(19);
  });

  it('uses the recall target when grading the half-life scheduler', async () => {
    const eager = await server.json<{ intervalDays: number }>(
      '/v1/retention/grade?scheduler=half-life&quality=5&repetitions=4&targetRecall=0.99',
    );
    const relaxed = await server.json<{ intervalDays: number }>(
      '/v1/retention/grade?scheduler=half-life&quality=5&repetitions=4&targetRecall=0.6',
    );
    expect(eager.data.intervalDays).toBeLessThan(relaxed.data.intervalDays);
  });

  it('records a failing grade as a lapse', async () => {
    const response = await server.json<{ correct: boolean; after: { lapses: number; box: number } }>(
      '/v1/retention/grade?scheduler=leitner-5box&quality=1&repetitions=4',
    );
    expect(response.data.correct).toBe(false);
    expect(response.data.after.lapses).toBe(1);
    expect(response.data.after.box).toBe(1);
  });

  it('requires a scheduler and a grade', async () => {
    const missingScheduler = await server.json('/v1/retention/grade?quality=5');
    expect(missingScheduler.status).toBe(400);
    expect(details(missingScheduler.meta).parameter).toBe('scheduler');
    const missingQuality = await server.json('/v1/retention/grade?scheduler=sm-2');
    expect(missingQuality.status).toBe(400);
    expect(details(missingQuality.meta).parameter).toBe('quality');
  });

  it('rejects a grade outside the 0-5 scale', async () => {
    const response = await server.json('/v1/retention/grade?scheduler=sm-2&quality=6');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('quality');
  });
});

describe('GET /v1/retention/compare', () => {
  it('rolls every scheduler over one horizon and measures the spread', async () => {
    const response = await server.json<{
      projections: { scheduler: string; reviews: number; meanPredictedRecall: number }[];
      spread: { fewestReviews: number; mostReviews: number; ratio: number };
      horizonDays: number;
    }>('/v1/retention/compare?horizonDays=365');
    expect(response.status).toBe(200);
    expect(response.data.projections).toHaveLength(5);
    expect(response.data.horizonDays).toBe(365);
    expect(response.data.spread.fewestReviews).toBe(5);
    expect(response.data.spread.mostReviews).toBe(49);
    expect(response.data.spread.ratio).toBe(9.8);
    expect(response.meta.count).toBe(5);
    expect(response.meta.model).toContain('shadow half-life model');
  });

  it('shows the capped ladder reviewing often and retaining poorly', async () => {
    const response = await server.json<{
      projections: {
        scheduler: string;
        reviews: number;
        terminalIntervalDays: number;
        meanPredictedRecall: number;
      }[];
    }>('/v1/retention/compare?horizonDays=365');
    const folk = response.data.projections.find((row) => row.scheduler === 'ebbinghaus-folk');
    const sm2 = response.data.projections.find((row) => row.scheduler === 'sm-2');
    expect(folk?.terminalIntervalDays).toBe(30);
    expect(folk?.reviews).toBeGreaterThan((sm2?.reviews as number) * 3);
    expect(folk?.meanPredictedRecall).toBeLessThan(0.55);
  });

  it('shortens with the horizon', async () => {
    const response = await server.json<{ projections: { reviews: number }[] }>(
      '/v1/retention/compare?horizonDays=30',
    );
    for (const row of response.data.projections) {
      expect(row.reviews).toBeLessThan(30);
    }
  });

  it('rejects a horizon beyond ten years', async () => {
    const response = await server.json('/v1/retention/compare?horizonDays=4000');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('horizonDays');
  });
});

describe('GET /v1/retention/workload', () => {
  it('projects the daily review load of a steady intake', async () => {
    const response = await server.json<{
      reviewsPerWord: number;
      peakDailyReviews: number;
      steadyStateDailyReviews: number;
      daysToCoverHeadwords: number;
      inputs: { wordsPerDay: number; headwords: number };
    }>('/v1/retention/workload?scheduler=ebbinghaus-folk&wordsPerDay=20');
    expect(response.status).toBe(200);
    expect(response.data.reviewsPerWord).toBe(19);
    expect(response.data.peakDailyReviews).toBe(380);
    expect(response.data.steadyStateDailyReviews).toBeGreaterThan(300);
    expect(response.data.inputs.wordsPerDay).toBe(20);
    expect(response.data.daysToCoverHeadwords).toBe(Math.ceil(response.data.inputs.headwords / 20));
    expect(response.meta.warning).toContain('cannot amortise');
  });

  it('makes the difference between schedulers visible in daily minutes', async () => {
    const folk = await server.json<{ steadyStateDailyReviews: number }>(
      '/v1/retention/workload?scheduler=ebbinghaus-folk&wordsPerDay=20',
    );
    const sm2 = await server.json<{ steadyStateDailyReviews: number }>(
      '/v1/retention/workload?scheduler=sm-2&wordsPerDay=20',
    );
    expect(sm2.data.steadyStateDailyReviews * 3).toBeLessThan(folk.data.steadyStateDailyReviews);
  });

  it('applies its own horizon bounds', async () => {
    const response = await server.json<{ inputs: { horizonDays: number } }>(
      '/v1/retention/workload?scheduler=sm-2&horizonDays=90',
    );
    expect(response.data.inputs.horizonDays).toBe(90);
    const tooShort = await server.json('/v1/retention/workload?scheduler=sm-2&horizonDays=3');
    expect(tooShort.status).toBe(400);
    expect(details(tooShort.meta).parameter).toBe('horizonDays');
  });

  it('rejects an intake beyond 200 words a day', async () => {
    const response = await server.json('/v1/retention/workload?scheduler=sm-2&wordsPerDay=500');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('wordsPerDay');
  });

  it('requires a scheduler', async () => {
    const response = await server.json('/v1/retention/workload?wordsPerDay=10');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('scheduler');
  });
});
