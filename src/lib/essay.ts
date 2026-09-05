/**
 * Indicative, rule-based feedback on a Writing Task response.
 *
 * **This is not an examiner and does not predict a band score.** Automated
 * essay scoring that claims to replicate human raters requires a trained model
 * and a validated rubric; publishing one behind a free endpoint without the
 * training data would be unreproducible and, worse, misleading to candidates.
 *
 * What this module does instead is report *checkable, objective facts* against
 * the published task requirements — word count against the 150/250 minimum,
 * paragraphing, sentence-length variation, cohesive-device use, lexical
 * repetition — and label each as a pass, a warning or a problem. Every check
 * states the rule it applies, so a candidate can verify it by hand and a
 * researcher can audit it. The `indicativeBand` field is explicitly a
 * *floor* derived from mechanical criteria only, and is documented as such.
 */

import { lexicalReport } from './lexical.js';
import { readability } from './readability.js';
import { analyseText, normaliseText, round } from './text.js';

import type { LexicalReport } from './lexical.js';
import type { ReadabilityReport } from './readability.js';

/** Writing tasks the checker understands. */
export type WritingTask = 'task-1' | 'task-2';

/** Minimum word counts published by IELTS for each task. */
export const MINIMUM_WORDS: Record<WritingTask, number> = { 'task-1': 150, 'task-2': 250 };

/** Suggested time budget in minutes for each task. */
export const SUGGESTED_MINUTES: Record<WritingTask, number> = { 'task-1': 20, 'task-2': 40 };

/**
 * Cohesive devices IELTS descriptors reward when used accurately.
 *
 * Grouped by discourse function so that the report can say *which* function is
 * missing rather than only counting connectives.
 */
export const COHESIVE_DEVICES: Readonly<Record<string, readonly string[]>> = {
  addition: ['furthermore', 'moreover', 'in addition', 'additionally', 'besides', 'also'],
  contrast: ['however', 'nevertheless', 'on the other hand', 'whereas', 'although', 'despite', 'conversely'],
  cause: ['therefore', 'consequently', 'as a result', 'thus', 'hence', 'because', 'since'],
  example: ['for example', 'for instance', 'such as', 'namely', 'to illustrate'],
  sequence: ['firstly', 'secondly', 'finally', 'subsequently', 'to begin with'],
  conclusion: ['in conclusion', 'to conclude', 'overall', 'in summary', 'to sum up'],
};

/** Outcome of one mechanical check. */
export type CheckStatus = 'pass' | 'warning' | 'fail';

/** A single, auditable check against a published requirement. */
export type EssayCheck = {
  /** Machine-readable identifier. */
  id: string;
  /** What was checked. */
  label: string;
  /** Result. */
  status: CheckStatus;
  /** The rule applied, stated so a candidate can verify it by hand. */
  rule: string;
  /** What was actually observed. */
  detail: string;
};

/**
 * Count cohesive devices by discourse function.
 *
 * Matching is case-insensitive and phrase-aware (`on the other hand` counts as
 * one device, not four words).
 *
 * @param text - Normalised input text.
 * @returns Occurrences per function, and the total.
 */
export function countCohesiveDevices(text: string): { byFunction: Record<string, number>; total: number } {
  const haystack = ` ${text.toLowerCase()} `;
  const byFunction: Record<string, number> = {};
  let total = 0;
  for (const [group, devices] of Object.entries(COHESIVE_DEVICES)) {
    let count = 0;
    for (const device of devices) {
      const pattern = new RegExp(`(?<![A-Za-z])${device.replace(/ /gu, '\\s+')}(?![A-Za-z])`, 'gu');
      count += (haystack.match(pattern) ?? []).length;
    }
    byFunction[group] = count;
    total += count;
  }
  return { byFunction, total };
}

/**
 * Split a response into paragraphs on blank lines.
 *
 * @param raw - Raw, un-normalised text (blank lines are significant).
 * @returns Non-empty paragraphs.
 */
export function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Population standard deviation of a list of numbers.
 *
 * @param values - Values.
 * @returns The standard deviation; `0` for fewer than two values.
 */
export function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** The complete response report. */
export type EssayReport = {
  /** Which task the response was checked against. */
  task: WritingTask;
  /** Minimum word count for that task. */
  minimumWords: number;
  /** Suggested time budget in minutes. */
  suggestedMinutes: number;
  /** Word count. */
  words: number;
  /** Paragraph count. */
  paragraphs: number;
  /** Sentence count. */
  sentences: number;
  /** Mean words per sentence. */
  wordsPerSentence: number;
  /** Standard deviation of sentence length, a proxy for syntactic variety. */
  sentenceLengthVariation: number;
  /** Cohesive devices found, by discourse function. */
  cohesiveDevices: Record<string, number>;
  /** Total cohesive devices found. */
  cohesiveDeviceCount: number;
  /** Readability report for the response. */
  readability: ReadabilityReport;
  /** Lexical report for the response. */
  lexical: LexicalReport;
  /** The mechanical checks. */
  checks: EssayCheck[];
  /**
   * A conservative *floor* implied by the mechanical checks alone — never a
   * predicted band. A response can satisfy every check and still be awarded a
   * lower band by an examiner for content, task response or accuracy.
   */
  indicativeBand: number;
  /** Prioritised, actionable suggestions. */
  suggestions: string[];
  /** The standing caveat, repeated in every response. */
  disclaimer: string;
};

/** The caveat attached to every report. */
export const DISCLAIMER =
  'Mechanical checks only. This is not a band score and not an examiner judgement: task response, ' +
  'accuracy and content cannot be assessed automatically. Use it to catch avoidable errors before ' +
  'a human reads your work.';

/**
 * Check a Writing Task response against published, mechanical requirements.
 *
 * @param raw - The candidate's response, with paragraph breaks preserved.
 * @param task - Which task to check against.
 * @param headwords - Cambridge headword set for the coverage measure.
 * @returns The full report.
 */
export function assessEssay(raw: string, task: WritingTask, headwords: ReadonlySet<string>): EssayReport {
  const paragraphs = splitParagraphs(raw);
  const text = normaliseText(raw);
  const stats = analyseText(text);
  const minimum = MINIMUM_WORDS[task];
  const devices = countCohesiveDevices(text);
  const lexical = lexicalReport(text, headwords);
  const reading = readability(text);

  const sentenceLengths = text
    .split(/[.!?\n\r]+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => (sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/gu) ?? []).length);
  const variation = standardDeviation(sentenceLengths);

  const checks: EssayCheck[] = [];
  const suggestions: string[] = [];

  /* Word count: the only requirement IELTS states numerically. */
  if (stats.words < minimum) {
    checks.push({
      id: 'word-count',
      label: 'Minimum word count',
      status: 'fail',
      rule: `${task === 'task-1' ? 'Task 1' : 'Task 2'} requires at least ${minimum} words.`,
      detail: `${stats.words} words: ${minimum - stats.words} short of the minimum.`,
    });
    suggestions.push(
      `Add at least ${minimum - stats.words} more words: under-length responses are penalised on Task Achievement regardless of quality.`,
    );
  } else {
    checks.push({
      id: 'word-count',
      label: 'Minimum word count',
      status: 'pass',
      rule: `${task === 'task-1' ? 'Task 1' : 'Task 2'} requires at least ${minimum} words.`,
      detail: `${stats.words} words.`,
    });
  }

  /* Paragraphing: rewarded explicitly under Coherence and Cohesion. */
  const expectedParagraphs = task === 'task-1' ? 3 : 4;
  if (paragraphs.length < expectedParagraphs) {
    checks.push({
      id: 'paragraphing',
      label: 'Paragraphing',
      status: paragraphs.length <= 1 ? 'fail' : 'warning',
      rule: `A ${task === 'task-1' ? 'Task 1' : 'Task 2'} response is normally organised into at least ${expectedParagraphs} paragraphs.`,
      detail: `${paragraphs.length} paragraph${paragraphs.length === 1 ? '' : 's'} detected (separated by blank lines).`,
    });
    suggestions.push(
      `Organise the response into at least ${expectedParagraphs} paragraphs; Coherence and Cohesion rewards visible logical organisation.`,
    );
  } else {
    checks.push({
      id: 'paragraphing',
      label: 'Paragraphing',
      status: 'pass',
      rule: `At least ${expectedParagraphs} paragraphs expected.`,
      detail: `${paragraphs.length} paragraphs.`,
    });
  }

  /* Sentence length: very long mean sentence length usually means run-ons. */
  if (stats.wordsPerSentence > 30) {
    checks.push({
      id: 'sentence-length',
      label: 'Mean sentence length',
      status: 'warning',
      rule: 'A mean above 30 words per sentence usually indicates run-on sentences.',
      detail: `${round(stats.wordsPerSentence)} words per sentence.`,
    });
    suggestions.push('Break the longest sentences up: accuracy is easier to demonstrate in shorter clauses.');
  } else if (stats.wordsPerSentence < 8 && stats.words >= minimum) {
    checks.push({
      id: 'sentence-length',
      label: 'Mean sentence length',
      status: 'warning',
      rule: 'A mean below 8 words per sentence suggests little subordination.',
      detail: `${round(stats.wordsPerSentence)} words per sentence.`,
    });
    suggestions.push('Combine some short sentences using subordinate clauses to show grammatical range.');
  } else {
    checks.push({
      id: 'sentence-length',
      label: 'Mean sentence length',
      status: 'pass',
      rule: 'A mean of roughly 8-30 words per sentence is typical of a strong response.',
      detail: `${round(stats.wordsPerSentence)} words per sentence.`,
    });
  }

  /* Sentence variety: Grammatical Range rewards a mix of simple and complex. */
  if (variation < 3 && sentenceLengths.length >= 4) {
    checks.push({
      id: 'sentence-variety',
      label: 'Sentence-length variety',
      status: 'warning',
      rule: 'Grammatical Range and Accuracy rewards a mix of simple and complex sentences.',
      detail: `Sentence length varies by only ${round(variation)} words (standard deviation).`,
    });
    suggestions.push('Vary sentence length deliberately: alternate short assertions with complex sentences.');
  } else {
    checks.push({
      id: 'sentence-variety',
      label: 'Sentence-length variety',
      status: 'pass',
      rule: 'A mix of sentence lengths is expected.',
      detail: `Standard deviation of ${round(variation)} words.`,
    });
  }

  /* Cohesive devices: rewarded when used, penalised when mechanical. */
  const groupsUsed = Object.values(devices.byFunction).filter((count) => count > 0).length;
  const deviceRatio = stats.words === 0 ? 0 : devices.total / stats.words;
  if (devices.total === 0) {
    checks.push({
      id: 'cohesive-devices',
      label: 'Cohesive devices',
      status: 'fail',
      rule: 'Coherence and Cohesion expects a range of linking devices.',
      detail: 'No cohesive devices detected.',
    });
    suggestions.push(
      'Add linking devices (however, furthermore, as a result) to signal the logical structure.',
    );
  } else if (deviceRatio > 0.06 && stats.words >= 100) {
    checks.push({
      id: 'cohesive-devices',
      label: 'Cohesive devices',
      status: 'warning',
      rule: 'Descriptors penalise mechanical overuse of linking devices; applied only to responses of 100 words or more.',
      detail: `${devices.total} devices across ${stats.words} words (${round(deviceRatio * 100)}%), which reads as mechanical.`,
    });
    suggestions.push('Reduce the density of linking words; overuse is explicitly penalised.');
  } else {
    checks.push({
      id: 'cohesive-devices',
      label: 'Cohesive devices',
      status: 'pass',
      rule: 'A range of linking devices, used without overuse, is expected.',
      detail: `${devices.total} devices spanning ${groupsUsed} of ${Object.keys(COHESIVE_DEVICES).length} discourse functions.`,
    });
  }

  /* Lexical repetition: the clearest signal of a narrow lexical resource. */
  const topWord = lexical.frequentWords[0];
  if (topWord !== undefined && topWord.ratio > 0.05) {
    checks.push({
      id: 'lexical-repetition',
      label: 'Lexical repetition',
      status: 'warning',
      rule: 'No single content word should exceed 5% of the response.',
      detail: `"${topWord.word}" accounts for ${round(topWord.ratio * 100)}% of all words (${topWord.count} occurrence${topWord.count === 1 ? '' : 's'}).`,
    });
    suggestions.push(
      `Paraphrase "${topWord.word}": repeating one content word narrows the apparent lexical range.`,
    );
  } else {
    checks.push({
      id: 'lexical-repetition',
      label: 'Lexical repetition',
      status: 'pass',
      rule: 'No single content word should exceed 5% of the response.',
      detail:
        topWord === undefined
          ? 'No repeated content words.'
          : `Most frequent content word "${topWord.word}" at ${round(topWord.ratio * 100)}%.`,
    });
  }

  /* Lexical diversity, length-corrected so it is comparable across responses. */
  if (lexical.movingAverageTypeTokenRatio < 0.6 && stats.words >= 100) {
    checks.push({
      id: 'lexical-diversity',
      label: 'Lexical diversity',
      status: 'warning',
      rule: 'A moving-average type-token ratio below 0.60 indicates limited lexical variety.',
      detail: `MATTR of ${lexical.movingAverageTypeTokenRatio}.`,
    });
    suggestions.push('Widen vocabulary: use /v1/vocabulary to find topic-specific Cambridge headwords.');
  } else {
    checks.push({
      id: 'lexical-diversity',
      label: 'Lexical diversity',
      status: 'pass',
      rule: 'A moving-average type-token ratio of 0.60 or above is expected.',
      detail: `MATTR of ${lexical.movingAverageTypeTokenRatio}.`,
    });
  }

  /*
   * The floor. Each failed check removes a full band and each warning half a
   * band from a nominal ceiling of 7.0 — the highest band that mechanical
   * evidence alone can support. The value is clamped to the reportable range.
   */
  const failures = checks.filter((check) => check.status === 'fail').length;
  const warnings = checks.filter((check) => check.status === 'warning').length;
  const indicativeBand = Math.max(4, Math.min(7, 7 - failures - warnings * 0.5));

  return {
    task,
    minimumWords: minimum,
    suggestedMinutes: SUGGESTED_MINUTES[task],
    words: stats.words,
    paragraphs: paragraphs.length,
    sentences: stats.sentences,
    wordsPerSentence: round(stats.wordsPerSentence),
    sentenceLengthVariation: round(variation),
    cohesiveDevices: devices.byFunction,
    cohesiveDeviceCount: devices.total,
    readability: reading,
    lexical,
    checks,
    indicativeBand,
    suggestions,
    disclaimer: DISCLAIMER,
  };
}
