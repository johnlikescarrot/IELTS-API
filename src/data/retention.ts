/**
 * The retention layer: spaced-repetition schedules, the forgetting curve they
 * are justified by, and the vocabulary lists they are applied to.
 *
 * ## Why this dataset exists
 *
 * Every IELTS vocabulary application ships a review schedule, and almost all of
 * them justify it with the same three words — "the Ebbinghaus forgetting curve".
 * What the schedules actually contain is never the same twice, is almost never
 * cited, and is frequently inconsistent inside a single codebase. The upstream
 * surveyed here
 * ([`Iamdacai/ielts-vocab-system`](https://github.com/Iamdacai/ielts-vocab-system),
 * a deployed WeChat mini-programme with a Node/SQLite backend serving two IELTS
 * word lists) is a clean example: it contains *two* schedules that disagree with
 * each other. A `SpacedRepetitionAlgorithm` class schedules the first review
 * five minutes after learning and the eighth fifteen days later; the HTTPS
 * server that actually answers the mini-programme's requests hard-codes a
 * different array of whole-day gaps, twice, and a documented 2026 change moved
 * the first review from the learning day to the following day. Neither array
 * cites anything.
 *
 * This module publishes the schedules as data, so that they can be compared
 * rather than asserted:
 *
 * 1. **The schedules themselves** ({@link REVIEW_SCHEDULES}) — seven schedules
 *    from four lineages, each with the unit its source states, the year, and a
 *    URL at which the interval list can be verified.
 * 2. **The curve** ({@link EBBINGHAUS_CURVE}) — Ebbinghaus's own retention
 *    equation together with the seven savings measurements he published in
 *    1885, so that any claim made about "the forgetting curve" can be checked
 *    against the curve. The test suite refits the equation to the observations
 *    on every run.
 * 3. **The word lists** ({@link vocabularyLibraries}) — how many headwords a
 *    schedule is actually being asked to carry, taken from the deployed system
 *    and from this API's own Cambridge extraction.
 * 4. **The mastery rule** ({@link MASTERY_RULE}) — the deployed reinforcement
 *    rule, whose reward and penalty are deliberately asymmetric, published with
 *    the asymmetry measured rather than described.
 *
 * Nothing here is a recommendation. The schedules are recorded as found; where
 * they disagree, `/v1/retention/compare` reports where and by how much.
 */

import { badRequest, notFound } from '../lib/errors.js';
import { vocabularyStats } from './vocabulary.js';

import type {
  MasteryRule,
  RetentionCurveModel,
  ReviewSchedule,
  ScheduleFamily,
  ScheduleProvenance,
  VocabularyLibrary,
} from '../types.js';

/** Minutes in a day, used everywhere a schedule is converted to calendar days. */
export const MINUTES_PER_DAY = 1440;

/** Round to four decimal places, the precision every published interval needs. */
export function round4(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** Convert seconds to minutes at the published precision. */
function seconds(value: number): number {
  return round4(value / 60);
}

/** Convert days to minutes. */
function days(value: number): number {
  return value * MINUTES_PER_DAY;
}

/**
 * Ebbinghaus's retention function and the observations behind it.
 *
 * Ebbinghaus fitted `b = 100k / ((log t)^c + k)` to seven savings measurements
 * taken on himself between 1879 and 1880, with `t` in minutes, `k = 1.84` and
 * `c = 1.25`. The equation is reproduced here exactly as published, and the
 * seven observations are shipped with it so that the fit can be re-checked:
 * every residual is under 3.3 percentage points and the root-mean-square error
 * is under 2 percentage points. The test suite asserts both.
 *
 * The curve describes *savings* — the proportion of relearning effort spared —
 * on nonsense syllables, for one subject, with no rehearsal between exposures.
 * It is the weakest possible evidence base for a vocabulary schedule, and it is
 * the evidence base every vocabulary schedule invokes. Treating its output as a
 * literal probability of recalling an English headword would be wrong; treating
 * it as a fixed yardstick against which competing schedules can be *ranked* is
 * the use made of it here.
 *
 * @see https://psychclassics.yorku.ca/Ebbinghaus/memory7.htm
 */
export const EBBINGHAUS_CURVE: RetentionCurveModel = {
  id: 'ebbinghaus-1885',
  name: 'Ebbinghaus retention (savings) function',
  formula: 'b = 100k / ((log10 t)^c + k), with t in minutes, k = 1.84 and c = 1.25',
  k: 1.84,
  c: 1.25,
  sourceUrl: 'https://psychclassics.yorku.ca/Ebbinghaus/memory7.htm',
  observations: [
    { minutes: 19, label: '19 minutes', savings: 58.2 },
    { minutes: 63, label: '63 minutes', savings: 44.2 },
    { minutes: 525, label: '8 hours 45 minutes', savings: 35.8 },
    { minutes: 1440, label: '1 day', savings: 33.7 },
    { minutes: 2880, label: '2 days', savings: 27.8 },
    { minutes: 8640, label: '6 days', savings: 25.4 },
    { minutes: 44640, label: '31 days', savings: 21.1 },
  ],
  note: 'Savings on nonsense syllables, single subject, no rehearsal (Ebbinghaus 1885, chapter VII). Read as a comparative yardstick between schedules, never as the probability that a learner recalls a particular word.',
};

/**
 * Default consolidation multiplier applied to memory stability by each
 * successful review.
 *
 * This is a **modelling assumption, not a finding**. Ebbinghaus measured a
 * single unrehearsed exposure and says nothing about what repetition does to
 * the curve, so a schedule cannot be scored without assuming something. A
 * doubling per successful review is the mildest assumption that reproduces the
 * expanding-interval behaviour every schedule in the catalogue exhibits, and
 * every endpoint exposes it as the `growth` parameter so that the sensitivity of
 * any conclusion to the assumption can be measured directly.
 */
export const DEFAULT_STABILITY_GROWTH = 2;

/** Number of reviews compared by default when a schedule has to be extended. */
export const DEFAULT_REVIEW_HORIZON = 8;

/** Every schedule family present in the catalogue. */
export const SCHEDULE_FAMILIES: readonly ScheduleFamily[] = [
  'ebbinghaus-curve',
  'leitner-box',
  'supermemo',
  'graduated-interval-recall',
  'app-default',
];

/** Every provenance class present in the catalogue. */
export const SCHEDULE_PROVENANCES: readonly ScheduleProvenance[] = [
  'published-algorithm',
  'shipped-default',
  'deployed-implementation',
];

/** Source file the two deployed IELTS schedules were read from. */
const DEPLOYED_ALGORITHM_URL =
  'https://github.com/Iamdacai/ielts-vocab-system/blob/master/backend/spaced-repetition-algorithm.js';

/** Document recording the 2026 change to the deployed daily schedule. */
const DEPLOYED_CHANGE_URL =
  'https://github.com/Iamdacai/ielts-vocab-system/blob/master/REVIEW_STRATEGY_UPDATE.md';

/**
 * The catalogue.
 *
 * Ordered so that the two deployed IELTS schedules come first: they are the
 * reason the dataset exists, and everything else is the comparison class.
 */
export const REVIEW_SCHEDULES: readonly ReviewSchedule[] = [
  {
    id: 'ielts-app-intraday',
    name: 'Deployed IELTS vocabulary app — intraday schedule',
    family: 'ebbinghaus-curve',
    provenance: 'deployed-implementation',
    year: 2026,
    sourceUrl: DEPLOYED_ALGORITHM_URL,
    publishedUnit: 'minutes',
    intervalsMinutes: [5, 30, 720, 1440, 2880, 5760, 10080, 21600],
    terminal: { kind: 'mastery-scaled', baseMinutes: 21600, maxFactor: 2 },
    note: 'The `SpacedRepetitionAlgorithm` class of the deployed system, documented in its own header as "the Ebbinghaus forgetting curve" with no citation. Two of its eight reviews fall on the learning day. Past the eighth review the final interval is scaled by 1 + mastery/100, so a fully mastered word is seen every 30 days at most.',
  },
  {
    id: 'ielts-app-daily-2026-03',
    name: 'Deployed IELTS vocabulary app — daily schedule, before March 2026',
    family: 'app-default',
    provenance: 'deployed-implementation',
    year: 2026,
    sourceUrl: DEPLOYED_CHANGE_URL,
    publishedUnit: 'days',
    intervalsMinutes: [0, days(1), days(2), days(4), days(7), days(15), days(21), days(30)],
    terminal: { kind: 'repeat-last' },
    note: "The `REVIEW_STAGES` array hard-coded twice in the production HTTPS server, superseded on 2026-03-22. Its first gap is zero: a word entered the same evening's review queue, so learning and first review were the same event.",
  },
  {
    id: 'ielts-app-daily-current',
    name: 'Deployed IELTS vocabulary app — daily schedule, current',
    family: 'app-default',
    provenance: 'deployed-implementation',
    year: 2026,
    sourceUrl: DEPLOYED_CHANGE_URL,
    publishedUnit: 'days',
    intervalsMinutes: [days(1), days(2), days(4), days(7), days(15), days(21), days(30), days(30)],
    terminal: { kind: 'repeat-last' },
    note: 'The replacement shipped on 2026-03-22, justified in the changelog by the observation that "forgetting mainly happens after 24 hours" and by conformity with three consumer apps. It shifts every stage of the previous array one place later and drops the same-day review entirely.',
  },
  {
    id: 'leitner-5box',
    name: 'Leitner five-box system',
    family: 'leitner-box',
    provenance: 'published-algorithm',
    year: 1972,
    sourceUrl: 'https://en.wikipedia.org/wiki/Leitner_system',
    publishedUnit: 'days',
    intervalsMinutes: [days(1), days(2), days(4), days(8), days(16)],
    terminal: { kind: 'repeat-last' },
    note: "Leitner's physical card boxes, in the doubling form most commonly taught. The boxes are the schedule: a card promoted out of box n waits twice as long as it did in box n-1. A failed card returns to box 1, which no fixed interval list can express.",
  },
  {
    id: 'supermemo-2',
    name: 'SuperMemo 2 (SM-2), default ease',
    family: 'supermemo',
    provenance: 'published-algorithm',
    year: 1987,
    sourceUrl: 'https://super-memory.com/english/ol/sm2.htm',
    publishedUnit: 'days',
    intervalsMinutes: [days(1), days(6)],
    terminal: { kind: 'multiply', factor: 2.5 },
    note: "The algorithm behind every modern spaced-repetition application. Only the first two intervals are fixed; from the third the previous interval is multiplied by an ease factor that starts at 2.5 and is adjusted by the learner's own grade. The catalogue holds the default-ease trajectory, which is the trajectory a learner who never fails a card follows.",
  },
  {
    id: 'anki-default',
    name: 'Anki shipped defaults',
    family: 'supermemo',
    provenance: 'shipped-default',
    year: 2024,
    sourceUrl: 'https://docs.ankiweb.net/deck-options.html',
    publishedUnit: 'minutes',
    intervalsMinutes: [1, 10, days(1)],
    terminal: { kind: 'multiply', factor: 2.5 },
    note: "Anki's out-of-the-box deck options: learning steps of 1 and 10 minutes, a graduating interval of 1 day, and a starting ease of 250%. Included because it is the configuration the overwhelming majority of Anki users never change, and therefore the schedule most IELTS candidates using Anki are actually on.",
  },
  {
    id: 'pimsleur-gir',
    name: 'Pimsleur graduated interval recall',
    family: 'graduated-interval-recall',
    provenance: 'published-algorithm',
    year: 1967,
    sourceUrl: 'https://en.wikipedia.org/wiki/Pimsleur_language_learning_system',
    publishedUnit: 'seconds',
    intervalsMinutes: [
      seconds(5),
      seconds(25),
      2,
      10,
      60,
      300,
      days(1),
      days(5),
      days(25),
      days(120),
      days(730),
    ],
    terminal: { kind: 'repeat-last' },
    note: 'The eleven-step interval ladder Pimsleur published in 1967 and patented in 1972, spanning five seconds to two years. Months are taken as 30 days and years as 365 days. It is the only schedule in the catalogue whose first review happens within a minute, and the only one designed for spoken drilling rather than card review.',
  },
];

/** The catalogue keyed by identifier. */
const SCHEDULES_BY_ID = new Map(REVIEW_SCHEDULES.map((schedule) => [schedule.id, schedule]));

/** Every schedule identifier, in catalogue order. */
export const SCHEDULE_IDS: readonly string[] = REVIEW_SCHEDULES.map((schedule) => schedule.id);

/**
 * Resolve a schedule by identifier.
 *
 * @param id - Schedule identifier.
 * @returns The schedule.
 * @throws {HttpError} `404` when no schedule has that identifier.
 */
export function reviewSchedule(id: string): ReviewSchedule {
  const schedule = SCHEDULES_BY_ID.get(id);
  if (schedule === undefined) {
    throw notFound(`Unknown schedule "${id}".`, { parameter: 'schedule', allowed: SCHEDULE_IDS.join(',') });
  }
  return schedule;
}

/**
 * Resolve a schedule supplied as a query parameter.
 *
 * A bad query parameter is a `400`, not a `404`: the resource exists, the
 * request describing it does not.
 *
 * @param id - Schedule identifier.
 * @param parameter - Parameter name to name in the error.
 */
export function requireSchedule(id: string, parameter: string): ReviewSchedule {
  const schedule = SCHEDULES_BY_ID.get(id);
  if (schedule === undefined) {
    throw badRequest(`Parameter "${parameter}" must be a known schedule.`, {
      parameter,
      received: id,
      allowed: SCHEDULE_IDS.join(','),
    });
  }
  return schedule;
}

/**
 * The mastery-score update rule of the deployed system.
 *
 * A correct answer adds five points per unit of self-reported confidence; a
 * wrong answer removes eight. The asymmetry is the interesting part and it is
 * undocumented upstream: at any confidence, one wrong answer costs exactly 1.6
 * correct answers, so a learner answering correctly 61.5% of the time hovers at
 * whatever mastery they started from. Because confidence is self-reported and
 * multiplies both terms, a confident learner moves 5x faster in both
 * directions than a diffident one who knows exactly as much.
 */
export const MASTERY_RULE: MasteryRule = {
  id: 'ielts-app-mastery-2026',
  sourceUrl: DEPLOYED_ALGORITHM_URL,
  rewardPerConfidence: 5,
  penaltyPerConfidence: 8,
  confidenceRange: [1, 5],
  masteryRange: [0, 100],
  penaltyRatio: 1.6,
  note: "Read from `updateMasteryScore` in the deployed system. Mastery is clamped to 0-100 and rounded to two decimals, and it feeds the intraday schedule's terminal interval. Self-reported confidence scales reward and penalty alike, so the rule measures confidence at least as much as it measures knowledge.",
};

/** The twenty-two scene groups of the Zhenjing list, in the order it prints them. */
const ZHENJING_SCENES: readonly (readonly [string, string, string, number])[] = [
  ['01-physical-geography', '自然地理', 'Physical geography', 241],
  ['02-plant-science', '植物研究', 'Plant science', 130],
  ['03-animal-conservation', '动物保护', 'Animal conservation', 168],
  ['04-space-exploration', '太空探索', 'Space exploration', 75],
  ['05-schooling', '学校教育', 'Schooling and education', 401],
  ['06-science-and-invention', '科技发明', 'Science and invention', 122],
  ['07-culture-and-history', '文化历史', 'Culture and history', 79],
  ['08-language-change', '语言演化', 'Language change', 68],
  ['09-entertainment-and-sport', '娱乐运动', 'Entertainment and sport', 176],
  ['10-objects-and-materials', '物品材料', 'Objects and materials', 152],
  ['11-fashion-and-trends', '时尚潮流', 'Fashion and trends', 113],
  ['12-food-and-nutrition', '饮食健康', 'Food and nutrition', 173],
  ['13-buildings-and-places', '建筑场所', 'Buildings and places', 134],
  ['14-transport-and-travel', '交通旅行', 'Transport and travel', 134],
  ['15-states-and-government', '国家政府', 'States and government', 149],
  ['16-society-and-economy', '社会经济', 'Society and economy', 171],
  ['17-law-and-regulation', '法律法规', 'Law and regulation', 117],
  ['18-war-and-conflict', '沙场争锋', 'War and conflict', 213],
  ['19-social-roles', '社会角色', 'Social roles', 121],
  ['20-actions-and-behaviour', '行为动作', 'Actions and behaviour', 268],
  ['21-body-and-mind', '身心健康', 'Body and mind', 417],
  ['22-time-and-dates', '时间日期', 'Time and dates', 52],
];

/** Sum of the published scene sizes; validated against the published total. */
const ZHENJING_TOTAL = ZHENJING_SCENES.reduce((total, [, , , words]) => total + words, 0);

/**
 * The word lists a schedule is applied to.
 *
 * Two come from the deployed system, whose own documentation publishes their
 * sizes; the third is this API's Cambridge extraction, computed live so that it
 * can never drift from the dataset it describes. Putting them side by side is
 * the point: the deployed system claims 4,464 headwords for Cambridge 1-18
 * while this API's independent extraction of Cambridge 1-22 — four more volumes
 * — yields fewer. Word lists are not comparable unless the lemmatisation and
 * the inclusion rule are stated, and neither list states one.
 */
export function vocabularyLibraries(): readonly VocabularyLibrary[] {
  const own = vocabularyStats();
  return [
    {
      id: 'cambridge-1-18-app',
      name: '剑桥雅思 1-18',
      englishName: 'Cambridge IELTS 1-18 (as shipped by the deployed app)',
      words: 4464,
      partition: 'Cambridge IELTS volume',
      partitions: 18,
      sourceUrl: 'https://github.com/Iamdacai/ielts-vocab-system/blob/master/README.md',
      provenance: 'deployed-implementation',
      breakdown: null,
      note: 'Headword count as published by the deployed system. The inclusion rule and the lemmatisation are not stated upstream, so the figure is recorded, not endorsed.',
    },
    {
      id: 'zhenjing-scenes',
      name: '雅思词汇真经',
      englishName: 'IELTS Vocabulary Zhenjing (Liu Hongbo), scene-grouped',
      words: ZHENJING_TOTAL,
      partition: 'Scene group',
      partitions: ZHENJING_SCENES.length,
      sourceUrl:
        'https://github.com/Iamdacai/ielts-vocab-system/blob/master/docs/%E8%AF%8D%E5%BA%93%E6%95%B4%E5%90%88%E8%AF%B4%E6%98%8E.md',
      provenance: 'deployed-implementation',
      breakdown: ZHENJING_SCENES.map(([id, name, englishName, words]) => ({
        id,
        name,
        englishName,
        words,
      })),
      note: "Liu Hongbo's scene-grouped IELTS list as integrated by the deployed system from `hefengxian/my-ielts`. The twenty-two published scene sizes sum exactly to the published total of 3,674, which the test suite checks; the largest scene (Body and mind, 417 words) is eight times the smallest (Time and dates, 52).",
    },
    {
      id: 'cambridge-1-22-api',
      name: 'Cambridge IELTS 1-22',
      englishName: 'Cambridge IELTS 1-22 headwords extracted by this API',
      words: own.words,
      partition: 'Cambridge IELTS volume',
      partitions: own.volumes,
      sourceUrl: 'https://github.com/johnlikescarrot/IELTS-API/blob/main/docs/DATA.md',
      provenance: 'derived-from-this-api',
      breakdown: null,
      note: "This API's own extraction, computed from `data/vocabulary.json` at request time. Reproducible byte-for-byte from the upstream workbook by `scripts/extract_vocabulary.py`, which is the property the other two lists lack.",
    },
  ];
}

/**
 * Resolve a vocabulary library by identifier.
 *
 * @param id - Library identifier.
 * @param parameter - Parameter name to name in the error.
 */
export function requireLibrary(id: string, parameter: string): VocabularyLibrary {
  const libraries = vocabularyLibraries();
  const library = libraries.find((candidate) => candidate.id === id);
  if (library === undefined) {
    throw badRequest(`Parameter "${parameter}" must be a known vocabulary library.`, {
      parameter,
      received: id,
      allowed: libraries.map((candidate) => candidate.id).join(','),
    });
  }
  return library;
}

/**
 * The ratio between the optimal review gap and the interval a learner has to
 * retain material for, as measured by Cepeda and colleagues.
 *
 * Cepeda et al. (2008) ran the only large study that varies both the gap and
 * the retention interval, and found the optimal gap to be roughly 10-20% of the
 * retention interval — for an exam eight weeks away, review roughly weekly; for
 * one a year away, review roughly monthly. It is the single most actionable
 * result in the literature for exam candidates and no schedule in the catalogue
 * uses it, because a fixed interval list cannot: the optimum depends on a date
 * the list does not know. `/v1/retention/plan?examIn=` reports it alongside
 * whichever fixed schedule was requested.
 *
 * @see https://doi.org/10.1111/j.1467-9280.2008.02209.x
 */
export const OPTIMAL_SPACING_RATIO = {
  id: 'cepeda-2008',
  low: 0.1,
  high: 0.2,
  sourceUrl: 'https://doi.org/10.1111/j.1467-9280.2008.02209.x',
  note: 'Cepeda, Vul, Rohrer, Wixted and Pashler (2008), "Spacing effects in learning: a temporal ridgeline of optimal retention", Psychological Science 19(11), 1095-1102. The ridgeline is broad and shallow: gaps anywhere in the band cost little, gaps far below it cost a great deal.',
} as const;
