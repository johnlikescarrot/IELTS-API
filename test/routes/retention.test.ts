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

/** Details attached to an error envelope. */
function details(meta: Record<string, unknown>): Record<string, string> {
  return (meta.error as { details: Record<string, string> }).details;
}

interface ScheduleSummary {
  id: string;
  family: string;
  provenance: string;
  publishedReviews: number;
  publishedHorizonDays: number;
  sameDayReviews: number;
  firstReviewMinutes: number;
  reviewDays: number[];
  retention: {
    floor: number;
    mean: number;
    ceiling: number;
    coefficientOfVariation: number;
    uniformity: number;
  };
}

describe('GET /v1/retention', () => {
  it('indexes the layer', async () => {
    const response = await server.json<{
      schedules: number;
      scheduleIds: string[];
      curve: { fit: { rmse: number } };
      libraries: { id: string; words: number }[];
      endpoints: string[];
    }>('/v1/retention');
    expect(response.status).toBe(200);
    expect(response.data.schedules).toBe(response.data.scheduleIds.length);
    expect(response.data.curve.fit.rmse).toBeLessThan(2);
    expect(response.data.libraries).toHaveLength(3);
    expect(response.data.endpoints).toContain('/v1/retention/compare');
    expect(response.meta.caveat).toContain('disagree with each other');
  });
});

describe('GET /v1/retention/schedules', () => {
  it('scores every schedule and ranks them by uniformity', async () => {
    const response = await server.json<ScheduleSummary[]>('/v1/retention/schedules');
    expect(response.status).toBe(200);
    expect(response.data.length).toBeGreaterThanOrEqual(7);
    expect(response.meta.count).toBe(response.data.length);
    const ranked = response.meta.rankedByUniformity as string[];
    expect(ranked).toHaveLength(response.data.length);
    // The most uniform schedule in the catalogue is the current deployed one.
    expect(ranked[0]).toBe('ielts-app-daily-current');
    for (const schedule of response.data) {
      expect(schedule.retention.floor).toBeLessThanOrEqual(schedule.retention.ceiling);
      expect(schedule.reviewDays).toHaveLength(8);
    }
  });

  it('filters by family', async () => {
    const response = await server.json<ScheduleSummary[]>('/v1/retention/schedules?family=supermemo');
    expect(response.data.every((schedule) => schedule.family === 'supermemo')).toBe(true);
    expect(response.data.length).toBeLessThan(response.meta.total as number);
  });

  it('filters by provenance', async () => {
    const response = await server.json<ScheduleSummary[]>(
      '/v1/retention/schedules?provenance=deployed-implementation',
    );
    expect(response.data).toHaveLength(3);
    expect(response.data.every((schedule) => schedule.provenance === 'deployed-implementation')).toBe(true);
  });

  it('combines the filters and can return nothing', async () => {
    const response = await server.json<ScheduleSummary[]>(
      '/v1/retention/schedules?family=supermemo&provenance=deployed-implementation',
    );
    expect(response.data).toHaveLength(0);
  });

  it('rejects an unknown family', async () => {
    const response = await server.json('/v1/retention/schedules?family=vibes');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('family');
  });

  it('honours the modelling knobs', async () => {
    const response = await server.json<ScheduleSummary[]>(
      '/v1/retention/schedules?reviews=4&growth=1&mastery=0',
    );
    expect(response.meta.growth).toBe(1);
    expect(response.meta.reviews).toBe(4);
    expect(response.meta.mastery).toBe(0);
    expect(response.data[0]?.reviewDays).toHaveLength(4);
    expect(response.meta.assumption).toContain('growth=1');
  });

  it('rejects a growth factor outside the accepted range', async () => {
    const response = await server.json('/v1/retention/schedules?growth=99');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('growth');
  });
});

describe('GET /v1/retention/schedules/:id', () => {
  it('expands and scores one schedule', async () => {
    const response = await server.json<{
      id: string;
      stages: { review: number; calendarDay: number }[];
      profile: { points: unknown[]; uniformity: number };
    }>('/v1/retention/schedules/ielts-app-intraday?reviews=8');
    expect(response.status).toBe(200);
    expect(response.data.id).toBe('ielts-app-intraday');
    expect(response.data.stages).toHaveLength(8);
    expect(response.data.profile.points).toHaveLength(8);
    expect(response.meta.terminalNote).toContain('published by the source');
  });

  it('says when the horizon runs past the published intervals', async () => {
    const response = await server.json('/v1/retention/schedules/supermemo-2?reviews=6');
    expect(response.meta.terminalNote).toContain('terminal rule (multiply)');
  });

  it('404s on an unknown schedule', async () => {
    const response = await server.json('/v1/retention/schedules/not-a-schedule');
    expect(response.status).toBe(404);
    expect(details(response.meta).allowed).toContain('leitner-5box');
  });
});

describe('GET /v1/retention/curve', () => {
  it('publishes the equation, the observations and the residuals', async () => {
    const response = await server.json<{
      model: { k: number; observations: unknown[] };
      fit: { rmse: number; maxAbsoluteResidual: number; residuals: unknown[] };
      samples: { minutes: number; retention: number }[];
    }>('/v1/retention/curve');
    expect(response.status).toBe(200);
    expect(response.data.model.k).toBe(1.84);
    expect(response.data.model.observations).toHaveLength(7);
    expect(response.data.fit.residuals).toHaveLength(7);
    expect(response.data.fit.maxAbsoluteResidual).toBeLessThan(3.3);
    expect(response.data.samples).toHaveLength(9);
    expect(response.data.samples[0]?.retention).toBe(1);
  });

  it('samples the curve at requested times', async () => {
    const response = await server.json<{ samples: { minutes: number; days: number }[] }>(
      '/v1/retention/curve?at=19,%201440,44640',
    );
    expect(response.data.samples.map((sample) => sample.minutes)).toEqual([19, 1440, 44640]);
    expect(response.data.samples[1]?.days).toBe(1);
    expect(response.meta.count).toBe(3);
  });

  it('rejects times that are not numbers, are negative, or are absurd', async () => {
    for (const value of ['abc', '-1', '99999999']) {
      const response = await server.json(`/v1/retention/curve?at=${value}`);
      expect(response.status).toBe(400);
      expect(details(response.meta).parameter).toBe('at');
    }
  });

  it('caps the number of sample points', async () => {
    const at = Array.from({ length: 101 }, () => '1').join(',');
    const response = await server.json(`/v1/retention/curve?at=${at}`);
    expect(response.status).toBe(400);
    expect(details(response.meta).received).toBe('101');
  });
});

describe('GET /v1/retention/plan', () => {
  it('dates every review from the learning day', async () => {
    const response = await server.json<{
      start: string;
      reviews: { at: string; date: string }[];
      lastReviewDate: string;
      exam: null;
    }>('/v1/retention/plan?schedule=ielts-app-daily-current&start=2026-03-01');
    expect(response.status).toBe(200);
    expect(response.data.start).toBe('2026-03-01');
    expect(response.data.reviews[0]?.date).toBe('2026-03-02');
    expect(response.data.lastReviewDate).toBe('2026-06-19');
    expect(response.data.exam).toBeNull();
    expect(response.meta.spacingNote).toContain('examIn');
  });

  it('adds the optimal-gap band when a test date is given', async () => {
    const response = await server.json<{
      exam: {
        days: number;
        date: string;
        reviewsBeforeExam: number;
        optimalGapDays: { low: number; high: number };
      };
    }>('/v1/retention/plan?schedule=ielts-app-daily-current&start=2026-03-01&examIn=90');
    expect(response.data.exam.days).toBe(90);
    expect(response.data.exam.date).toBe('2026-05-30');
    expect(response.data.exam.reviewsBeforeExam).toBe(7);
    expect(response.data.exam.optimalGapDays).toEqual({ low: 9, high: 18, source: expect.any(String) });
    expect(response.meta.spacingNote).toContain('Cepeda');
  });

  it('defaults the learning day to today', async () => {
    const response = await server.json<{ start: string }>('/v1/retention/plan?schedule=leitner-5box');
    expect(response.data.start).toBe(new Date().toISOString().slice(0, 10));
  });

  it('requires a known schedule', async () => {
    const missing = await server.json('/v1/retention/plan');
    expect(missing.status).toBe(400);
    expect(details(missing.meta).parameter).toBe('schedule');

    const unknown = await server.json('/v1/retention/plan?schedule=nope');
    expect(unknown.status).toBe(400);
    expect(details(unknown.meta).allowed).toContain('anki-default');
  });

  it('rejects a malformed start date', async () => {
    const response = await server.json('/v1/retention/plan?schedule=leitner-5box&start=2026-13-40');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('start');
  });
});

describe('GET /v1/retention/workload', () => {
  it('simulates the daily load and reports the steady state', async () => {
    const response = await server.json<{
      timeline: { day: number; total: number }[];
      peak: { total: number };
      steadyStateDailyTotal: number;
      steadyStateDay: number | null;
      totalReviews: number;
    }>('/v1/retention/workload?schedule=ielts-app-daily-current&newPerDay=20&days=120&start=2026-01-01');
    expect(response.status).toBe(200);
    expect(response.data.timeline).toHaveLength(120);
    expect(response.data.steadyStateDailyTotal).toBe(180);
    expect(response.data.steadyStateDay).toBe(110);
    expect(response.data.peak.total).toBe(180);
    expect(response.meta.studyDayPlacement).toContain('seven-day block');
  });

  it('handles a part-time week over a short horizon', async () => {
    const response = await server.json<{
      timeline: { studyDay: boolean }[];
      steadyStateDay: number | null;
    }>('/v1/retention/workload?schedule=ielts-app-daily-current&daysPerWeek=4&days=14');
    expect(response.data.timeline.filter((day) => day.studyDay)).toHaveLength(8);
    expect(response.data.steadyStateDay).toBeNull();
  });

  it('rejects an out-of-range intake rate', async () => {
    const response = await server.json('/v1/retention/workload?schedule=leitner-5box&newPerDay=0');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('newPerDay');
  });
});

describe('GET /v1/retention/compare', () => {
  it('measures the divergence between the two schedules of one application', async () => {
    const response = await server.json<{
      agreementRate: number;
      maxDifferenceDays: number;
      divergences: { review: number; difference: number | null }[];
    }>('/v1/retention/compare?a=ielts-app-daily-2026-03&b=ielts-app-daily-current');
    expect(response.status).toBe(200);
    expect(response.data.agreementRate).toBe(0);
    expect(response.data.maxDifferenceDays).toBe(30);
    expect(response.data.divergences).toHaveLength(8);
    expect(response.meta.method).toContain('published intervals only');
  });

  it('refuses to compare a schedule with itself', async () => {
    const response = await server.json('/v1/retention/compare?a=leitner-5box&b=leitner-5box');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('b');
  });

  it('requires both schedules', async () => {
    const response = await server.json('/v1/retention/compare?a=leitner-5box');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('b');
  });
});

describe('GET /v1/retention/libraries', () => {
  it('publishes the word lists with the caveat that they are not comparable', async () => {
    const response =
      await server.json<{ id: string; words: number; breakdown: { words: number }[] | null }[]>(
        '/v1/retention/libraries',
      );
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(3);
    const zhenjing = response.data.find((library) => library.id === 'zhenjing-scenes');
    expect(zhenjing?.breakdown).toHaveLength(22);
    expect(response.meta.comparability).toContain('not comparable');
    expect(response.meta.totalWords).toBe(response.data.reduce((total, library) => total + library.words, 0));
  });
});

describe('GET /v1/retention/coverage', () => {
  it('separates the first pass from the tail', async () => {
    const response = await server.json<{
      firstPassDays: number;
      maturityDays: number;
      totalReviewEvents: number;
      deadline: null;
    }>('/v1/retention/coverage?library=cambridge-1-18-app&schedule=ielts-app-daily-current&newPerDay=20');
    expect(response.status).toBe(200);
    expect(response.data.firstPassDays).toBe(224);
    expect(response.data.maturityDays).toBe(334);
    expect(response.data.totalReviewEvents).toBe(4464 * 8);
    expect(response.data.deadline).toBeNull();
    expect(response.meta.deadlineNote).toContain('deadline');
    expect(response.meta.tailNote).toContain('tail');
  });

  it('analyses a deadline', async () => {
    const response = await server.json<{
      deadline: { requiredNewPerDay: number; feasibleAtRequestedRate: boolean };
    }>(
      '/v1/retention/coverage?library=cambridge-1-18-app&schedule=ielts-app-daily-current&newPerDay=20&deadline=60&daysPerWeek=5',
    );
    expect(response.data.deadline.requiredNewPerDay).toBe(Math.ceil(4464 / 44));
    expect(response.data.deadline.feasibleAtRequestedRate).toBe(false);
    expect(response.meta.deadlineNote).toContain('44 study days');
  });

  it('requires a known library', async () => {
    const response = await server.json('/v1/retention/coverage?library=not-a-list&schedule=leitner-5box');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('library');
  });
});

describe('GET /v1/retention/mastery', () => {
  it('replays the rule and reports the asymmetry', async () => {
    const response = await server.json<{
      trace: { final: number; steps: unknown[]; breakEvenAccuracy: number };
      perConfidence: { confidence: number }[];
    }>('/v1/retention/mastery?answers=1,1,1,0,correct&confidence=4&initial=20');
    expect(response.status).toBe(200);
    expect(response.data.trace.steps).toHaveLength(5);
    expect(response.data.trace.final).toBe(68);
    expect(response.data.trace.breakEvenAccuracy).toBe(0.6154);
    expect(response.data.perConfidence).toHaveLength(5);
    expect(response.meta.asymmetry).toContain('1.6 correct answers');
  });

  it('accepts every spelling of an answer and a confidence per answer', async () => {
    const response = await server.json<{ trace: { correct: number; wrong: number; final: number } }>(
      '/v1/retention/mastery?answers=yes,no,TRUE,w&confidence=1,2,3,4',
    );
    expect(response.data.trace.correct).toBe(2);
    expect(response.data.trace.wrong).toBe(2);
  });

  it('defaults the confidence to 3', async () => {
    const response = await server.json<{ trace: { steps: { confidence: number }[] } }>(
      '/v1/retention/mastery?answers=1,1',
    );
    expect(response.data.trace.steps.every((step) => step.confidence === 3)).toBe(true);
  });

  it('requires the answers parameter', async () => {
    const response = await server.json('/v1/retention/mastery');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('answers');
  });

  it('rejects an unreadable answer', async () => {
    const response = await server.json('/v1/retention/mastery?answers=1,maybe');
    expect(response.status).toBe(400);
    expect(details(response.meta).received).toBe('maybe');
  });

  it('caps the number of answers', async () => {
    const answers = Array.from({ length: 101 }, () => '1').join(',');
    const response = await server.json(`/v1/retention/mastery?answers=${answers}`);
    expect(response.status).toBe(400);
    expect(details(response.meta).received).toBe('101');
  });

  it('rejects a non-integer confidence', async () => {
    const response = await server.json('/v1/retention/mastery?answers=1&confidence=3.5');
    expect(response.status).toBe(400);
    expect(details(response.meta).parameter).toBe('confidence');
  });

  it('rejects a confidence outside the range the application accepts', async () => {
    const response = await server.json('/v1/retention/mastery?answers=1&confidence=9');
    expect(response.status).toBe(400);
    expect(details(response.meta).received).toBe('9');
  });

  it('rejects a confidence list that does not line up with the answers', async () => {
    const response = await server.json('/v1/retention/mastery?answers=1,0,1&confidence=1,2');
    expect(response.status).toBe(400);
    expect(details(response.meta).expected).toBe('3');
  });
});
