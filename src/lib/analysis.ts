/**
 * Readability and essay analysis.
 *
 * Two deterministic text analysers built on {@link ../lib/textstats!baseProfile}:
 * a readability report that places a text next to the corpus groups indexed by
 * `/v1/tests`, and an essay profile that measures length, lexical diversity and
 * recurring-theme coverage, then maps the measurements onto heuristic hints
 * phrased after the four Writing band-descriptor criteria published at
 * `/v1/bands/descriptors`.
 *
 * The analysers measure surface features only. Every hint names the threshold
 * that fired, so consumers can audit — or disagree with — the heuristic.
 */

import { EXAM_THEMES } from '../data/themes.js';
import { allEntries } from '../data/vocabulary.js';
import { practiceStats } from '../data/practiceTests.js';

import {
  baseProfile,
  fleschKincaidGrade,
  fleschReadingEase,
  round2,
  sentencesOf,
  syllablesOf,
  wordsOf,
} from './textstats.js';

import type {
  CorpusContext,
  EssayProfile,
  LexicalProfile,
  LengthProfile,
  NumericSummary,
  ProfileHint,
  ReadabilityReport,
  ReadabilitySummary,
  ThemeMatch,
} from '../types.js';

/** Interpretive labels for Flesch Reading Ease, highest band first. */
const READABILITY_LEVELS: readonly { min: number; label: string; description: string }[] = [
  { min: 90, label: 'very easy', description: 'Easily understood by an average 11-year-old.' },
  { min: 80, label: 'easy', description: 'Conversational English for consumers.' },
  { min: 70, label: 'fairly easy', description: 'Fairly easy for most educated adults.' },
  {
    min: 60,
    label: 'plain English',
    description: 'Plain English; easily understood by 13- to 15-year-olds.',
  },
  { min: 50, label: 'fairly difficult', description: 'Fairly difficult; typical of serious journalism.' },
  { min: 30, label: 'difficult', description: 'Difficult; typical of academic prose.' },
  {
    min: Number.NEGATIVE_INFINITY,
    label: 'very confusing',
    description: 'Very confusing; legal or technical register.',
  },
];

/**
 * Label a Flesch Reading Ease score.
 *
 * @param score - Reading-ease score, possibly outside the classic 0-100 range.
 */
export function readingEaseLabel(score: number): { label: string; description: string } {
  const level = READABILITY_LEVELS.find((band) => score >= band.min) as {
    label: string;
    description: string;
  };
  return { label: level.label, description: level.description };
}

/** Corpus groups compared by `/v1/tools/readability`, in preference order. */
const CORPUS_GROUPS = ['reading-full-test', 'A1-A2', 'B1-B2', 'C1-C2'] as const;

/**
 * Find the corpus group whose mean reading ease is closest to a score.
 *
 * Ties resolve to the earlier group in {@link CORPUS_GROUPS}. The practice-test
 * pipeline guarantees readability summaries for all four groups.
 *
 * @param readingEase - Flesch Reading Ease of the analysed text.
 */
export function nearestCorpusGroup(readingEase: number): CorpusContext {
  const byGroup = practiceStats().readabilityByGroup;
  let best: CorpusContext | undefined;
  for (const group of CORPUS_GROUPS) {
    // The practice-test pipeline guarantees summaries for these four groups.
    const summary = byGroup[group] as ReadabilitySummary & {
      fleschReadingEase: NumericSummary;
      fleschKincaidGrade: NumericSummary;
    };
    const candidate: CorpusContext = {
      group,
      meanReadingEase: round2(summary.fleschReadingEase.mean),
      distance: round2(Math.abs(summary.fleschReadingEase.mean - readingEase)),
      meanGrade: round2(summary.fleschKincaidGrade.mean),
    };
    if (best === undefined || candidate.distance < best.distance) {
      best = candidate;
    }
  }
  return best as CorpusContext;
}

/**
 * Build the readability report for a validated text.
 *
 * @param text - Raw text with at least one word and one sentence.
 */
export function analyseReadability(text: string): ReadabilityReport {
  const tokens = wordsOf(text);
  const sentences = sentencesOf(text);
  const profile = baseProfile(text, tokens, sentences);
  const syllables = tokens.reduce((sum, word) => sum + syllablesOf(word), 0);
  const readingEase = fleschReadingEase(tokens.length, sentences.length, syllables);
  return {
    profile: { characters: text.length, ...profile },
    fleschReadingEase: readingEase,
    fleschKincaidGrade: fleschKincaidGrade(tokens.length, sentences.length, syllables),
    level: readingEaseLabel(readingEase),
    corpusContext: nearestCorpusGroup(readingEase),
  };
}

/** Discourse markers counted by the coherence hint, lower-cased. */
export const LINKERS: readonly string[] = [
  'however',
  'moreover',
  'furthermore',
  'therefore',
  'consequently',
  'nevertheless',
  'in addition',
  'for example',
  'for instance',
  'on the other hand',
  'in contrast',
  'as a result',
  'firstly',
  'finally',
  'overall',
  'whereas',
  'although',
  'despite',
  'in conclusion',
];

/**
 * Count discourse-marker occurrences in text.
 *
 * Multi-word markers count once per occurrence; overlapping markers both count
 * (`for example` also matches `example`? no — every marker needs its own word
 * boundaries, so `furthermore` does not add a `more` hit).
 *
 * @param text - Raw text.
 */
export function countLinkers(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const linker of LINKERS) {
    const pattern = new RegExp(`\\b${linker.replace(/ /g, '\\s+')}\\b`, 'g');
    count += (lower.match(pattern) ?? []).length;
  }
  return count;
}

/** Lower-cased Cambridge headword set, built once. */
let headwordSet: Set<string> | undefined;

/** Normalise a token for headword comparison: lower-case and strip possessives. */
function normaliseToken(token: string): string {
  return token.replace(/['’]s$/, '');
}

/**
 * Measure how many tokens appear in the Cambridge IELTS headword list.
 *
 * Hyphenated tokens count when either half is a headword; possessive `s` is
 * stripped before comparison.
 *
 * @param tokens - Lower-cased tokens.
 */
export function headwordCoverage(tokens: readonly string[]): { headwordTokens: number; coverage: number } {
  const set = (headwordSet ??= new Set(allEntries().map((entry) => entry.word.toLowerCase())));
  let matched = 0;
  for (const token of tokens) {
    const normalised = normaliseToken(token);
    const parts = normalised.split('-');
    if (set.has(normalised) || parts.some((part) => set.has(part))) {
      matched += 1;
    }
  }
  return { headwordTokens: matched, coverage: round2(matched / tokens.length) };
}

/** Rank themes by matched keywords, then occurrences, then dataset order. */

/**
 * Match a text against the recurring exam themes.
 *
 * A keyword hits when it appears as a whole-word (or whole-phrase) match.
 * Themes are ranked by the number of distinct matched keywords, then by total
 * occurrences, then by dataset order — a deterministic, explainable ranking.
 *
 * @param text - Lower-cased raw text.
 * @param limit - Maximum themes to return (1-10).
 */
export function matchThemes(text: string, limit: number): ThemeMatch[] {
  const lower = text.toLowerCase();
  const scored = EXAM_THEMES.map((theme, index) => {
    const matchedKeywords: string[] = [];
    let occurrences = 0;
    for (const keyword of theme.keywords) {
      const pattern = new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
      const hits = (lower.match(pattern) ?? []).length;
      if (hits > 0) {
        matchedKeywords.push(keyword);
        occurrences += hits;
      }
    }
    return { theme, index, matchedKeywords, occurrences };
  }).filter((row) => row.matchedKeywords.length > 0);
  scored.sort(
    (left, right) =>
      right.matchedKeywords.length - left.matchedKeywords.length ||
      right.occurrences - left.occurrences ||
      left.index - right.index,
  );
  return scored.slice(0, limit).map(({ theme, matchedKeywords, occurrences }) => ({
    id: theme.id,
    group: theme.group,
    name: theme.name,
    matchedKeywords,
    occurrences,
  }));
}

/** Metrics the hint rules consume; produced by {@link analyseEssay}. */
export type HintMetrics = {
  task: 'task1' | 'task2';
  words: number;
  minimumWords: number;
  sentences: number;
  paragraphs: number;
  avgWordsPerSentence: number;
  sentenceLengthStdDev: number;
  typeTokenRatio: number;
  headwordCoverage: number;
  linkersPer100Words: number;
};

/** Share of tokens above which lexical diversity counts as a strength. */
export const TTR_STRENGTH = 0.55;
/** Share of tokens below which lexical diversity earns a warning. */
export const TTR_WATCH = 0.42;
/** Minimum tokens for the lexical-diversity rule to apply at all. */
export const TTR_MIN_TOKENS = 60;
/** Headword coverage above which topic vocabulary counts as a strength. */
export const COVERAGE_STRENGTH = 0.3;
/** Headword coverage below which topic vocabulary earns a warning. */
export const COVERAGE_WATCH = 0.12;
/** Discourse markers per 100 words above which signposting looks over-used. */
export const LINKER_OVERUSE = 3;

/**
 * Map the measured metrics onto heuristic hints.
 *
 * Each rule names the band-descriptor criterion it relates to and fires at most
 * one hint; `watch` hints sort ahead of `strength` hints.
 *
 * @param metrics - Measurements from {@link analyseEssay}.
 */
export function essayHints(metrics: HintMetrics): ProfileHint[] {
  const hints: ProfileHint[] = [];

  // Task response: length against the task minimum.
  hints.push(
    metrics.words < metrics.minimumWords
      ? {
          criterion: 'task-response',
          level: 'watch',
          message: `${metrics.words} words is under the ${metrics.minimumWords}-word minimum for ${metrics.task}; length below the minimum caps Task Response at Band 4.`,
        }
      : {
          criterion: 'task-response',
          level: 'strength',
          message: `Length of ${metrics.words} words meets the ${metrics.minimumWords}-word minimum for ${metrics.task}.`,
        },
  );

  // Coherence: visible paragraph structure.
  hints.push(
    metrics.paragraphs < 2
      ? {
          criterion: 'coherence-and-cohesion',
          level: 'watch',
          message:
            'No paragraph breaks detected. Examiners expect visibly sequenced paragraphs — plan an introduction, body paragraphs and a conclusion.',
        }
      : {
          criterion: 'coherence-and-cohesion',
          level: 'strength',
          message: `Text is structured into ${metrics.paragraphs} paragraphs.`,
        },
  );

  // Coherence: signposting density.
  hints.push(
    metrics.linkersPer100Words === 0
      ? {
          criterion: 'coherence-and-cohesion',
          level: 'watch',
          message:
            'No discourse markers detected. Signposting (however, furthermore, as a result) makes the argument trackable.',
        }
      : metrics.linkersPer100Words > LINKER_OVERUSE
        ? {
            criterion: 'coherence-and-cohesion',
            level: 'watch',
            message: `Discourse markers appear ${round2(metrics.linkersPer100Words)} times per 100 words; above ${LINKER_OVERUSE} per 100 the writing reads as formulaic.`,
          }
        : {
            criterion: 'coherence-and-cohesion',
            level: 'strength',
            message: 'Signposting density sits in a natural range.',
          },
  );

  // Lexical resource: diversity, measured only when the sample is large enough.
  if (metrics.words >= TTR_MIN_TOKENS) {
    if (metrics.typeTokenRatio >= TTR_STRENGTH) {
      hints.push({
        criterion: 'lexical-resource',
        level: 'strength',
        message: `Type-token ratio of ${metrics.typeTokenRatio} across ${metrics.words} words shows a wide vocabulary range.`,
      });
    } else if (metrics.typeTokenRatio < TTR_WATCH) {
      hints.push({
        criterion: 'lexical-resource',
        level: 'watch',
        message: `Type-token ratio of ${metrics.typeTokenRatio} across ${metrics.words} words is low; replace repeated words with precise synonyms and collocations.`,
      });
    }
  }

  // Lexical resource: overlap with the Cambridge IELTS headword list.
  if (metrics.headwordCoverage >= COVERAGE_STRENGTH) {
    hints.push({
      criterion: 'lexical-resource',
      level: 'strength',
      message: `${round2(metrics.headwordCoverage * 100)}% of words are Cambridge IELTS headwords — strong topic vocabulary.`,
    });
  } else if (metrics.headwordCoverage < COVERAGE_WATCH) {
    hints.push({
      criterion: 'lexical-resource',
      level: 'watch',
      message: `Only ${round2(metrics.headwordCoverage * 100)}% of words are Cambridge IELTS headwords; build topic vocabulary from /v1/topics/themes.`,
    });
  }

  // Grammar: sentence-length control.
  hints.push(
    metrics.avgWordsPerSentence < 11
      ? {
          criterion: 'grammatical-range-and-accuracy',
          level: 'watch',
          message: `Sentences average ${metrics.avgWordsPerSentence} words; combine short statements with relative clauses and conditionals to show range.`,
        }
      : metrics.avgWordsPerSentence > 28
        ? {
            criterion: 'grammatical-range-and-accuracy',
            level: 'watch',
            message: `Sentences average ${metrics.avgWordsPerSentence} words; check the longest ones for run-ons and missing full stops.`,
          }
        : {
            criterion: 'grammatical-range-and-accuracy',
            level: 'strength',
            message: `Average sentence length of ${metrics.avgWordsPerSentence} words sits in a controlled academic range.`,
          },
  );

  // Grammar: sentence-length variety, measured from four sentences on.
  if (metrics.sentences >= 4) {
    if (metrics.sentenceLengthStdDev < 3) {
      hints.push({
        criterion: 'grammatical-range-and-accuracy',
        level: 'watch',
        message: `Sentence lengths vary by only ${metrics.sentenceLengthStdDev} words around the mean; mix short emphatic sentences with longer complex ones.`,
      });
    } else if (metrics.sentenceLengthStdDev >= 8) {
      hints.push({
        criterion: 'grammatical-range-and-accuracy',
        level: 'strength',
        message: `Sentence lengths range widely (standard deviation ${metrics.sentenceLengthStdDev} words) — good mix of simple and complex structures.`,
      });
    }
  }

  const rank = (hint: ProfileHint): number => (hint.level === 'watch' ? 0 : 1);
  return hints.sort((left, right) => rank(left) - rank(right));
}

/** Minimum word counts per task. */
export const TASK_MINIMUM_WORDS: Record<'task1' | 'task2', number> = { task1: 150, task2: 250 };

/**
 * Build the full essay profile for a validated text.
 *
 * @param text - Raw text with at least one word.
 * @param task - Writing task the text was written for.
 * @param themeLimit - Maximum detected themes to report.
 */
export function analyseEssay(text: string, task: 'task1' | 'task2', themeLimit: number): EssayProfile {
  const tokens = wordsOf(text);
  const sentences = sentencesOf(text);
  const lengths = sentences.map((sentence) => wordsOf(sentence).length);
  const profile = baseProfile(text, tokens, sentences);
  const types = new Set(tokens);
  const coverage = headwordCoverage(tokens);
  const linkers = countLinkers(text);
  const minimumWords = TASK_MINIMUM_WORDS[task];
  const linkersPer100Words = round2((linkers / tokens.length) * 100);

  const hints = essayHints({
    task,
    words: tokens.length,
    minimumWords,
    sentences: sentences.length,
    paragraphs: profile.paragraphs,
    avgWordsPerSentence: profile.avgWordsPerSentence,
    sentenceLengthStdDev: profile.sentenceLengthStdDev,
    typeTokenRatio: round2(types.size / tokens.length),
    headwordCoverage: coverage.coverage,
    linkersPer100Words,
  });

  const lexical: LexicalProfile = {
    tokens: tokens.length,
    types: types.size,
    typeTokenRatio: round2(types.size / tokens.length),
    rootTtr: round2(types.size / Math.sqrt(tokens.length)),
    longWordShare: profile.longWordShare,
    headwordTokens: coverage.headwordTokens,
    headwordCoverage: coverage.coverage,
  };
  const length: LengthProfile = {
    words: tokens.length,
    sentences: sentences.length,
    paragraphs: profile.paragraphs,
    minimumWords,
    meetsMinimum: tokens.length >= minimumWords,
  };

  return {
    task,
    length,
    lexical,
    sentences: {
      count: sentences.length,
      avgLength: profile.avgWordsPerSentence,
      stdDev: profile.sentenceLengthStdDev,
      shortest: Math.min(...lengths),
      longest: Math.max(...lengths),
    },
    themes: matchThemes(text, themeLimit),
    hints,
    strengths: hints.filter((hint) => hint.level === 'strength').length,
    watches: hints.filter((hint) => hint.level === 'watch').length,
  };
}
