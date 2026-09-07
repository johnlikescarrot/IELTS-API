import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REVIEW_HORIZON,
  DEFAULT_STABILITY_GROWTH,
  EBBINGHAUS_CURVE,
  MASTERY_RULE,
  MINUTES_PER_DAY,
  OPTIMAL_SPACING_RATIO,
  REVIEW_SCHEDULES,
  SCHEDULE_FAMILIES,
  SCHEDULE_IDS,
  SCHEDULE_PROVENANCES,
  requireLibrary,
  requireSchedule,
  reviewSchedule,
  round4,
  vocabularyLibraries,
} from '../../src/data/retention.js';
import { HttpError } from '../../src/lib/errors.js';

describe('the schedule catalogue', () => {
  it('exposes every schedule under a unique identifier', () => {
    expect(REVIEW_SCHEDULES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(SCHEDULE_IDS).size).toBe(REVIEW_SCHEDULES.length);
    expect(SCHEDULE_IDS).toEqual(REVIEW_SCHEDULES.map((schedule) => schedule.id));
  });

  it('classifies every schedule with a declared family and provenance', () => {
    for (const schedule of REVIEW_SCHEDULES) {
      expect(SCHEDULE_FAMILIES).toContain(schedule.family);
      expect(SCHEDULE_PROVENANCES).toContain(schedule.provenance);
      expect(schedule.sourceUrl).toMatch(/^https:\/\//);
      expect(schedule.note.length).toBeGreaterThan(40);
      expect(schedule.year).toBeGreaterThan(1900);
    }
  });

  it('publishes at least two non-decreasing intervals for every schedule', () => {
    for (const schedule of REVIEW_SCHEDULES) {
      expect(schedule.intervalsMinutes.length).toBeGreaterThanOrEqual(2);
      for (let index = 1; index < schedule.intervalsMinutes.length; index += 1) {
        expect(schedule.intervalsMinutes[index] as number).toBeGreaterThanOrEqual(
          schedule.intervalsMinutes[index - 1] as number,
        );
      }
    }
  });

  it('records the deployed pair as the disagreement the dataset exists to show', () => {
    const before = reviewSchedule('ielts-app-daily-2026-03');
    const after = reviewSchedule('ielts-app-daily-current');
    expect(before.provenance).toBe('deployed-implementation');
    expect(after.provenance).toBe('deployed-implementation');
    // The 2026 change shifted every stage one place later and dropped the same-day review.
    expect(before.intervalsMinutes[0]).toBe(0);
    expect(after.intervalsMinutes[0]).toBe(MINUTES_PER_DAY);
    expect(after.intervalsMinutes.slice(0, 7)).toEqual(before.intervalsMinutes.slice(1, 8));
  });

  it('keeps the intraday schedule mastery-scaled and the published ones fixed', () => {
    expect(reviewSchedule('ielts-app-intraday').terminal).toEqual({
      kind: 'mastery-scaled',
      baseMinutes: 21600,
      maxFactor: 2,
    });
    expect(reviewSchedule('supermemo-2').terminal).toEqual({ kind: 'multiply', factor: 2.5 });
    expect(reviewSchedule('leitner-5box').terminal).toEqual({ kind: 'repeat-last' });
  });

  it('converts the Pimsleur ladder from seconds without losing the first two steps', () => {
    const pimsleur = reviewSchedule('pimsleur-gir');
    expect(pimsleur.publishedUnit).toBe('seconds');
    expect(pimsleur.intervalsMinutes[0]).toBe(round4(5 / 60));
    expect(pimsleur.intervalsMinutes[1]).toBe(round4(25 / 60));
    expect(pimsleur.intervalsMinutes.at(-1)).toBe(730 * MINUTES_PER_DAY);
  });

  it('rejects an unknown identifier as a 404 and an unknown parameter as a 400', () => {
    expect(() => reviewSchedule('does-not-exist')).toThrowError(HttpError);
    try {
      reviewSchedule('does-not-exist');
    } catch (error) {
      expect((error as HttpError).status).toBe(404);
    }
    try {
      requireSchedule('does-not-exist', 'schedule');
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).details.allowed).toContain('leitner-5box');
    }
    expect(requireSchedule('leitner-5box', 'schedule').id).toBe('leitner-5box');
  });
});

describe('the forgetting curve', () => {
  it('ships Ebbinghaus\u2019s constants and all seven of his observations', () => {
    expect(EBBINGHAUS_CURVE.k).toBe(1.84);
    expect(EBBINGHAUS_CURVE.c).toBe(1.25);
    expect(EBBINGHAUS_CURVE.observations).toHaveLength(7);
    expect(EBBINGHAUS_CURVE.formula).toContain('log10');
  });

  it('lists the observations in increasing time and decreasing savings', () => {
    const { observations } = EBBINGHAUS_CURVE;
    for (let index = 1; index < observations.length; index += 1) {
      const previous = observations[index - 1] as (typeof observations)[number];
      const current = observations[index] as (typeof observations)[number];
      expect(current.minutes).toBeGreaterThan(previous.minutes);
      expect(current.savings).toBeLessThan(previous.savings);
    }
  });

  it('states the modelling defaults it asks callers to override', () => {
    expect(DEFAULT_STABILITY_GROWTH).toBe(2);
    expect(DEFAULT_REVIEW_HORIZON).toBe(8);
    expect(OPTIMAL_SPACING_RATIO.low).toBeLessThan(OPTIMAL_SPACING_RATIO.high);
    expect(OPTIMAL_SPACING_RATIO.sourceUrl).toContain('doi.org');
  });
});

describe('the deployed mastery rule', () => {
  it('records the reward, the penalty and the ratio between them', () => {
    expect(MASTERY_RULE.rewardPerConfidence).toBe(5);
    expect(MASTERY_RULE.penaltyPerConfidence).toBe(8);
    expect(MASTERY_RULE.penaltyRatio).toBe(
      MASTERY_RULE.penaltyPerConfidence / MASTERY_RULE.rewardPerConfidence,
    );
    expect(MASTERY_RULE.masteryRange).toEqual([0, 100]);
    expect(MASTERY_RULE.confidenceRange).toEqual([1, 5]);
  });
});

describe('the vocabulary libraries', () => {
  it('publishes three lists with distinct identifiers', () => {
    const libraries = vocabularyLibraries();
    expect(libraries).toHaveLength(3);
    expect(new Set(libraries.map((library) => library.id)).size).toBe(3);
    for (const library of libraries) {
      expect(library.words).toBeGreaterThan(1000);
      expect(library.partitions).toBeGreaterThan(0);
      expect(library.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('validates the Zhenjing scene sizes against its published total', () => {
    const zhenjing = requireLibrary('zhenjing-scenes', 'library');
    expect(zhenjing.words).toBe(3674);
    expect(zhenjing.breakdown).not.toBeNull();
    const breakdown = zhenjing.breakdown as NonNullable<typeof zhenjing.breakdown>;
    expect(breakdown).toHaveLength(22);
    expect(zhenjing.partitions).toBe(22);
    expect(breakdown.reduce((total, scene) => total + scene.words, 0)).toBe(zhenjing.words);
    expect(new Set(breakdown.map((scene) => scene.id)).size).toBe(22);
    expect(Math.max(...breakdown.map((scene) => scene.words))).toBe(417);
    expect(Math.min(...breakdown.map((scene) => scene.words))).toBe(52);
  });

  it('computes this API\u2019s own list from the live dataset rather than transcribing it', () => {
    const own = requireLibrary('cambridge-1-22-api', 'library');
    expect(own.provenance).toBe('derived-from-this-api');
    expect(own.breakdown).toBeNull();
    // Four more volumes than the deployed list, and fewer headwords: the two
    // counts are not comparable, which is the point of publishing both.
    expect(own.partitions).toBeGreaterThan(requireLibrary('cambridge-1-18-app', 'library').partitions);
  });

  it('rejects an unknown library', () => {
    try {
      requireLibrary('nope', 'library');
    } catch (error) {
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).details.allowed).toContain('zhenjing-scenes');
    }
    expect.assertions(2);
  });
});

describe('round4', () => {
  it('rounds to four decimal places', () => {
    expect(round4(1 / 3)).toBe(0.3333);
    expect(round4(2)).toBe(2);
  });
});
