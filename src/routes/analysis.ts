/**
 * Text-analysis routes (`/v1/analysis`).
 *
 * These are the only endpoints that take substantial user input, so they are
 * also the only ones that need an input budget: text longer than
 * {@link MAX_TEXT_LENGTH} is rejected with `422` rather than silently
 * truncated, which keeps the service safe to run unauthenticated.
 *
 * Text is supplied in the `text` query parameter. The API is GET-only by
 * design — a GET response is cacheable, archivable and citable, and a reader
 * following a URL from a paper gets exactly the result the author saw.
 */

import { headwordSet } from '../data/vocabulary.js';
import { assessEssay, MINIMUM_WORDS } from '../lib/essay.js';
import { getEnum, getInt, requireString, toParams } from '../lib/query.js';
import { lexicalReport } from '../lib/lexical.js';
import { readability } from '../lib/readability.js';
import { normaliseParagraphs, normaliseText, MAX_TEXT_LENGTH } from '../lib/text.js';
import { unprocessable } from '../lib/errors.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';
import type { WritingTask } from '../lib/essay.js';

/** Writing tasks accepted by `/v1/analysis/essay`. */
export const WRITING_TASKS: readonly WritingTask[] = ['task-1', 'task-2'];

/** Provenance attached to every analysis response. */
const PROVENANCE = {
  segmentation:
    'Words are runs of ASCII letters with internal apostrophes or hyphens; sentences end at . ! ? or a newline; ' +
    'syllables use a documented vowel-group heuristic. See src/lib/text.ts.',
  reproducibility:
    'Analysis is pure and deterministic: the same text always yields the same result for a given API version.',
};

/**
 * Read and validate the `text` parameter.
 *
 * @param context - Route context.
 * @returns The normalised text.
 * @throws {HttpError} `400` when absent or blank, `422` when over-long.
 */
function readText(context: RouteContext, keepParagraphs = false): string {
  const params = toParams(context.url);
  const raw = requireString(params, 'text');
  if (raw.length > MAX_TEXT_LENGTH) {
    throw unprocessable(`Parameter "text" must be at most ${MAX_TEXT_LENGTH} characters.`, {
      parameter: 'text',
      maxLength: String(MAX_TEXT_LENGTH),
      received: String(raw.length),
    });
  }
  /*
   * No emptiness check is needed here: `requireString` already rejects an
   * absent or all-whitespace parameter with `400`, and normalisation only
   * collapses whitespace, so the result is always non-empty. Text that
   * contains no *words* (for example `...`) is analysed normally and reported
   * with zero counts rather than treated as an error.
   */
  return keepParagraphs ? normaliseParagraphs(raw) : normaliseText(raw);
}

/** Readability scores for a text. */
function readabilityRoute(context: RouteContext): HandlerResult {
  const text = readText(context);
  const report = readability(text);
  return {
    data: {
      stats: report.stats,
      scores: report.scores,
      consensusGrade: report.consensusGrade,
      consensus: report.consensus,
    },
    meta: {
      ...PROVENANCE,
      formulas: report.scores.length,
      note: 'Formulas were calibrated on different populations; the spread between them is informative, and the consensus is the mean of the five grade-level formulas.',
    },
  };
}

/** Lexical diversity and Cambridge coverage for a text. */
function lexicalRoute(context: RouteContext): HandlerResult {
  const text = readText(context);
  const params = toParams(context.url);
  const top = getInt(params, 'top', 1, 50, 10);
  const report = lexicalReport(text, headwordSet(), top);
  return {
    data: report,
    meta: {
      ...PROVENANCE,
      cambridgeHeadwords: headwordSet().size,
      note: 'Raw type-token ratio falls as a text lengthens; use movingAverageTypeTokenRatio to compare texts of different lengths.',
    },
  };
}

/** Mechanical checks on a Writing Task response. */
function essayRoute(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const task = getEnum(params, 'task', WRITING_TASKS) ?? 'task-2';
  const text = readText(context, true);
  const report = assessEssay(text, task, headwordSet());
  return {
    data: report,
    meta: {
      ...PROVENANCE,
      task,
      minimumWords: MINIMUM_WORDS[task],
      note: 'Mechanical checks only: indicativeBand is a floor implied by objective criteria, not a predicted band score.',
    },
  };
}

/** Text-analysis routes. */
export const analysisRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/analysis/readability',
    versioned: true,
    summary: 'Six classical readability formulas computed from one documented segmentation.',
    handler: readabilityRoute,
  },
  {
    method: 'GET',
    path: '/v1/analysis/lexical',
    versioned: true,
    summary: 'Lexical diversity, Cambridge IELTS vocabulary coverage and word repetition.',
    handler: lexicalRoute,
  },
  {
    method: 'GET',
    path: '/v1/analysis/essay',
    versioned: true,
    summary: 'Mechanical checks on a Writing Task response against published requirements.',
    handler: essayRoute,
  },
];
