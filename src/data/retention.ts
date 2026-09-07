/**
 * Forgetting-curve data and the review schedulers built on top of it.
 *
 * ## Why this dataset exists
 *
 * Every vocabulary trainer in IELTS preparation schedules reviews, and almost
 * all of them cite the same authority: Hermann Ebbinghaus. The citation is
 * usually wrong. Ebbinghaus (1885) measured *retention* — the proportion of
 * relearning effort saved after a delay — at seven delays, on himself, using
 * nonsense syllables. He did not propose a review schedule, did not study
 * repeated retrieval, and published no interval ladder of any kind. The
 * ladders attributed to him were invented much later by other people.
 *
 * The most widely deployed of those ladders is the eight-step sequence
 * `5 min, 30 min, 12 h, 1 d, 2 d, 4 d, 7 d, 15 d`. It is shipped verbatim, in
 * a file whose header comment reads "Ebbinghaus forgetting-curve algorithm", by
 * the IELTS vocabulary system this release was researched against
 * ({@link https://github.com/Iamdacai/ielts-vocab-system}), and by a long tail
 * of similar trainers. This module publishes it once, as a citable artefact,
 * with the three properties the circulating copies lack:
 *
 * 1. **The measurements it claims to implement.** {@link FORGETTING_OBSERVATIONS}
 *    carries Ebbinghaus's own savings figures together with three independent
 *    replications, and the residuals of Ebbinghaus's own 1885 equation against
 *    his own data.
 * 2. **Honest provenance.** The ladder is labelled `folk-pedagogical`, and the
 *    `claimsEbbinghaus` flag records the misattribution as data rather than as
 *    prose. The schedulers that *are* published algorithms — Pimsleur (1967),
 *    Leitner (1972), SM-2 (1990), half-life regression (2016) — are labelled as
 *    such and cited.
 * 3. **Measured disagreement.** Where a scheduler circulates in more than one
 *    rendering, every rendering is recorded in full and the API computes the
 *    exact reviews at which they diverge — see {@link SCHEDULER_VARIANTS}.
 *
 * ## Units
 *
 * Every interval in this module is stored in **seconds** as an integer. The
 * schedulers span eleven orders of magnitude — Pimsleur's first interval is
 * five seconds, SM-2's terminal interval is measured in years — and integer
 * seconds are the only unit in which all of them are exact.
 *
 * @see https://doi.org/10.1371/journal.pone.0120644 Murre and Dros (2015), the source of the savings table
 * @see https://doi.org/10.18653/v1/P16-1174 Settles and Meeder (2016), half-life regression
 */

import { notFound } from '../lib/errors.js';

import type {
  ForgettingObservation,
  ForgettingStudy,
  ForgettingStudyId,
  Scheduler,
  SchedulerDisagreement,
  SchedulerId,
  SchedulerVariant,
} from '../types.js';

/** Seconds in a minute. */
const MINUTE = 60;
/** Seconds in an hour. */
const HOUR = 60 * MINUTE;
/** Seconds in a day. */
export const DAY_SECONDS = 24 * HOUR;

/**
 * Constant `k` of Ebbinghaus's 1885 equation.
 *
 * `b = 100k / ((log t)^c + k)`, with `t` in minutes counted from one minute
 * before the end of learning.
 */
export const EBBINGHAUS_K = 1.84;

/** Exponent `c` of Ebbinghaus's 1885 equation. */
export const EBBINGHAUS_C = 1.25;

/** The equation as Ebbinghaus wrote it, for republication in responses. */
export const EBBINGHAUS_EQUATION = 'b = 100k / ((log10 t)^c + k), t in minutes, k = 1.84, c = 1.25';

/**
 * Savings predicted by Ebbinghaus's own 1885 equation.
 *
 * The equation is undefined at `t = 1` (where `log10 t = 0` and the
 * denominator collapses to `k`) and diverges below it, so the domain is
 * clamped at one minute — which is also where Ebbinghaus starts counting.
 *
 * @param minutes - Lag since learning, in minutes.
 * @returns Predicted savings as a percentage, clamped to 0-100.
 */
export function ebbinghausSavings(minutes: number): number {
  const t = Math.max(1, minutes);
  const denominator = Math.log10(t) ** EBBINGHAUS_C + EBBINGHAUS_K;
  const percent = (100 * EBBINGHAUS_K) / denominator;
  return Math.min(100, Math.max(0, percent));
}

/** The four savings series republished by the API. */
export const FORGETTING_STUDIES: readonly ForgettingStudy[] = [
  {
    id: 'ebbinghaus',
    name: 'Ebbinghaus (1885)',
    year: 1885,
    source: 'H. Ebbinghaus, Ueber das Gedaechtnis, Duncker & Humblot, 1885, chapter VII.',
    sourceUrl: 'https://doi.org/10.1371/journal.pone.0120644',
    role: 'original',
    note: 'A single subject — Ebbinghaus himself — relearning lists of nonsense syllables. The three shortest intervals are the corrected values (19 min, 63 min, 8.75 h) that Murre and Dros use when fitting, not the round numbers Ebbinghaus quotes in prose.',
  },
  {
    id: 'mack',
    name: 'Mack (1927)',
    year: 1927,
    source: 'Reported in Heller, Mack and Seitz (1991) and tabulated by Murre and Dros (2015), table 3.',
    sourceUrl: 'https://doi.org/10.1371/journal.pone.0120644',
    role: 'replication',
    note: 'One of two subjects in the German replication. Mack retains more than Ebbinghaus at every interval beyond one day.',
  },
  {
    id: 'seitz',
    name: 'Seitz (1927)',
    year: 1927,
    source: 'Reported in Heller, Mack and Seitz (1991) and tabulated by Murre and Dros (2015), table 3.',
    sourceUrl: 'https://doi.org/10.1371/journal.pone.0120644',
    role: 'replication',
    note: 'The second subject of the German replication, and the flattest of the four curves.',
  },
  {
    id: 'dros',
    name: 'Dros (2015)',
    year: 2015,
    source:
      'J. M. J. Murre and J. Dros, Replication and analysis of Ebbinghaus forgetting curve, PLoS ONE 10(7), 2015.',
    sourceUrl: 'https://doi.org/10.1371/journal.pone.0120644',
    role: 'replication',
    note: 'The modern replication: one subject, roughly 70 hours of learning, the original method. It tracks Ebbinghaus closely to six days and then collapses to 4.1% at 31 days, the single largest departure in the table.',
  },
];

/** Every study identifier, in publication order. */
export const FORGETTING_STUDY_IDS: readonly ForgettingStudyId[] = FORGETTING_STUDIES.map((study) => study.id);

/**
 * Savings at the seven canonical retention intervals.
 *
 * Transcribed from Murre and Dros (2015), table 3. The intervals are the
 * corrected minute values the authors use for fitting: Ebbinghaus's "20
 * minutes" is 19 minutes, his "1 hour" is 63 minutes, and his "9 hours" is 8.75
 * hours (525 minutes).
 */
const RAW_OBSERVATIONS: readonly (readonly [number, string, number, number, number, number])[] = [
  [19, '20 minutes', 0.582, 0.544, 0.442, 0.472],
  [63, '1 hour', 0.442, 0.432, 0.325, 0.373],
  [525, '9 hours', 0.358, 0.285, 0.27, 0.276],
  [1440, '1 day', 0.337, 0.316, 0.27, 0.317],
  [2880, '2 days', 0.278, 0.365, 0.286, 0.23],
  [8640, '6 days', 0.254, 0.309, 0.205, 0.168],
  [44640, '31 days', 0.211, 0.258, 0.201, 0.041],
];

/** Round to three decimal places. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Round to two decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The savings table, with Ebbinghaus's own fit evaluated at every interval. */
export const FORGETTING_OBSERVATIONS: readonly ForgettingObservation[] = RAW_OBSERVATIONS.map(
  ([minutes, label, ebbinghaus, mack, seitz, dros]) => {
    const predicted = ebbinghausSavings(minutes) / 100;
    return {
      minutes,
      label,
      savings: { ebbinghaus, mack, seitz, dros },
      predicted: round3(predicted),
      residual: round3(ebbinghaus - predicted),
    };
  },
);

/**
 * The eight-step ladder shipped as "the Ebbinghaus algorithm".
 *
 * `5 min, 30 min, 12 h, 1 d, 2 d, 4 d, 7 d, 15 d`. None of these delays is one
 * of Ebbinghaus's seven retention intervals, and Ebbinghaus never scheduled a
 * second exposure at all.
 */
const FOLK_LADDER: readonly number[] = [
  5 * MINUTE,
  30 * MINUTE,
  12 * HOUR,
  1 * DAY_SECONDS,
  2 * DAY_SECONDS,
  4 * DAY_SECONDS,
  7 * DAY_SECONDS,
  15 * DAY_SECONDS,
];

/**
 * Pimsleur's graduated interval recall, in seconds.
 *
 * Pimsleur (1967) prints eleven intervals — 5 s, 25 s, 2 min, 10 min, 1 h, 5 h,
 * 1 day, 5 days, 25 days, 4 months, 2 years — and the printed labels are
 * friendly roundings of an exact geometric series with ratio 5: the nth
 * interval is 5^n seconds. Storing the exact powers rather than the rounded
 * labels makes the ladder reproducible; the labels are kept alongside it.
 */
const PIMSLEUR_LADDER: readonly number[] = Array.from({ length: 11 }, (_, index) => 5 ** (index + 1));

/** The labels Pimsleur prints, in the order he prints them. */
const PIMSLEUR_LABELS: readonly string[] = [
  '5 seconds',
  '25 seconds',
  '2 minutes',
  '10 minutes',
  '1 hour',
  '5 hours',
  '1 day',
  '5 days',
  '25 days',
  '4 months',
  '2 years',
];

/** The doubling rendering of Leitner's five boxes: 1, 2, 4, 8, 16 days. */
const LEITNER_LADDER: readonly number[] = [1, 2, 4, 8, 16].map((days) => days * DAY_SECONDS);

/**
 * Format a duration in seconds the way the sources label it.
 *
 * Published ladders are printed with friendly roundings — Pimsleur's fifth
 * interval is printed as "1 hour" and is in fact 3,125 seconds — so responses
 * carry both the label the source prints and the exact value formatted here.
 *
 * @param seconds - Duration in seconds.
 */
export function formatInterval(seconds: number): string {
  if (seconds < MINUTE) {
    return `${seconds} seconds`;
  }
  if (seconds < HOUR) {
    return `${round2(seconds / MINUTE)} minutes`;
  }
  if (seconds < DAY_SECONDS) {
    return `${round2(seconds / HOUR)} hours`;
  }
  return `${round2(seconds / DAY_SECONDS)} days`;
}

/** SM-2's first interval, in seconds. */
export const SM2_FIRST_INTERVAL = 1 * DAY_SECONDS;

/** SM-2's second interval, in seconds. */
export const SM2_SECOND_INTERVAL = 6 * DAY_SECONDS;

/** SM-2's initial easiness factor. */
export const SM2_INITIAL_EASE = 2.5;

/** The floor SM-2 imposes on the easiness factor. */
export const SM2_MINIMUM_EASE = 1.3;

/** Bias weight of the illustrative half-life regression vector. */
export const HLR_BIAS = 0.5;

/** Weight applied to the square root of the successful-review count. */
export const HLR_CORRECT_WEIGHT = 1;

/** Weight applied to the square root of the failed-review count. */
export const HLR_INCORRECT_WEIGHT = -1;

/** Shortest half-life the half-life scheduler will estimate, in days. */
export const HLR_MINIMUM_HALF_LIFE = 0.1;

/** Longest half-life the half-life scheduler will estimate, in days. */
export const HLR_MAXIMUM_HALF_LIFE = 90;

/** The review schedulers published by the API. */
export const SCHEDULERS: readonly Scheduler[] = [
  {
    id: 'ebbinghaus-folk',
    name: 'Ebbinghaus folk ladder (as deployed)',
    family: 'fixed-ladder',
    provenance: 'folk-pedagogical',
    year: 2026,
    source:
      'Iamdacai/ielts-vocab-system, backend/spaced-repetition-algorithm.js, header comment "Ebbinghaus forgetting-curve algorithm".',
    sourceUrl: 'https://github.com/Iamdacai/ielts-vocab-system',
    ladder: [...FOLK_LADDER],
    ladderLabels: FOLK_LADDER.map(formatInterval),
    growth: null,
    ceilingSeconds: 30 * DAY_SECONDS,
    claimsEbbinghaus: true,
    note: 'Once the eight steps are exhausted the implementation repeats the last one scaled by mastery: interval = 15 days * (1 + mastery/100). Mastery is capped at 100, so the interval is capped at 30 days and never grows again, however many times the item is recalled correctly. Six of the eight rungs correspond to no delay Ebbinghaus ever tested; the two that do, one day and two days, are round numbers common to both. Five of his seven intervals — 19 minutes, 63 minutes, 8.75 hours, 6 days and 31 days — appear nowhere in the ladder.',
  },
  {
    id: 'pimsleur-1967',
    name: 'Pimsleur graduated interval recall',
    family: 'fixed-ladder',
    provenance: 'published-schedule',
    year: 1967,
    source: 'P. Pimsleur, A memory schedule, The Modern Language Journal 51(2), 1967, pp. 73-75.',
    sourceUrl: 'https://doi.org/10.1111/j.1540-4781.1967.tb06700.x',
    ladder: [...PIMSLEUR_LADDER],
    ladderLabels: [...PIMSLEUR_LABELS],
    growth: 5,
    ceilingSeconds: null,
    claimsEbbinghaus: false,
    note: 'The first fixed review ladder ever published, and an exact geometric series: the nth interval is 5^n seconds. The printed labels are roundings, so the published "1 hour" is 3,125 seconds and the published "2 years" is 5^11 seconds, or 565 days.',
  },
  {
    id: 'leitner-5box',
    name: 'Leitner five-box system (doubling rendering)',
    family: 'fixed-ladder',
    provenance: 'published-schedule',
    year: 1972,
    source: 'S. Leitner, So lernt man lernen, Herder, 1972.',
    sourceUrl: 'https://doi.org/10.18653/v1/P16-1174',
    ladder: [...LEITNER_LADDER],
    ladderLabels: LEITNER_LADDER.map(formatInterval),
    growth: 2,
    ceilingSeconds: 16 * DAY_SECONDS,
    claimsEbbinghaus: false,
    note: 'Leitner specified five compartments and a promotion rule, not a table of days: the day intervals are a later rendering and they differ between sources. This is the doubling rendering used by Settles and Meeder, who show that Leitner is a special case of half-life regression with fixed weights. A failed review returns the item to box 1.',
  },
  {
    id: 'sm-2',
    name: 'SuperMemo SM-2',
    family: 'multiplicative',
    provenance: 'published-algorithm',
    year: 1990,
    source: 'P. A. Wozniak, Optimization of learning, SuperMemo, 1990; the SM-2 specification.',
    sourceUrl: 'https://super-memory.com/english/ol/sm2.htm',
    ladder: [SM2_FIRST_INTERVAL, SM2_SECOND_INTERVAL],
    ladderLabels: ['1 day', '6 days'],
    growth: SM2_INITIAL_EASE,
    ceilingSeconds: null,
    claimsEbbinghaus: false,
    note: 'I(1) = 1 day, I(2) = 6 days, I(n) = I(n-1) * EF. The easiness factor starts at 2.5, is updated by EF += 0.1 - (5-q)*(0.08 + (5-q)*0.02) after every review, and is floored at 1.3. A grade below 3 resets the repetition count without resetting EF. The interval is unbounded: the same algorithm that schedules a first review tomorrow will schedule a tenth review years out.',
  },
  {
    id: 'half-life',
    name: 'Half-life regression',
    family: 'half-life',
    provenance: 'published-algorithm',
    year: 2016,
    source:
      'B. Settles and B. Meeder, A trainable spaced repetition model for language learning, ACL 2016, pp. 1848-1858.',
    sourceUrl: 'https://doi.org/10.18653/v1/P16-1174',
    ladder: [],
    ladderLabels: [],
    growth: null,
    ceilingSeconds: HLR_MAXIMUM_HALF_LIFE * DAY_SECONDS,
    claimsEbbinghaus: false,
    note: "Recall decays as p = 2^(-lag/h), and the item is scheduled at the lag where p reaches the target retention, so the interval is a function of the target rather than of a table. The half-life is h = 2^(theta . x) with x = [1, sqrt(correct), sqrt(incorrect)]. Duolingo trains theta per lexeme and does not publish a single vector; the weights used here are the illustrative defaults (bias 0.5, correct +1, incorrect -1) with the paper's clamp of 0.1 to 90 days, so this scheduler is reproducible but is not Duolingo's production model.",
  },
];

/** Every scheduler identifier, in publication order of the underlying method. */
export const SCHEDULER_IDS: readonly SchedulerId[] = SCHEDULERS.map((scheduler) => scheduler.id);

/**
 * Look up a scheduler by identifier.
 *
 * @param id - Scheduler identifier.
 * @returns The scheduler.
 * @throws {HttpError} `404` when no scheduler carries the identifier.
 */
export function schedulerById(id: string): Scheduler {
  const match = SCHEDULERS.find((scheduler) => scheduler.id === id);
  if (match === undefined) {
    throw notFound(`No scheduler with id "${id}".`, { id, allowed: SCHEDULER_IDS.join(',') });
  }
  return match;
}

/** Competing renderings of the fixed ladders. */
export const SCHEDULER_VARIANTS: readonly SchedulerVariant[] = [
  {
    id: 'leitner-calendar',
    scheduler: 'leitner-5box',
    label: 'Leitner five-box, calendar rendering (daily, 2 days, weekly, fortnightly, monthly)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Leitner_system',
    ladder: [1, 2, 7, 14, 30].map((days) => days * DAY_SECONDS),
    note: 'The rendering used by most descriptions of the physical box, where boxes 3 to 5 are tied to calendar habits (a weekly, fortnightly and monthly session) rather than to a doubling rule.',
  },
  {
    id: 'leitner-45910',
    scheduler: 'leitner-5box',
    label: 'Leitner five-box, flashcard-app rendering (1, 2, 4.5, 9.5, 21 days)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Leitner_system',
    ladder: [1, 2, 4.5, 9.5, 21].map((days) => Math.round(days * DAY_SECONDS)),
    note: 'The midpoints of the "every 4-5 days", "every 9-10 days" and "every 2-4 weeks" ranges quoted by flashcard applications that implement the box system in software.',
  },
  {
    id: 'folk-ladder-6step',
    scheduler: 'ebbinghaus-folk',
    label: 'Six-step folk ladder (5 min, 30 min, 12 h, 1 d, 2 d, 4 d)',
    sourceUrl: 'https://github.com/Iamdacai/ielts-vocab-system',
    ladder: [5 * MINUTE, 30 * MINUTE, 12 * HOUR, DAY_SECONDS, 2 * DAY_SECONDS, 4 * DAY_SECONDS],
    note: 'The truncated ladder that circulates alongside the eight-step version. The two agree wherever both are defined and differ only in where they stop, which is exactly the kind of divergence a table without provenance cannot resolve.',
  },
];

/**
 * Compare a variant rendering with its scheduler's canonical ladder.
 *
 * Both ladders are compared review by review over the length of the longer one.
 * A review defined by only one of the two is reported with `0` for the ladder
 * that does not define it, which is how a truncated ladder makes itself
 * visible.
 *
 * @param variant - Variant rendering.
 * @returns One row per review at which the two disagree.
 */
export function variantDisagreements(variant: SchedulerVariant): SchedulerDisagreement[] {
  const canonical = schedulerById(variant.scheduler).ladder;
  const length = Math.max(canonical.length, variant.ladder.length);
  const rows: SchedulerDisagreement[] = [];
  for (let index = 0; index < length; index += 1) {
    const canonicalSeconds = canonical[index] ?? 0;
    const variantSeconds = variant.ladder[index] ?? 0;
    if (canonicalSeconds === variantSeconds) {
      continue;
    }
    rows.push({
      review: index + 1,
      canonicalSeconds,
      variantSeconds,
      ratio: canonicalSeconds === 0 ? 0 : round2(variantSeconds / canonicalSeconds),
    });
  }
  return rows;
}

/** Headline counts for the service index and `/health`. */
export function retentionStats(): {
  studies: number;
  intervals: number;
  measurements: number;
  schedulers: number;
  variants: number;
  misattributed: number;
} {
  return {
    studies: FORGETTING_STUDIES.length,
    intervals: FORGETTING_OBSERVATIONS.length,
    measurements: FORGETTING_STUDIES.length * FORGETTING_OBSERVATIONS.length,
    schedulers: SCHEDULERS.length,
    variants: SCHEDULER_VARIANTS.length,
    misattributed: SCHEDULERS.filter((scheduler) => scheduler.claimsEbbinghaus).length,
  };
}
