/**
 * Deterministic heuristic writing assessment.
 *
 * The third step of the toolkit's progression: `/v1/tools/readability` measures
 * a text, `/v1/tools/essay-profile` turns the measurements into hints, and this
 * module turns the same measurements into a **band estimate** — one per writing
 * criterion plus an overall estimate produced with the official rounding rule.
 *
 * The design is deliberately transparent rather than clever. Every criterion
 * starts from a published baseline ({@link ASSESS_BASELINE}) and moves in
 * half-band steps according to a fixed list of rules, each of which is exported
 * with its threshold and fires only when its measurement crosses it. The
 * response names every rule that fired, the observation that triggered it and
 * the effect it applied, so a reader can audit — or disagree with — the whole
 * chain from text to band.
 *
 * These are surface heuristics over a single text sample; they cannot judge
 * meaning, ideas or handwriting. The estimate is a teaching signal, not a
 * score.
 */

import {
  countLinkers,
  headwordCoverage,
  LINKERS,
  matchThemes,
  nearestCorpusGroup,
  TASK_MINIMUM_WORDS,
} from './analysis.js';
import { roundBand } from './band.js';
import {
  baseProfile,
  fleschReadingEase,
  round1,
  round2,
  sentencesOf,
  syllablesOf,
  wordsOf,
} from './textstats.js';

import type { AssessmentCriterion, CriterionAssessment, WritingAssessment } from '../types.js';

/** Baseline every criterion estimate starts from. */
export const ASSESS_BASELINE = 6.5;
/** Floor of a criterion estimate: heuristics never report below Band 4. */
export const ASSESS_MIN = 4;
/** Ceiling of a criterion estimate: no surface heuristic earns Band 8.5 or more. */
export const ASSESS_MAX = 8;

/** Markers of subordination or clausal embedding counted by the grammar rules. */
export const SUBORDINATORS: readonly string[] = [
  'because',
  'although',
  'though',
  'even though',
  'while',
  'whereas',
  'if',
  'unless',
  'until',
  'since',
  'when',
  'whenever',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'so that',
  'in order to',
  'despite',
  'in spite of',
  'not only',
  'whether',
];

/** Share of complex sentences at which grammatical range earns credit. */
export const COMPLEX_STRENGTH = 0.3;
/** Share of complex sentences below which grammatical range earns a penalty. */
export const COMPLEX_WATCH = 0.1;

/** Measurements the rules consume; produced once per assessment. */
export type AssessmentMetrics = {
  task: 'task1' | 'task2';
  words: number;
  minimumWords: number;
  sentences: number;
  paragraphs: number;
  avgWordsPerSentence: number;
  sentenceLengthStdDev: number;
  typeTokenRatio: number;
  longWordShare: number;
  headwordCoverage: number;
  linkersPer100Words: number;
  distinctLinkers: number;
  complexSentenceShare: number;
  overviewMarker: boolean;
  themeMatched: string | null;
};

/** One published heuristic rule. */
export type AssessmentRule = {
  /** Stable identifier, prefixed with the criterion (`lr-ttr-low`). */
  rule: string;
  /**
   * Criterion the rule adjusts. Task-criterion rules use the umbrella id
   * `task`; {@link assessWriting} spells it `task-achievement` or
   * `task-response` depending on the writing task.
   */
  criterion: 'task' | 'coherence-and-cohesion' | 'lexical-resource' | 'grammatical-range-and-accuracy';
  /** Delta applied to the baseline, in half-band steps. */
  effect: number;
  /** Whether the measurement crosses the rule's threshold. */
  applies: (metrics: AssessmentMetrics) => boolean;
  /** Human-readable observation naming the numbers. */
  observation: (metrics: AssessmentMetrics) => string;
  /** What the rule measures and why the threshold sits where it does. */
  note: string;
};

/** Shared note text for the rules that reference the band descriptors. */
const DESCRIPTORS = 'Published with the analytic descriptors at /v1/bands/descriptors.';

/** Count how many distinct discourse markers appear at least once. */
export function countDistinctLinkers(text: string): number {
  const lower = text.toLowerCase();
  let distinct = 0;
  for (const linker of LINKERS) {
    const pattern = new RegExp(`\\b${linker.replace(/ /g, '\\s+')}\\b`);
    if (pattern.test(lower)) {
      distinct += 1;
    }
  }
  return distinct;
}

/** Share of sentences that contain a subordination or embedding marker. */
export function complexSentenceShare(sentences: readonly string[]): number {
  if (sentences.length === 0) {
    return 0;
  }
  const complex = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return SUBORDINATORS.some((marker) => new RegExp(`\\b${marker.replace(/ /g, '\\s+')}\\b`).test(lower));
  }).length;
  return round2(complex / sentences.length);
}

/** Task-criterion rules; the criterion id resolves per task at assessment time. */
const TASK_RULES: readonly AssessmentRule[] = [
  {
    rule: 'task-length-below-minimum',
    criterion: 'task',
    effect: -2,
    applies: (m) => m.words < m.minimumWords,
    observation: (m) => `${m.words} words against the ${m.minimumWords}-word minimum for ${m.task}.`,
    note: `Responses under the length minimum are capped by examiners. ${DESCRIPTORS}`,
  },
  {
    rule: 'task-structure-thin',
    criterion: 'task',
    effect: -0.5,
    applies: (m) => m.paragraphs < 3,
    observation: (m) => `${m.paragraphs} paragraph${m.paragraphs === 1 ? '' : 's'} detected.`,
    note: `Both tasks need at least three moves (introduction, development, conclusion or overview). ${DESCRIPTORS}`,
  },
  {
    rule: 'task1-overview-present',
    criterion: 'task',
    effect: 0.5,
    applies: (m) => m.task === 'task1' && m.overviewMarker,
    observation: () => 'An overview marker ("overall") is present.',
    note: `The overview is the one compulsory move of Task 1. ${DESCRIPTORS}`,
  },
  {
    rule: 'task1-overview-missing',
    criterion: 'task',
    effect: -0.5,
    applies: (m) => m.task === 'task1' && !m.overviewMarker,
    observation: () => 'No overview marker ("overall") was found.',
    note: `Task 1 achievement caps without a clear overview statement. ${DESCRIPTORS}`,
  },
  {
    rule: 'task2-theme-match',
    criterion: 'task',
    effect: 0.5,
    applies: (m) => m.task === 'task2' && m.themeMatched !== null,
    observation: (m) => `Topic vocabulary aligns with the recurring theme "${m.themeMatched}".`,
    note: `On-topic coverage is proxied by the 50 recurring exam themes of /v1/topics/themes. ${DESCRIPTORS}`,
  },
];

/** Coherence-and-cohesion rules. */
const COHERENCE_RULES: readonly AssessmentRule[] = [
  {
    rule: 'cc-paragraphs-missing',
    criterion: 'coherence-and-cohesion',
    effect: -1.5,
    applies: (m) => m.paragraphs < 2,
    observation: (m) => `${m.paragraphs} paragraph detected; no visible paragraphing.`,
    note: 'Without visible paragraphing the sequencing of the argument cannot be followed.',
  },
  {
    rule: 'cc-paragraphs-few',
    criterion: 'coherence-and-cohesion',
    effect: -0.5,
    applies: (m) => m.paragraphs >= 2 && m.paragraphs < 4,
    observation: (m) => `${m.paragraphs} paragraphs detected.`,
    note: 'Four or more paragraphs give Task 2 arguments and Task 1 data room to be sequenced.',
  },
  {
    rule: 'cc-paragraphs-clear',
    criterion: 'coherence-and-cohesion',
    effect: 0.5,
    applies: (m) => m.paragraphs >= 4,
    observation: (m) => `${m.paragraphs} paragraphs detected.`,
    note: 'Clear paragraphing is the strongest visible cohesion signal.',
  },
  {
    rule: 'cc-linkers-absent',
    criterion: 'coherence-and-cohesion',
    effect: -1,
    applies: (m) => m.linkersPer100Words === 0,
    observation: () => 'No discourse markers detected.',
    note: 'Signposting (however, furthermore, as a result) makes the argument trackable.',
  },
  {
    rule: 'cc-linkers-overused',
    criterion: 'coherence-and-cohesion',
    effect: -0.5,
    applies: (m) => m.linkersPer100Words > 3,
    observation: (m) => `${m.linkersPer100Words} discourse markers per 100 words.`,
    note: 'Above 3 per 100 words the writing reads as formulaic; linkers carry the cohesion instead of the ideas.',
  },
  {
    rule: 'cc-linkers-natural',
    criterion: 'coherence-and-cohesion',
    effect: 0.5,
    applies: (m) => m.linkersPer100Words > 0 && m.linkersPer100Words <= 3,
    observation: (m) => `${m.linkersPer100Words} discourse markers per 100 words.`,
    note: 'A natural signposting density.',
  },
  {
    rule: 'cc-linker-variety-low',
    criterion: 'coherence-and-cohesion',
    effect: -0.5,
    applies: (m) => m.words >= 150 && m.distinctLinkers < 2,
    observation: (m) =>
      `${m.distinctLinkers} distinct marker${m.distinctLinkers === 1 ? '' : 's'} used across ${m.words} words.`,
    note: 'Repeating one device scores below varying cohesive devices.',
  },
];

/** Lexical-resource rules. */
const LEXICAL_RULES: readonly AssessmentRule[] = [
  {
    rule: 'lr-ttr-high',
    criterion: 'lexical-resource',
    effect: 0.5,
    applies: (m) => m.words >= 60 && m.typeTokenRatio >= 0.55,
    observation: (m) => `Type-token ratio of ${m.typeTokenRatio} across ${m.words} words.`,
    note: 'A wide vocabulary range; the 0.55 threshold applies from 60 words so short samples are not judged.',
  },
  {
    rule: 'lr-ttr-low',
    criterion: 'lexical-resource',
    effect: -1,
    applies: (m) => m.words >= 60 && m.typeTokenRatio < 0.42,
    observation: (m) => `Type-token ratio of ${m.typeTokenRatio} across ${m.words} words.`,
    note: 'Heavy repetition of the same words; below 0.42 the range is narrow.',
  },
  {
    rule: 'lr-coverage-high',
    criterion: 'lexical-resource',
    effect: 0.5,
    applies: (m) => m.headwordCoverage >= 0.3,
    observation: (m) => `${Math.round(m.headwordCoverage * 100)}% of words are Cambridge IELTS headwords.`,
    note: 'Topic vocabulary overlaps the 4,174 headwords of /v1/vocabulary.',
  },
  {
    rule: 'lr-coverage-low',
    criterion: 'lexical-resource',
    effect: -0.5,
    applies: (m) => m.headwordCoverage < 0.12,
    observation: (m) => `${Math.round(m.headwordCoverage * 100)}% of words are Cambridge IELTS headwords.`,
    note: 'Little overlap with the IELTS topic vocabulary lists.',
  },
  {
    rule: 'lr-longword-low',
    criterion: 'lexical-resource',
    effect: -0.5,
    applies: (m) => m.words >= 150 && m.longWordShare < 0.05,
    observation: (m) => `${Math.round(m.longWordShare * 100)}% of words have three or more syllables.`,
    note: 'Almost no less-common, multi-syllable vocabulary.',
  },
  {
    rule: 'lr-longword-high',
    criterion: 'lexical-resource',
    effect: 0.5,
    applies: (m) => m.longWordShare >= 0.15,
    observation: (m) => `${Math.round(m.longWordShare * 100)}% of words have three or more syllables.`,
    note: 'A visible layer of less-common vocabulary.',
  },
];

/** Grammatical-range-and-accuracy rules. */
const GRAMMAR_RULES: readonly AssessmentRule[] = [
  {
    rule: 'gra-complex-high',
    criterion: 'grammatical-range-and-accuracy',
    effect: 0.5,
    applies: (m) => m.complexSentenceShare >= COMPLEX_STRENGTH,
    observation: (m) => `${m.complexSentenceShare} of sentences contain a subordination marker.`,
    note: 'Complex structures appear regularly; the marker list is published as SUBORDINATORS.',
  },
  {
    rule: 'gra-complex-low',
    criterion: 'grammatical-range-and-accuracy',
    effect: -0.5,
    applies: (m) => m.complexSentenceShare < COMPLEX_WATCH,
    observation: (m) => `${m.complexSentenceShare} of sentences contain a subordination marker.`,
    note: 'Almost only simple sentences; subordination is the visible signal of range.',
  },
  {
    rule: 'gra-sentence-length-choppy',
    criterion: 'grammatical-range-and-accuracy',
    effect: -1,
    applies: (m) => m.avgWordsPerSentence < 9,
    observation: (m) => `Sentences average ${m.avgWordsPerSentence} words.`,
    note: 'Very short mean sentence length: choppy strings of simple statements.',
  },
  {
    rule: 'gra-sentence-length-short',
    criterion: 'grammatical-range-and-accuracy',
    effect: -0.5,
    applies: (m) => m.avgWordsPerSentence >= 9 && m.avgWordsPerSentence < 11,
    observation: (m) => `Sentences average ${m.avgWordsPerSentence} words.`,
    note: 'Below the 11-28 word band where academic writing sits comfortably.',
  },
  {
    rule: 'gra-sentence-length-runs',
    criterion: 'grammatical-range-and-accuracy',
    effect: -0.5,
    applies: (m) => m.avgWordsPerSentence > 28,
    observation: (m) => `Sentences average ${m.avgWordsPerSentence} words.`,
    note: 'Above 28 words run-ons and lost full stops become likely.',
  },
  {
    rule: 'gra-variety-low',
    criterion: 'grammatical-range-and-accuracy',
    effect: -0.5,
    applies: (m) => m.sentences >= 4 && m.sentenceLengthStdDev < 3,
    observation: (m) => `Sentence lengths vary by only ${m.sentenceLengthStdDev} words around the mean.`,
    note: 'Monotonous rhythm suggests one repeated pattern.',
  },
  {
    rule: 'gra-variety-high',
    criterion: 'grammatical-range-and-accuracy',
    effect: 0.5,
    applies: (m) => m.sentenceLengthStdDev >= 8,
    observation: (m) => `Sentence lengths vary by ${m.sentenceLengthStdDev} words around the mean.`,
    note: 'A wide spread of sentence lengths — simple and complex structures mixed.',
  },
];

/** All rules in evaluation order: task, coherence, lexical, grammar. */
export const ASSESSMENT_RULES: readonly AssessmentRule[] = [
  ...TASK_RULES,
  ...COHERENCE_RULES,
  ...LEXICAL_RULES,
  ...GRAMMAR_RULES,
];

/** All criteria in report order, including the two task-criterion spellings. */
export const ASSESSMENT_CRITERIA: readonly AssessmentCriterion[] = [
  'task-achievement',
  'task-response',
  'coherence-and-cohesion',
  'lexical-resource',
  'grammatical-range-and-accuracy',
];

/** Disclaimer attached to every assessment. */
export const ASSESSMENT_DISCLAIMER =
  'Heuristic band estimate from surface features of one text sample: teaching signal, not an ' +
  'official score. Every rule, threshold and effect is published in the response and in ' +
  'RESEARCH.md Part V; examiners also judge meaning, which no surface measure reaches.';

/**
 * Assess a writing sample against the four analytic criteria.
 *
 * @param text - Raw text with at least one word and one sentence.
 * @param task - Writing task the text was written for.
 */
export function assessWriting(text: string, task: 'task1' | 'task2'): WritingAssessment {
  const tokens = wordsOf(text);
  const sentences = sentencesOf(text);
  const profile = baseProfile(text, tokens, sentences);
  const coverage = headwordCoverage(tokens);
  const linkers = countLinkers(text);
  const theme = task === 'task2' ? (matchThemes(text, 1)[0] ?? null) : null;
  const typeTokenRatio = round2(new Set(tokens).size / tokens.length);
  const linkersPer100Words = round2((linkers / tokens.length) * 100);
  const metrics: AssessmentMetrics = {
    task,
    words: tokens.length,
    minimumWords: TASK_MINIMUM_WORDS[task],
    sentences: sentences.length,
    paragraphs: profile.paragraphs,
    avgWordsPerSentence: profile.avgWordsPerSentence,
    sentenceLengthStdDev: profile.sentenceLengthStdDev,
    typeTokenRatio,
    longWordShare: profile.longWordShare,
    headwordCoverage: coverage.coverage,
    linkersPer100Words,
    distinctLinkers: countDistinctLinkers(text),
    complexSentenceShare: complexSentenceShare(sentences),
    overviewMarker: /\boverall\b/i.test(text),
    themeMatched: theme?.name ?? null,
  };

  const criterionFor = (rule: AssessmentRule['criterion']): AssessmentCriterion => {
    if (rule !== 'task') {
      return rule;
    }
    return task === 'task1' ? 'task-achievement' : 'task-response';
  };

  const criteria: CriterionAssessment[] = ASSESSMENT_CRITERIA.filter(
    (criterion) =>
      criterion === 'coherence-and-cohesion' ||
      criterion === 'lexical-resource' ||
      criterion === 'grammatical-range-and-accuracy' ||
      criterion === (task === 'task1' ? 'task-achievement' : 'task-response'),
  ).map((criterion) => ({
    criterion,
    estimate: ASSESS_BASELINE,
    baseline: ASSESS_BASELINE,
    rules: [],
  }));

  for (const rule of ASSESSMENT_RULES) {
    if (!rule.applies(metrics)) {
      continue;
    }
    const criterionId = criterionFor(rule.criterion);
    const target = criteria.find((row) => row.criterion === criterionId) as CriterionAssessment;
    target.estimate += rule.effect;
    target.rules.push({
      rule: rule.rule,
      observation: rule.observation(metrics),
      effect: rule.effect,
      note: rule.note,
    });
  }

  for (const criterion of criteria) {
    criterion.estimate = Math.min(ASSESS_MAX, Math.max(ASSESS_MIN, round1(criterion.estimate)));
  }

  const mean = criteria.reduce((sum, criterion) => sum + criterion.estimate, 0) / criteria.length;
  const overall = roundBand(mean);
  const tie = Math.abs(Math.abs((mean * 2) % 1) - 0.5) < 1e-9;
  const explanation = tie
    ? `The mean of the four criterion estimates is ${mean.toFixed(3)}, which falls exactly between two half bands; the IELTS rounding rule rounds a .25/.75 mean up, giving ${overall.toFixed(1)}.`
    : `The mean of the four criterion estimates is ${mean.toFixed(3)}, which rounds to the nearest half band: ${overall.toFixed(1)}.`;

  const syllables = tokens.reduce((sum, word) => sum + syllablesOf(word), 0);
  // The engine's contract is a text with at least one word; any word implies at
  // least one sentence (a final unterminated stretch counts as one), so the
  // Flesch denominators are safe.
  const readability = fleschReadingEase(tokens.length, sentences.length, syllables);

  return {
    task,
    criteria,
    overall: { estimate: overall, mean: round2(mean), explanation },
    evidence: {
      task,
      words: tokens.length,
      minimumWords: TASK_MINIMUM_WORDS[task],
      meetsMinimum: tokens.length >= TASK_MINIMUM_WORDS[task],
      sentences: sentences.length,
      paragraphs: profile.paragraphs,
      avgWordsPerSentence: profile.avgWordsPerSentence,
      sentenceLengthStdDev: profile.sentenceLengthStdDev,
      typeTokenRatio,
      longWordShare: profile.longWordShare,
      headwordCoverage: coverage.coverage,
      linkersPer100Words,
      distinctLinkers: metrics.distinctLinkers,
      complexSentenceShare: metrics.complexSentenceShare,
      overviewMarker: metrics.overviewMarker,
      themeMatched: metrics.themeMatched,
      fleschReadingEase: readability,
    },
    corpusContext: nearestCorpusGroup(readability),
    disclaimer: ASSESSMENT_DISCLAIMER,
  };
}
