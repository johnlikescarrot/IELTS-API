/**
 * Indicative, fully transparent essay diagnostics.
 *
 * IELTS Writing is scored by trained human examiners against four analytic
 * criteria. Nothing here predicts an examiner's decision, and the API never
 * claims to: the estimator below is a deterministic, documented rubric over
 * observable surface features (length, sentence variety, lexical diversity,
 * readability and cohesive-device use) that a researcher can inspect, replicate
 * and criticise. Every returned band carries the evidence that produced it.
 */

import { countText, diversity, readability, sentenceStats, tokenize } from './text.js';

import type { ReadabilityScores, DiversityScores, SentenceStats } from './text.js';

/** The Writing tasks the estimator understands. */
export type WritingTask = 'task-1' | 'task-2';

/** Minimum word counts published by the IELTS partners. */
export const MINIMUM_WORDS: Record<WritingTask, number> = { 'task-1': 150, 'task-2': 250 };

/** Recommended time budget in minutes, published by the IELTS partners. */
export const SUGGESTED_MINUTES: Record<WritingTask, number> = { 'task-1': 20, 'task-2': 40 };

/**
 * Cohesive devices counted by the estimator, grouped by discourse function.
 *
 * The inventory follows the standard functional categories used in the
 * cohesion literature (Halliday & Hasan, 1976).
 */
export const COHESIVE_DEVICES: Readonly<Record<string, readonly string[]>> = {
  addition: ['furthermore', 'moreover', 'in addition', 'additionally', 'besides', 'also', 'what is more'],
  contrast: [
    'however',
    'nevertheless',
    'nonetheless',
    'on the other hand',
    'in contrast',
    'conversely',
    'whereas',
    'although',
    'even though',
    'despite',
    'in spite of',
    'yet',
  ],
  cause: [
    'because',
    'since',
    'as a result',
    'therefore',
    'thus',
    'consequently',
    'hence',
    'owing to',
    'due to',
  ],
  exemplification: ['for example', 'for instance', 'such as', 'namely', 'to illustrate', 'in particular'],
  sequence: ['firstly', 'secondly', 'thirdly', 'finally', 'subsequently', 'to begin with', 'lastly'],
  conclusion: ['in conclusion', 'to conclude', 'to sum up', 'in summary', 'overall', 'on balance'],
  concession: ['admittedly', 'granted', 'of course', 'it is true that'],
};

/** Cohesive devices found in a text, grouped by function. */
export interface CohesionReport {
  /** Number of cohesive-device occurrences. */
  total: number;
  /** Number of distinct devices used. */
  distinct: number;
  /** Number of discourse functions represented. */
  functions: number;
  /** Occurrences per function. */
  byFunction: Record<string, number>;
  /** The devices actually found, sorted alphabetically. */
  devices: string[];
}

/**
 * Count cohesive devices in a text.
 *
 * Matching is case-insensitive and respects word boundaries, so `also` does
 * not match inside `alsatian`.
 *
 * @param text - Raw input text.
 * @returns The cohesion report.
 */
export function analyseCohesion(text: string): CohesionReport {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z']+/g, ' ')} `;
  const byFunction: Record<string, number> = {};
  const devices: string[] = [];
  let total = 0;
  for (const [group, phrases] of Object.entries(COHESIVE_DEVICES)) {
    let groupTotal = 0;
    for (const phrase of phrases) {
      const needle = ` ${phrase} `;
      let index = haystack.indexOf(needle);
      let occurrences = 0;
      while (index !== -1) {
        occurrences += 1;
        index = haystack.indexOf(needle, index + 1);
      }
      if (occurrences > 0) {
        devices.push(phrase);
        groupTotal += occurrences;
      }
    }
    byFunction[group] = groupTotal;
    total += groupTotal;
  }
  return {
    total,
    distinct: devices.length,
    functions: Object.values(byFunction).filter((count) => count > 0).length,
    byFunction,
    devices: devices.sort((left, right) => left.localeCompare(right)),
  };
}

/** One scored dimension of the indicative rubric. */
export interface RubricDimension {
  /** Dimension name. */
  name: string;
  /** Indicative band for this dimension (0-9, half steps). */
  band: number;
  /** Weight of this dimension in the indicative overall estimate. */
  weight: number;
  /** The observation that produced the band. */
  evidence: string;
}

/** Full diagnostic report for one essay. */
export interface EssayReport {
  /** Task the essay was scored against. */
  task: WritingTask;
  /** Published minimum word count for the task. */
  minimumWords: number;
  /** Recommended time budget in minutes. */
  suggestedMinutes: number;
  /** Whether the response meets the published minimum length. */
  meetsMinimumLength: boolean;
  /** Word count of the response. */
  words: number;
  /** Readability measures. */
  readability: ReadabilityScores;
  /** Lexical diversity measures. */
  diversity: DiversityScores;
  /** Sentence-length statistics. */
  sentences: SentenceStats;
  /** Cohesive-device usage. */
  cohesion: CohesionReport;
  /** The scored dimensions of the indicative rubric. */
  dimensions: RubricDimension[];
  /** Weighted, half-band-rounded indicative estimate. */
  indicativeBand: number;
  /** Actionable, evidence-linked suggestions. */
  suggestions: string[];
  /** Statement of what the estimate is and is not. */
  disclaimer: string;
}

/** Clamp a value into the reportable band range and snap it to half bands. */
function toBand(value: number): number {
  const clamped = Math.min(9, Math.max(0, value));
  return Math.round(clamped * 2) / 2;
}

/** A non-empty, ascending list of `[floor, band]` pairs. */
type Thresholds = readonly [readonly [number, number], ...(readonly [number, number])[]];

/** Map a value onto a band using ascending thresholds. */
function bandFromThresholds(value: number, thresholds: Thresholds): number {
  let band = thresholds[0][1];
  for (const [floor, awarded] of thresholds) {
    if (value >= floor) {
      band = awarded;
    }
  }
  return band;
}

/**
 * Produce an indicative diagnostic report for a Writing response.
 *
 * @param text - The candidate's response.
 * @param task - Which Writing task the response answers.
 * @returns The diagnostic report, including the evidence for every band.
 */
export function analyseEssay(text: string, task: WritingTask): EssayReport {
  const counts = countText(text);
  const tokens = tokenize(text);
  const scores = readability(counts);
  const lexical = diversity(tokens);
  const sentences = sentenceStats(text);
  const cohesion = analyseCohesion(text);
  const minimumWords = MINIMUM_WORDS[task];
  const lengthRatio = counts.words / minimumWords;

  const dimensions: RubricDimension[] = [
    {
      name: 'taskLength',
      weight: 0.2,
      band: bandFromThresholds(lengthRatio, [
        [0, 3],
        [0.5, 4.5],
        [0.8, 5.5],
        [1, 6.5],
        [1.15, 7],
        [1.35, 7.5],
        [1.7, 7],
        [2.5, 6],
      ]),
      evidence: `${counts.words} words against a published minimum of ${minimumWords} (ratio ${lengthRatio.toFixed(2)}).`,
    },
    {
      name: 'lexicalResource',
      weight: 0.3,
      band: bandFromThresholds(lexical.mtld, [
        [0, 4],
        [40, 5],
        [55, 6],
        [70, 7],
        [90, 8],
        [110, 8.5],
      ]),
      evidence: `MTLD ${lexical.mtld} over ${lexical.types} types in ${lexical.tokens} tokens; ${lexical.hapaxLegomena} hapax legomena.`,
    },
    {
      name: 'grammaticalRange',
      weight: 0.25,
      band: bandFromThresholds(sentences.lengthStandardDeviation, [
        [0, 4],
        [3, 5],
        [5, 6],
        [7, 7],
        [9, 8],
      ]),
      evidence: `Mean sentence length ${sentences.meanLength} words (sd ${sentences.lengthStandardDeviation}, range ${sentences.shortest}-${sentences.longest}).`,
    },
    {
      name: 'coherenceAndCohesion',
      weight: 0.25,
      band: bandFromThresholds(cohesion.functions * 1.5 + Math.min(cohesion.distinct, 12) * 0.5, [
        [0, 4],
        [3, 5],
        [5, 6],
        [8, 7],
        [11, 8],
      ]),
      evidence: `${cohesion.total} cohesive devices spanning ${cohesion.functions} discourse functions.`,
    },
  ];

  const weighted = dimensions.reduce((sum, dimension) => sum + dimension.band * dimension.weight, 0);
  const indicativeBand = toBand(weighted);

  const suggestions: string[] = [];
  if (counts.words < minimumWords) {
    suggestions.push(
      `Write at least ${minimumWords} words: under-length responses are penalised under Task Achievement/Response. You are ${minimumWords - counts.words} words short.`,
    );
  }
  if (lexical.mtld < 55) {
    suggestions.push(
      'Widen lexical range: MTLD below 55 indicates heavy repetition of the same word families. Paraphrase key terms from the prompt instead of repeating them.',
    );
  }
  if (sentences.lengthStandardDeviation < 5) {
    suggestions.push(
      'Vary sentence length and structure: mix short emphatic sentences with complex ones using relative and subordinate clauses.',
    );
  }
  if (cohesion.functions < 4) {
    suggestions.push(
      'Signpost more explicitly: use devices from a wider set of discourse functions (addition, contrast, cause, exemplification, sequence, conclusion).',
    );
  }
  if (scores.fleschReadingEase > 75) {
    suggestions.push(
      'The response reads as very simple prose; academic register typically produces a Flesch Reading Ease below 60.',
    );
  }
  if (sentences.longest > 45) {
    suggestions.push(
      `Your longest sentence runs to ${sentences.longest} words; over-long sentences usually cost accuracy marks. Split it.`,
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(
      'Surface features are all within the ranges typical of strong responses; focus next on argument development and task-specific content.',
    );
  }

  return {
    task,
    minimumWords,
    suggestedMinutes: SUGGESTED_MINUTES[task],
    meetsMinimumLength: counts.words >= minimumWords,
    words: counts.words,
    readability: scores,
    diversity: lexical,
    sentences,
    cohesion,
    dimensions,
    indicativeBand,
    suggestions,
    disclaimer:
      'This is a deterministic, surface-feature rubric published for research reproducibility. It is not an IELTS score, is not produced by a trained examiner, and does not assess task content, argument quality or accuracy.',
  };
}
