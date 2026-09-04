/**
 * A transparent, fully deterministic band estimator for IELTS Writing.
 *
 * The estimator is a *glass-box* rubric: every criterion score is produced by a
 * small number of published, inspectable thresholds over text-internal
 * features, and every score is returned together with the features and the
 * rationale that produced it. It is intended for formative feedback, for
 * corpus-scale research and as a reproducible baseline against which opaque
 * neural scorers can be compared. It is explicitly **not** a prediction of an
 * official examiner award, and the response says so.
 *
 * @packageDocumentation
 */

import { averageCriteriaToBand, type Band } from "../domain/band.ts";
import { cohesionProfile, type CohesionProfile } from "../data/cohesion.ts";
import { MINIMUM_WORDS } from "../data/writing-tasks.ts";
import { lexicalProfile, type LexicalProfile } from "../text/lexicon.ts";
import { readability, type ReadabilityReport } from "../text/readability.ts";
import { splitParagraphs, tokenizeWords } from "../text/tokenize.ts";
import type { Module, RubricCriterion } from "../core/types.ts";
import {
  countIssues,
  detectIssues,
  type DetectedIssue,
  type IssueCounts,
} from "./issues.ts";

/** Options for {@link analyseWriting}. */
export interface AnalyseWritingOptions {
  /** Which Writing task the response answers. */
  readonly task: 1 | 2;
  /** Which module the response belongs to; recorded for provenance. */
  readonly module?: Module;
  /** Maximum number of detected issues to return. */
  readonly issueLimit?: number;
}

/** A criterion score together with the reasoning that produced it. */
export interface CriterionEstimate {
  /** The criterion being estimated. */
  readonly criterion: RubricCriterion;
  /** The estimated score, a multiple of 0.5 in `[0, 9]`. */
  readonly score: Band;
  /** Human-readable justification listing the features that were used. */
  readonly rationale: readonly string[];
}

/** The complete analysis of a Writing response. */
export interface WritingAnalysis {
  /** The task the response was analysed against. */
  readonly task: 1 | 2;
  /** The module recorded for provenance, if supplied. */
  readonly module: Module | null;
  /** Number of word tokens. */
  readonly wordCount: number;
  /** Number of paragraphs. */
  readonly paragraphCount: number;
  /** The rubric word minimum for the task. */
  readonly minimumWords: number;
  /** Whether the response reaches the word minimum. */
  readonly meetsWordMinimum: boolean;
  /** Readability indices and surface statistics. */
  readonly readability: ReadabilityReport;
  /** Academic vocabulary profile. */
  readonly lexis: LexicalProfile;
  /** Cohesive-device profile. */
  readonly cohesion: CohesionProfile;
  /** Detected rule-base issues, ordered by position. */
  readonly issues: readonly DetectedIssue[];
  /** Issue counts by severity. */
  readonly issueCounts: IssueCounts;
  /** Per-criterion estimates. */
  readonly criteria: readonly CriterionEstimate[];
  /** Mean of the four criterion estimates before rounding. */
  readonly estimatedMean: number;
  /** The rounded estimated band. */
  readonly estimatedBand: Band;
  /** A machine-readable statement of the estimator's limitations. */
  readonly disclaimer: string;
}

const DISCLAIMER =
  "This estimate is produced by a deterministic, text-internal rubric. It does not " +
  "assess topical relevance, factual accuracy or plagiarism, and it is not a " +
  "prediction of an official IELTS examiner award.";

function clampBand(value: number): Band {
  const bounded = Math.min(Math.max(value, 0), 9);
  return Math.round(bounded * 2) / 2;
}

function taskScore(
  wordCount: number,
  minimumWords: number,
  paragraphCount: number,
  rationale: string[],
): number {
  const ratio = wordCount / minimumWords;
  let score: number;
  if (ratio < 0.5) {
    score = 3;
  } else if (ratio < 0.7) {
    score = 4;
  } else if (ratio < 0.9) {
    score = 5;
  } else if (ratio < 1) {
    score = 5.5;
  } else if (ratio < 1.2) {
    score = 6.5;
  } else if (ratio < 1.7) {
    score = 7;
  } else {
    score = 6.5;
    rationale.push(
      "Response is more than 70% over the word minimum, which risks loss of focus.",
    );
  }
  rationale.push(
    `Length is ${String(Math.round(ratio * 100))}% of the ${String(minimumWords)}-word minimum.`,
  );

  if (paragraphCount === 1) {
    score -= 1;
    rationale.push("The response is a single undivided block of text.");
  } else if (paragraphCount >= 3) {
    score += 0.5;
    rationale.push(
      `The response is organised into ${String(paragraphCount)} paragraphs.`,
    );
  }
  return score;
}

function coherenceScore(
  cohesion: CohesionProfile,
  paragraphCount: number,
  punctuationIssues: number,
  rationale: string[],
): number {
  let score: number;
  if (cohesion.distinctFunctions >= 6) {
    score = 7.5;
  } else if (cohesion.distinctFunctions >= 4) {
    score = 7;
  } else if (cohesion.distinctFunctions >= 3) {
    score = 6.5;
  } else if (cohesion.distinctFunctions >= 2) {
    score = 5.5;
  } else if (cohesion.distinctFunctions >= 1) {
    score = 5;
  } else {
    score = 4;
  }
  rationale.push(
    `${String(cohesion.distinctFunctions)} distinct cohesive functions are used across ${String(cohesion.total)} devices.`,
  );

  if (cohesion.densityPer100Words > 12) {
    score -= 1;
    rationale.push(
      "Cohesive devices are over-used relative to the text length.",
    );
  } else if (cohesion.total > 0 && cohesion.densityPer100Words < 1) {
    score -= 0.5;
    rationale.push("Cohesive devices are sparse relative to the text length.");
  }

  if (paragraphCount === 1) {
    score -= 1.5;
    rationale.push("No paragraphing is present.");
  } else if (paragraphCount >= 4) {
    score += 0.5;
    rationale.push("Paragraphing supports a clear progression of ideas.");
  }

  if (punctuationIssues > 0) {
    score -= Math.min(1, punctuationIssues * 0.5);
    rationale.push(
      `${String(punctuationIssues)} punctuation problems affect clause boundaries.`,
    );
  }
  return score;
}

function lexicalScore(
  lexis: LexicalProfile,
  spellingIssues: number,
  registerIssues: number,
  rationale: string[],
): number {
  const coverage = lexis.academicCoverage;
  let score: number;
  if (coverage >= 0.12) {
    score = 8;
  } else if (coverage >= 0.09) {
    score = 7.5;
  } else if (coverage >= 0.06) {
    score = 7;
  } else if (coverage >= 0.04) {
    score = 6.5;
  } else if (coverage >= 0.02) {
    score = 5.5;
  } else {
    score = 5;
  }
  rationale.push(
    `Academic Word List coverage is ${String(Math.round(coverage * 1000) / 10)}% across ${String(lexis.academicFamilies)} families.`,
  );

  if (lexis.rootTypeTokenRatio >= 7) {
    score += 0.5;
    rationale.push("Lexical variety is high for the length of the response.");
  } else if (lexis.tokens > 0 && lexis.rootTypeTokenRatio < 4) {
    score -= 1;
    rationale.push(
      "Vocabulary is repeated heavily for the length of the response.",
    );
  }

  if (spellingIssues > 0) {
    score -= Math.min(2, spellingIssues * 0.5);
    rationale.push(
      `${String(spellingIssues)} non-standard spellings were found.`,
    );
  }
  if (registerIssues > 0) {
    score -= Math.min(1, registerIssues * 0.25);
    rationale.push(
      `${String(registerIssues)} informal items lower the register.`,
    );
  }
  return score;
}

function grammarScore(
  wordCount: number,
  grammarIssues: number,
  meanSentenceLength: number,
  rationale: string[],
): number {
  const per100 = wordCount === 0 ? 0 : (grammarIssues / wordCount) * 100;
  let score: number;
  if (per100 === 0) {
    score = 8;
  } else if (per100 < 0.5) {
    score = 7.5;
  } else if (per100 < 1) {
    score = 7;
  } else if (per100 < 2) {
    score = 6;
  } else if (per100 < 4) {
    score = 5;
  } else if (per100 < 6) {
    score = 4.5;
  } else {
    score = 4;
  }
  rationale.push(
    `${String(grammarIssues)} grammatical problems were detected (${String(Math.round(per100 * 100) / 100)} per 100 words).`,
  );

  if (meanSentenceLength >= 12 && meanSentenceLength <= 22) {
    score += 0.5;
    rationale.push(
      "Mean sentence length is in the range typical of academic prose.",
    );
  } else if (
    meanSentenceLength > 30 ||
    (wordCount > 0 && meanSentenceLength < 7)
  ) {
    score -= 0.5;
    rationale.push("Mean sentence length is atypical of academic prose.");
  }
  return score;
}

const GRAMMAR_CATEGORIES = new Set([
  "agreement",
  "countability",
  "preposition",
  "article",
  "word-form",
  "collocation",
]);

/**
 * Analyses a Writing response and estimates a band for each criterion.
 *
 * @param text - The candidate response.
 * @param options - The task number and optional provenance metadata.
 */
export function analyseWriting(
  text: string,
  options: AnalyseWritingOptions,
): WritingAnalysis {
  const tokens = tokenizeWords(text);
  const wordCount = tokens.length;
  const paragraphs = splitParagraphs(text);
  const paragraphCount = paragraphs.length;
  const minimumWords = MINIMUM_WORDS[options.task];

  const report = readability(text);
  const lexis = lexicalProfile(text);
  const cohesion = cohesionProfile(text, wordCount);
  const allIssues = detectIssues(text);
  const issues =
    options.issueLimit === undefined
      ? allIssues
      : allIssues.slice(0, options.issueLimit);
  const issueCounts = countIssues(allIssues);

  const spellingIssues = allIssues.filter(
    (issue) => issue.category === "spelling",
  ).length;
  const registerIssues = allIssues.filter(
    (issue) => issue.category === "register" || issue.category === "redundancy",
  ).length;
  const punctuationIssues = allIssues.filter(
    (issue) => issue.category === "punctuation",
  ).length;
  const grammarIssues = allIssues.filter((issue) =>
    GRAMMAR_CATEGORIES.has(issue.category),
  ).length;

  const taskRationale: string[] = [];
  const coherenceRationale: string[] = [];
  const lexicalRationale: string[] = [];
  const grammarRationale: string[] = [];

  const criteria: CriterionEstimate[] = [
    {
      criterion:
        options.task === 1
          ? ("task-achievement" as const)
          : ("task-response" as const),
      score: clampBand(
        taskScore(wordCount, minimumWords, paragraphCount, taskRationale),
      ),
      rationale: taskRationale,
    },
    {
      criterion: "coherence-and-cohesion",
      score: clampBand(
        coherenceScore(
          cohesion,
          paragraphCount,
          punctuationIssues,
          coherenceRationale,
        ),
      ),
      rationale: coherenceRationale,
    },
    {
      criterion: "lexical-resource",
      score: clampBand(
        lexicalScore(lexis, spellingIssues, registerIssues, lexicalRationale),
      ),
      rationale: lexicalRationale,
    },
    {
      criterion: "grammatical-range-and-accuracy",
      score: clampBand(
        grammarScore(
          wordCount,
          grammarIssues,
          report.statistics.meanSentenceLength,
          grammarRationale,
        ),
      ),
      rationale: grammarRationale,
    },
  ];

  const { mean, band } = averageCriteriaToBand(
    criteria.map((entry) => entry.score),
  );

  return {
    task: options.task,
    module: options.module ?? null,
    wordCount,
    paragraphCount,
    minimumWords,
    meetsWordMinimum: wordCount >= minimumWords,
    readability: report,
    lexis,
    cohesion,
    issues,
    issueCounts,
    criteria,
    estimatedMean: Math.round(mean * 1000) / 1000,
    estimatedBand: band,
    disclaimer: DISCLAIMER,
  };
}
