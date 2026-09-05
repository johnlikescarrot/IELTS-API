/**
 * Text-analysis engine behind `/v1/analyze/*`.
 *
 * Three analyses are built on the shared measurement pipeline in
 * {@link measureText}:
 *
 * 1. **Readability** — six classical formulae, plus the position of the
 *    passage inside the distribution of the 1,501 measured passages published
 *    by `/v1/tests`, so a new passage can be placed against a real corpus.
 * 2. **Lexical profile** — coverage of the submitted text against the
 *    Cambridge IELTS 1-22 headword list, lexical density and diversity.
 * 3. **Writing diagnostics** — objective, descriptor-aligned observations
 *    about a Task 1 or Task 2 response.
 *
 * Nothing here predicts a band score. IELTS bands are awarded by trained
 * examiners against the analytic descriptors, and no surface-feature model can
 * substitute for that judgement. Every output is therefore a *measurement*
 * with an explicit caveat, which is also what makes the endpoints citable.
 */

import { allEntries } from '../data/vocabulary.js';
import { COHESIVE_DEVICES_BY_LENGTH, COHESION_RELATIONS, isFunctionWord } from '../data/lexicon.js';
import { practiceStats } from '../data/practiceTests.js';
import { describeReadingEase, measureText, tokenize } from './text.js';

import type { CohesionRelation } from '../data/lexicon.js';
import type { NumericSummary } from '../types.js';
import type { TextMeasurement } from './text.js';

/* -------------------------------------------------------------------------- */
/* Readability                                                                */
/* -------------------------------------------------------------------------- */

/** Where a passage sits relative to the corpus of measured passages. */
export interface CorpusComparison {
  /** Group the passage was compared against. */
  group: string;
  /** Mean Flesch Reading Ease of that group. */
  groupMeanReadingEase: number;
  /** Difference between the passage and the group mean (positive = easier). */
  differenceFromGroupMean: number;
}

/** Result of `/v1/analyze/readability`. */
export interface ReadabilityAnalysis {
  /** Full measurement. */
  measurement: TextMeasurement;
  /** Coarse difficulty label for the Reading Ease score. */
  difficulty: string;
  /** Indicative CEFR level of a reader who copes with the passage. */
  cefr: string;
  /** Position against each measured group of the practice-test index. */
  corpus: CorpusComparison[];
  /** Caveats that must travel with the numbers. */
  caveats: string[];
}

/**
 * Place a Reading Ease score against each measured group of a corpus.
 *
 * Groups whose Reading Ease summary is `null` (too few measured passages) are
 * skipped rather than reported as zero.
 *
 * @param ease - Reading Ease score of the submitted passage.
 * @param groups - Readability summaries keyed by group name.
 */
export function compareWithCorpus(
  ease: number,
  groups: Record<string, { fleschReadingEase: NumericSummary | null }>,
): CorpusComparison[] {
  const corpus: CorpusComparison[] = [];
  for (const [group, summary] of Object.entries(groups)) {
    const groupEase = summary.fleschReadingEase;
    if (groupEase === null) {
      continue;
    }
    corpus.push({
      group,
      groupMeanReadingEase: groupEase.mean,
      differenceFromGroupMean: Math.round((ease - groupEase.mean) * 100) / 100,
    });
  }
  return corpus;
}

/**
 * Measure a passage and place it against the published corpus.
 *
 * @param text - Passage to measure.
 * @returns The analysis, or `null` when the passage contains no words.
 */
export function analyzeReadability(text: string): ReadabilityAnalysis | null {
  const measurement = measureText(text);
  if (measurement === null) {
    return null;
  }
  const band = describeReadingEase(measurement.fleschReadingEase);
  const corpus = compareWithCorpus(measurement.fleschReadingEase, practiceStats().readabilityByGroup);
  const caveats = [
    'Readability formulae measure surface features (sentence length, syllable counts) and not conceptual difficulty, coherence or topic familiarity.',
    'The CEFR level is indicative and derives from the distribution of the CEFR-graded lessons indexed by /v1/tests, not from an official alignment study.',
  ];
  if (!measurement.reliable) {
    caveats.unshift(
      'The passage is shorter than 20 words; the formulae are unreliable on samples this small and the scores are reported for completeness only.',
    );
  }
  return { measurement, difficulty: band.label, cefr: band.cefr, corpus, caveats };
}

/* -------------------------------------------------------------------------- */
/* Lexical profile                                                            */
/* -------------------------------------------------------------------------- */

/** One headword of the reference list found in the submitted text. */
export interface LexicalHit {
  /** The Cambridge headword. */
  word: string;
  /** How many times it occurs in the submitted text. */
  count: number;
  /** Cambridge IELTS volumes the headword appears in. */
  volumes: number[];
}

/** Result of `/v1/analyze/vocabulary`. */
export interface LexicalProfile {
  /** Running words. */
  tokens: number;
  /** Distinct lower-cased word forms. */
  types: number;
  /** Type-token ratio over all tokens. */
  typeTokenRatio: number;
  /** Content tokens (tokens that are not closed-class function words). */
  contentTokens: number;
  /** Distinct content word forms. */
  contentTypes: number;
  /** Content tokens divided by all tokens (Ure's lexical density). */
  lexicalDensity: number;
  /** Type-token ratio computed over content words only. */
  contentTypeTokenRatio: number;
  /** Distinct forms occurring exactly once, divided by all distinct forms. */
  hapaxRatio: number;
  /** Distinct forms of three or more syllables, divided by all distinct forms. */
  sophistication: number;
  /** Distinct submitted forms matching a Cambridge IELTS headword. */
  cambridgeMatches: number;
  /** `cambridgeMatches / types`. */
  cambridgeCoverage: number;
  /** The matched headwords, most frequent first. */
  matched: LexicalHit[];
  /** Distinct forms not on the Cambridge list, most frequent first. */
  offList: LexicalHit[];
  /** Caveats that must travel with the numbers. */
  caveats: string[];
}

/** Lower-cased Cambridge headword index, built once. */
let headwords: Map<string, number[]> | undefined;

/** Return (and memoise) the Cambridge headword index. */
function headwordIndex(): Map<string, number[]> {
  if (headwords === undefined) {
    headwords = new Map();
    for (const entry of allEntries()) {
      headwords.set(entry.word.toLowerCase(), entry.volumes);
    }
  }
  return headwords;
}

/** Drop the memoised headword index (used after a dataset reload). */
export function clearHeadwordIndex(): void {
  headwords = undefined;
}

/** Count syllables cheaply for the sophistication measure. */
function isSophisticated(word: string): boolean {
  const groups = word.toLowerCase().match(/[aeiouy]+/g);
  return (groups === null ? 0 : groups.length) >= 3;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Profile the vocabulary of a text against the Cambridge IELTS 1-22 list.
 *
 * @param text - Text to profile.
 * @param sampleSize - How many matched and off-list forms to return.
 * @returns The profile, or `null` when the text contains no words.
 */
export function analyzeVocabulary(text: string, sampleSize: number): LexicalProfile | null {
  const tokens = tokenize(text).map((token) => token.toLowerCase());
  if (tokens.length === 0) {
    return null;
  }
  const frequency = new Map<string, number>();
  let contentTokens = 0;
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
    if (!isFunctionWord(token)) {
      contentTokens += 1;
    }
  }

  const index = headwordIndex();
  const matched: LexicalHit[] = [];
  const offList: LexicalHit[] = [];
  let contentTypes = 0;
  let hapax = 0;
  let sophisticated = 0;

  for (const [word, count] of frequency) {
    if (!isFunctionWord(word)) {
      contentTypes += 1;
    }
    if (count === 1) {
      hapax += 1;
    }
    if (isSophisticated(word)) {
      sophisticated += 1;
    }
    const volumes = index.get(word);
    if (volumes === undefined) {
      offList.push({ word, count, volumes: [] });
    } else {
      matched.push({ word, count, volumes });
    }
  }

  const byFrequency = (left: LexicalHit, right: LexicalHit): number =>
    right.count - left.count || left.word.localeCompare(right.word);
  matched.sort(byFrequency);
  offList.sort(byFrequency);

  const types = frequency.size;
  return {
    tokens: tokens.length,
    types,
    typeTokenRatio: round(types / tokens.length, 4),
    contentTokens,
    contentTypes,
    lexicalDensity: round(contentTokens / tokens.length, 4),
    contentTypeTokenRatio: contentTokens === 0 ? 0 : round(contentTypes / contentTokens, 4),
    hapaxRatio: round(hapax / types, 4),
    sophistication: round(sophisticated / types, 4),
    cambridgeMatches: matched.length,
    cambridgeCoverage: round(matched.length / types, 4),
    matched: matched.slice(0, sampleSize),
    offList: offList.slice(0, sampleSize),
    caveats: [
      'Matching is exact surface-form matching against the Cambridge IELTS 1-22 headword list; inflected forms (for example "developed" against the headword "develop") are reported as off-list.',
      'Coverage describes overlap with one published word list. It is not a measure of vocabulary quality, appropriacy or accuracy, all of which the Lexical Resource criterion assesses.',
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Cohesion                                                                   */
/* -------------------------------------------------------------------------- */

/** One cohesive device found in a text. */
export interface CohesionHit {
  /** The device. */
  phrase: string;
  /** Relation it signals. */
  relation: CohesionRelation;
  /** Register band of the device. */
  register: 'basic' | 'academic';
  /** How many times it occurs. */
  count: number;
}

/** Result of the cohesion analysis. */
export interface CohesionAnalysis {
  /** Total device occurrences. */
  total: number;
  /** Distinct devices used. */
  distinct: number;
  /** Occurrences per 100 words. */
  perHundredWords: number;
  /** Distinct relations signalled, out of the eleven recognised. */
  relationsUsed: number;
  /** Occurrences per relation. */
  byRelation: Record<string, number>;
  /** Occurrences per register band. */
  byRegister: Record<'basic' | 'academic', number>;
  /** The devices found, most frequent first. */
  devices: CohesionHit[];
  /** Devices repeated four or more times, which examiners read as mechanical. */
  overused: string[];
  /** Relations not signalled at all. */
  missingRelations: CohesionRelation[];
}

/** Escape a phrase for use inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find and classify the cohesive devices in a text.
 *
 * Longer devices are matched first and their spans are consumed, so
 * `in addition to this` is never also counted as `in addition`.
 *
 * @param text - Text to scan.
 * @param words - Running-word count, used for the normalised rate.
 */
export function analyzeCohesion(text: string, words: number): CohesionAnalysis {
  let haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const devices: CohesionHit[] = [];
  const byRelation: Record<string, number> = {};
  const byRegister: Record<'basic' | 'academic', number> = { basic: 0, academic: 0 };
  let total = 0;

  for (const device of COHESIVE_DEVICES_BY_LENGTH) {
    const pattern = new RegExp(`(?<![A-Za-z'])${escapeRegExp(device.phrase)}(?![A-Za-z'])`, 'g');
    const matches = haystack.match(pattern);
    if (matches === null) {
      continue;
    }
    const count = matches.length;
    haystack = haystack.replace(pattern, (match) => '\u0000'.repeat(match.length));
    total += count;
    byRelation[device.relation] = (byRelation[device.relation] ?? 0) + count;
    byRegister[device.register] += count;
    devices.push({ phrase: device.phrase, relation: device.relation, register: device.register, count });
  }

  devices.sort((left, right) => right.count - left.count || left.phrase.localeCompare(right.phrase));
  const missingRelations = COHESION_RELATIONS.filter((relation) => (byRelation[relation] ?? 0) === 0);

  return {
    total,
    distinct: devices.length,
    perHundredWords: words === 0 ? 0 : round((total / words) * 100, 2),
    relationsUsed: COHESION_RELATIONS.length - missingRelations.length,
    byRelation,
    byRegister,
    devices,
    overused: devices.filter((device) => device.count >= 4).map((device) => device.phrase),
    missingRelations: [...missingRelations],
  };
}

/* -------------------------------------------------------------------------- */
/* Writing diagnostics                                                        */
/* -------------------------------------------------------------------------- */

/** The two Writing tasks, with their official minimum lengths. */
export const WRITING_TASKS = ['task-1', 'task-2'] as const;

/** A Writing task identifier. */
export type WritingTask = (typeof WRITING_TASKS)[number];

/** Official minimum word counts, and the time candidates are given. */
export const TASK_REQUIREMENTS: Readonly<Record<WritingTask, { minimumWords: number; minutes: number }>> = {
  'task-1': { minimumWords: 150, minutes: 20 },
  'task-2': { minimumWords: 250, minutes: 40 },
};

/** One descriptor-aligned observation about a response. */
export interface Observation {
  /** Analytic criterion the observation relates to. */
  criterion: 'taskResponse' | 'coherenceAndCohesion' | 'lexicalResource' | 'grammaticalRangeAndAccuracy';
  /** Whether the observation is favourable, neutral or unfavourable. */
  polarity: 'positive' | 'neutral' | 'negative';
  /** What was measured, in one sentence. */
  message: string;
}

/** Result of `/v1/analyze/writing`. */
export interface WritingAnalysis {
  /** Task the response was checked against. */
  task: WritingTask;
  /** Official minimum length for that task. */
  minimumWords: number;
  /** Whether the response reaches the minimum. */
  meetsMinimumLength: boolean;
  /** Words still needed to reach the minimum (0 when reached). */
  wordsShortOfMinimum: number;
  /** Words per minute needed to produce the response in the exam time. */
  wordsPerExamMinute: number;
  /** Full readability measurement of the response. */
  measurement: TextMeasurement;
  /** Lexical profile of the response. */
  lexis: LexicalProfile;
  /** Cohesion analysis of the response. */
  cohesion: CohesionAnalysis;
  /** Sentence-length variation (population standard deviation, in words). */
  sentenceLengthVariation: number;
  /** Descriptor-aligned observations. */
  observations: Observation[];
  /** Caveats that must travel with the analysis. */
  caveats: string[];
}

/** Population standard deviation of the sentence lengths of a text. */
export function sentenceLengthVariation(text: string): number {
  const sentences = text
    .split(/[.!?]+(?:\s|$)/)
    .map((sentence) => tokenize(sentence).length)
    .filter((length) => length > 0);
  if (sentences.length === 0) {
    return 0;
  }
  const mean = sentences.reduce((sum, length) => sum + length, 0) / sentences.length;
  const variance = sentences.reduce((sum, length) => sum + (length - mean) ** 2, 0) / sentences.length;
  return round(Math.sqrt(variance), 2);
}

/** Build the descriptor-aligned observations for a response. */
function observationsFor(
  task: WritingTask,
  measurement: TextMeasurement,
  lexis: LexicalProfile,
  cohesion: CohesionAnalysis,
  variation: number,
): Observation[] {
  const observations: Observation[] = [];
  const minimum = TASK_REQUIREMENTS[task].minimumWords;

  if (measurement.words < minimum) {
    observations.push({
      criterion: 'taskResponse',
      polarity: 'negative',
      message: `The response is ${measurement.words} words, ${minimum - measurement.words} short of the ${minimum}-word minimum for ${task}; under-length responses are penalised under Task Response.`,
    });
  } else {
    observations.push({
      criterion: 'taskResponse',
      polarity: 'positive',
      message: `The response is ${measurement.words} words, at or above the ${minimum}-word minimum for ${task}.`,
    });
  }

  if (measurement.paragraphs < 3) {
    observations.push({
      criterion: 'coherenceAndCohesion',
      polarity: 'negative',
      message: `Only ${measurement.paragraphs} paragraph(s) were detected; Coherence and Cohesion rewards a clear paragraphed progression.`,
    });
  } else {
    observations.push({
      criterion: 'coherenceAndCohesion',
      polarity: 'positive',
      message: `${measurement.paragraphs} paragraphs were detected, giving the response a visible progression.`,
    });
  }

  if (cohesion.overused.length > 0) {
    observations.push({
      criterion: 'coherenceAndCohesion',
      polarity: 'negative',
      message: `Repeated cohesive devices (${cohesion.overused.join(', ')}) occur four or more times each; the descriptors treat mechanical repetition of linkers as a weakness.`,
    });
  } else if (cohesion.relationsUsed >= 4) {
    observations.push({
      criterion: 'coherenceAndCohesion',
      polarity: 'positive',
      message: `Cohesive devices signal ${cohesion.relationsUsed} distinct discourse relations without any single device being over-repeated.`,
    });
  } else {
    observations.push({
      criterion: 'coherenceAndCohesion',
      polarity: 'neutral',
      message: `Cohesive devices signal only ${cohesion.relationsUsed} distinct discourse relations; a wider range is typical of higher-band responses.`,
    });
  }

  observations.push({
    criterion: 'lexicalResource',
    polarity: lexis.lexicalDensity >= 0.5 ? 'positive' : 'neutral',
    message: `Lexical density is ${(lexis.lexicalDensity * 100).toFixed(1)}% (content words as a share of all words); academic prose typically sits above 50%.`,
  });

  observations.push({
    criterion: 'lexicalResource',
    polarity: lexis.cambridgeCoverage >= 0.05 ? 'positive' : 'neutral',
    message: `${lexis.cambridgeMatches} distinct word forms (${(lexis.cambridgeCoverage * 100).toFixed(1)}% of the vocabulary used) appear on the Cambridge IELTS 1-22 headword list.`,
  });

  observations.push({
    criterion: 'grammaticalRangeAndAccuracy',
    polarity: variation >= 5 ? 'positive' : 'neutral',
    message: `Sentence lengths vary with a standard deviation of ${variation} words around a mean of ${measurement.avgSentenceLength}; a flat profile suggests limited sentence variety.`,
  });

  return observations;
}

/**
 * Analyse a Writing response.
 *
 * @param text - The candidate response.
 * @param task - Which Writing task the response answers.
 * @param sampleSize - How many lexical hits to return.
 * @returns The analysis, or `null` when the response contains no words.
 */
export function analyzeWriting(text: string, task: WritingTask, sampleSize: number): WritingAnalysis | null {
  const measurement = measureText(text);
  const lexis = analyzeVocabulary(text, sampleSize);
  if (measurement === null || lexis === null) {
    return null;
  }
  const cohesion = analyzeCohesion(text, measurement.words);
  const variation = sentenceLengthVariation(text);
  const requirement = TASK_REQUIREMENTS[task];
  return {
    task,
    minimumWords: requirement.minimumWords,
    meetsMinimumLength: measurement.words >= requirement.minimumWords,
    wordsShortOfMinimum: Math.max(0, requirement.minimumWords - measurement.words),
    wordsPerExamMinute: round(measurement.words / requirement.minutes, 2),
    measurement,
    lexis,
    cohesion,
    sentenceLengthVariation: variation,
    observations: observationsFor(task, measurement, lexis, cohesion, variation),
    caveats: [
      'This endpoint reports measurements, not a band score. IELTS bands are awarded by trained examiners against the analytic descriptors and cannot be inferred from surface features.',
      'Nothing here assesses accuracy, task fulfilment, relevance or the quality of argument, which is what the descriptors actually reward.',
      'Submitted text is analysed in-process and is never stored, logged or transmitted.',
    ],
  };
}
