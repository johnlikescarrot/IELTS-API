import { describe, expect, it } from 'vitest';

import {
  DAY_SECONDS,
  EBBINGHAUS_C,
  EBBINGHAUS_EQUATION,
  EBBINGHAUS_K,
  FORGETTING_OBSERVATIONS,
  FORGETTING_STUDIES,
  FORGETTING_STUDY_IDS,
  HLR_MAXIMUM_HALF_LIFE,
  HLR_MINIMUM_HALF_LIFE,
  SCHEDULERS,
  SCHEDULER_IDS,
  SCHEDULER_VARIANTS,
  SM2_FIRST_INTERVAL,
  SM2_INITIAL_EASE,
  SM2_MINIMUM_EASE,
  SM2_SECOND_INTERVAL,
  ebbinghausSavings,
  formatInterval,
  retentionStats,
  schedulerById,
  variantDisagreements,
} from '../../src/data/retention.js';

import type { SchedulerVariant } from '../../src/types.js';

describe('Ebbinghaus constants', () => {
  it('publishes the 1885 equation exactly as Ebbinghaus wrote it', () => {
    expect(EBBINGHAUS_K).toBe(1.84);
    expect(EBBINGHAUS_C).toBe(1.25);
    expect(EBBINGHAUS_EQUATION).toContain('100k / ((log10 t)^c + k)');
  });

  it('returns full savings at the lower bound of the domain', () => {
    // log10(1) = 0, so the equation collapses to 100k/k = 100.
    expect(ebbinghausSavings(1)).toBe(100);
  });

  it('clamps below the domain rather than diverging', () => {
    expect(ebbinghausSavings(0)).toBe(100);
    expect(ebbinghausSavings(0.001)).toBe(100);
  });

  it('decays monotonically across the studied range', () => {
    const lags = [1, 19, 63, 525, 1440, 2880, 8640, 44640, 525_600];
    const savings = lags.map(ebbinghausSavings);
    for (let index = 1; index < savings.length; index += 1) {
      expect(savings[index] as number).toBeLessThan(savings[index - 1] as number);
    }
    expect(savings.at(-1) as number).toBeGreaterThan(0);
  });
});

describe('forgetting-curve observations', () => {
  it('carries the original series and three replications', () => {
    expect(FORGETTING_STUDIES).toHaveLength(4);
    expect(FORGETTING_STUDY_IDS).toEqual(['ebbinghaus', 'mack', 'seitz', 'dros']);
    expect(FORGETTING_STUDIES.filter((study) => study.role === 'original')).toHaveLength(1);
    expect(FORGETTING_STUDIES.filter((study) => study.role === 'replication')).toHaveLength(3);
  });

  it('transcribes the seven canonical retention intervals', () => {
    expect(FORGETTING_OBSERVATIONS.map((row) => row.minutes)).toEqual([19, 63, 525, 1440, 2880, 8640, 44640]);
    expect(FORGETTING_OBSERVATIONS.map((row) => row.label)).toEqual([
      '20 minutes',
      '1 hour',
      '9 hours',
      '1 day',
      '2 days',
      '6 days',
      '31 days',
    ]);
  });

  it('reproduces the savings figures of Murre and Dros table 3', () => {
    const first = FORGETTING_OBSERVATIONS[0];
    expect(first?.savings).toEqual({ ebbinghaus: 0.582, mack: 0.544, seitz: 0.442, dros: 0.472 });
    const last = FORGETTING_OBSERVATIONS.at(-1);
    expect(last?.savings).toEqual({ ebbinghaus: 0.211, mack: 0.258, seitz: 0.201, dros: 0.041 });
  });

  it('gives every study a savings value at every interval', () => {
    for (const row of FORGETTING_OBSERVATIONS) {
      for (const study of FORGETTING_STUDY_IDS) {
        expect(row.savings[study]).toBeGreaterThan(0);
        expect(row.savings[study]).toBeLessThan(1);
      }
    }
  });

  it("evaluates Ebbinghaus's own fit at every observed interval", () => {
    for (const row of FORGETTING_OBSERVATIONS) {
      expect(row.predicted).toBeCloseTo(ebbinghausSavings(row.minutes) / 100, 3);
      expect(row.residual).toBeCloseTo(row.savings.ebbinghaus - row.predicted, 3);
    }
  });

  it('fits its own data to within 0.035 savings everywhere', () => {
    for (const row of FORGETTING_OBSERVATIONS) {
      expect(Math.abs(row.residual)).toBeLessThan(0.035);
    }
  });

  it('leaves its largest residual at the 24-hour sleep bump', () => {
    const worst = [...FORGETTING_OBSERVATIONS].sort(
      (left, right) => Math.abs(right.residual) - Math.abs(left.residual),
    )[0];
    expect(worst?.label).toBe('1 day');
    // Ebbinghaus retains more at one day than his own equation predicts, which
    // is the jump Murre and Dros attribute to sleep-dependent consolidation.
    expect(worst?.residual).toBeGreaterThan(0);
  });
});

describe('formatInterval', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(formatInterval(5)).toBe('5 seconds');
    expect(formatInterval(59)).toBe('59 seconds');
  });

  it('formats sub-hour durations in minutes', () => {
    expect(formatInterval(60)).toBe('1 minutes');
    expect(formatInterval(3125)).toBe('52.08 minutes');
  });

  it('formats sub-day durations in hours', () => {
    expect(formatInterval(3600)).toBe('1 hours');
    expect(formatInterval(43_200)).toBe('12 hours');
  });

  it('formats everything longer in days', () => {
    expect(formatInterval(DAY_SECONDS)).toBe('1 days');
    expect(formatInterval(48_828_125)).toBe('565.14 days');
  });
});

describe('schedulers', () => {
  it('publishes five schedulers spanning six decades', () => {
    expect(SCHEDULERS).toHaveLength(5);
    expect(SCHEDULER_IDS).toEqual(['ebbinghaus-folk', 'pimsleur-1967', 'leitner-5box', 'sm-2', 'half-life']);
    expect(Math.min(...SCHEDULERS.map((scheduler) => scheduler.year))).toBe(1967);
  });

  it('labels exactly one scheduler as misattributed folk pedagogy', () => {
    const misattributed = SCHEDULERS.filter((scheduler) => scheduler.claimsEbbinghaus);
    expect(misattributed).toHaveLength(1);
    expect(misattributed[0]?.id).toBe('ebbinghaus-folk');
    expect(misattributed[0]?.provenance).toBe('folk-pedagogical');
  });

  it('never labels a folk ladder as a published algorithm', () => {
    for (const scheduler of SCHEDULERS) {
      if (scheduler.claimsEbbinghaus) {
        expect(scheduler.provenance).toBe('folk-pedagogical');
      } else {
        expect(scheduler.provenance).not.toBe('folk-pedagogical');
      }
    }
  });

  it('gives every scheduler a source, a URL and a caveat', () => {
    for (const scheduler of SCHEDULERS) {
      expect(scheduler.source.length).toBeGreaterThan(20);
      expect(scheduler.sourceUrl).toMatch(/^https:\/\//);
      expect(scheduler.note.length).toBeGreaterThan(40);
      expect(scheduler.ladder).toHaveLength(scheduler.ladderLabels.length);
    }
  });

  it('keeps every fixed ladder strictly increasing', () => {
    for (const scheduler of SCHEDULERS) {
      for (let index = 1; index < scheduler.ladder.length; index += 1) {
        expect(scheduler.ladder[index] as number).toBeGreaterThan(scheduler.ladder[index - 1] as number);
      }
    }
  });

  it('ships the folk ladder exactly as the upstream trainer ships it', () => {
    const folk = schedulerById('ebbinghaus-folk');
    expect(folk.ladder).toEqual([300, 1800, 43_200, 86_400, 172_800, 345_600, 604_800, 1_296_000]);
    // Its cap is twice the last rung, because mastery cannot exceed 100.
    expect(folk.ceilingSeconds).toBe(30 * DAY_SECONDS);
  });

  it('overlaps the intervals Ebbinghaus measured only at the round numbers', () => {
    const measured = new Set(FORGETTING_OBSERVATIONS.map((row) => row.minutes * 60));
    const ladder = schedulerById('ebbinghaus-folk').ladder;
    const shared = ladder.filter((rung) => measured.has(rung));
    // One day and two days, and nothing else: the ladder is not a transcription
    // of the curve it is named after.
    expect(shared).toEqual([DAY_SECONDS, 2 * DAY_SECONDS]);
    expect(ladder.length - shared.length).toBe(6);
    const unusedIntervals = [...measured].filter((seconds) => !ladder.includes(seconds));
    expect(unusedIntervals).toHaveLength(5);
  });

  it('stores Pimsleur as the exact geometric series it is', () => {
    const pimsleur = schedulerById('pimsleur-1967');
    expect(pimsleur.ladder).toHaveLength(11);
    pimsleur.ladder.forEach((seconds, index) => {
      expect(seconds).toBe(5 ** (index + 1));
    });
    expect(pimsleur.growth).toBe(5);
    expect(pimsleur.ceilingSeconds).toBeNull();
  });

  it('keeps the published Pimsleur labels beside the exact values', () => {
    const pimsleur = schedulerById('pimsleur-1967');
    // The label says one hour; the interval is 3,125 seconds, or 52 minutes.
    expect(pimsleur.ladderLabels[4]).toBe('1 hour');
    expect(pimsleur.ladder[4]).toBe(3125);
    // The label says two years; the interval is 565 days.
    expect(pimsleur.ladderLabels[10]).toBe('2 years');
    expect(Math.round((pimsleur.ladder[10] as number) / DAY_SECONDS)).toBe(565);
  });

  it('renders Leitner as the doubling ladder used by Settles and Meeder', () => {
    const leitner = schedulerById('leitner-5box');
    expect(leitner.ladder.map((seconds) => seconds / DAY_SECONDS)).toEqual([1, 2, 4, 8, 16]);
    expect(leitner.growth).toBe(2);
  });

  it('publishes the SM-2 constants', () => {
    const sm2 = schedulerById('sm-2');
    expect(sm2.ladder).toEqual([SM2_FIRST_INTERVAL, SM2_SECOND_INTERVAL]);
    expect(SM2_FIRST_INTERVAL).toBe(DAY_SECONDS);
    expect(SM2_SECOND_INTERVAL).toBe(6 * DAY_SECONDS);
    expect(SM2_INITIAL_EASE).toBe(2.5);
    expect(SM2_MINIMUM_EASE).toBe(1.3);
    expect(sm2.ceilingSeconds).toBeNull();
  });

  it('gives the half-life scheduler no ladder and the published clamp', () => {
    const hlr = schedulerById('half-life');
    expect(hlr.ladder).toHaveLength(0);
    expect(hlr.ladderLabels).toHaveLength(0);
    expect(hlr.growth).toBeNull();
    expect(hlr.ceilingSeconds).toBe(HLR_MAXIMUM_HALF_LIFE * DAY_SECONDS);
    expect(HLR_MINIMUM_HALF_LIFE).toBe(0.1);
  });

  it('rejects an unknown scheduler identifier', () => {
    expect(() => schedulerById('sm-18')).toThrowError(/No scheduler with id "sm-18"/);
  });
});

describe('scheduler variants', () => {
  it('records every variant against a real scheduler', () => {
    expect(SCHEDULER_VARIANTS.length).toBeGreaterThan(0);
    for (const variant of SCHEDULER_VARIANTS) {
      expect(SCHEDULER_IDS).toContain(variant.scheduler);
      expect(variant.sourceUrl).toMatch(/^https:\/\//);
      expect(variant.ladder.every((seconds) => Number.isInteger(seconds))).toBe(true);
    }
  });

  it('measures the calendar rendering of Leitner against the doubling one', () => {
    const variant = SCHEDULER_VARIANTS.find((row) => row.id === 'leitner-calendar');
    const rows = variantDisagreements(variant as SchedulerVariant);
    // Boxes 1 and 2 agree; boxes 3, 4 and 5 do not.
    expect(rows.map((row) => row.review)).toEqual([3, 4, 5]);
    expect(rows.map((row) => row.ratio)).toEqual([1.75, 1.75, 1.88]);
  });

  it('reports a truncated rendering as a disagreement at the missing rungs', () => {
    const variant = SCHEDULER_VARIANTS.find((row) => row.id === 'folk-ladder-6step');
    const rows = variantDisagreements(variant as SchedulerVariant);
    expect(rows.map((row) => row.review)).toEqual([7, 8]);
    for (const row of rows) {
      expect(row.variantSeconds).toBe(0);
      expect(row.canonicalSeconds).toBeGreaterThan(0);
    }
  });

  it('reports a rendering longer than the canonical ladder with a zero ratio', () => {
    const seven: SchedulerVariant = {
      id: 'leitner-7box',
      scheduler: 'leitner-5box',
      label: 'Seven-box rendering',
      sourceUrl: 'https://example.invalid/seven',
      ladder: [1, 2, 4, 8, 16, 32, 64].map((days) => days * DAY_SECONDS),
      note: 'A synthetic rendering used to exercise the longer-than-canonical branch.',
    };
    const rows = variantDisagreements(seven);
    expect(rows.map((row) => row.review)).toEqual([6, 7]);
    for (const row of rows) {
      expect(row.canonicalSeconds).toBe(0);
      expect(row.ratio).toBe(0);
    }
  });

  it('reports no disagreement when a rendering is identical', () => {
    const identical: SchedulerVariant = {
      id: 'leitner-identical',
      scheduler: 'leitner-5box',
      label: 'Identical rendering',
      sourceUrl: 'https://example.invalid/identical',
      ladder: [...schedulerById('leitner-5box').ladder],
      note: 'A synthetic rendering identical to the canonical ladder.',
    };
    expect(variantDisagreements(identical)).toEqual([]);
  });
});

describe('retentionStats', () => {
  it('counts the family for the service index', () => {
    expect(retentionStats()).toEqual({
      studies: 4,
      intervals: 7,
      measurements: 28,
      schedulers: 5,
      variants: SCHEDULER_VARIANTS.length,
      misattributed: 1,
    });
  });

  it('reports measurements as every study observed at every interval', () => {
    const stats = retentionStats();
    expect(stats.measurements).toBe(stats.studies * stats.intervals);
    // The table is complete: no study is missing an interval, so the product is
    // the true count of published savings figures rather than an upper bound.
    for (const observation of FORGETTING_OBSERVATIONS) {
      expect(Object.keys(observation.savings)).toHaveLength(stats.studies);
    }
  });
});
