/**
 * Text-analysis routes (`/v1/tools`).
 *
 * Deterministic, offline analysers: they read only the request text plus the
 * datasets already published by the API, so their outputs are reproducible and
 * archivable like every other endpoint.
 */

import { MAX_RAW_SCORE, nextBandFrom, RAW_SCORE_PAPERS, rawScoreRow } from '../data/rawScores.js';
import { cefrForBand } from '../data/bands.js';
import { analyseEssay, analyseReadability, TASK_MINIMUM_WORDS } from '../lib/analysis.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getString, requireString, toParams } from '../lib/query.js';
import { markSheet } from '../lib/marking.js';
import { MAX_TEXT_LENGTH, wordsOf } from '../lib/textstats.js';

import type { QueryParams } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Writing tasks whose minimum length the essay profile knows. */
const TASKS = ['task1', 'task2'] as const;

/**
 * Read and validate the `text` parameter shared by the analysis tools.
 *
 * @param params - Query parameters.
 */
function requireText(params: QueryParams): string {
  const text = requireString(params, 'text');
  if (text.length > MAX_TEXT_LENGTH) {
    throw badRequest(`Parameter "text" must be at most ${MAX_TEXT_LENGTH} characters.`, {
      parameter: 'text',
      received: String(text.length),
      limit: String(MAX_TEXT_LENGTH),
    });
  }
  if (wordsOf(text).length === 0) {
    throw badRequest('Parameter "text" contains no analysable words; alphabetic tokens are required.', {
      parameter: 'text',
      received: text.slice(0, 50),
    });
  }
  return text;
}

/** Flesch readability of arbitrary text, placed against the corpus groups. */
function readability(context: RouteContext): HandlerResult {
  const text = requireText(toParams(context.url));
  return {
    data: analyseReadability(text),
    meta: {
      method:
        'Flesch Reading Ease and Flesch-Kincaid grade from mean sentence length and mean syllables per word; tokens are alphabetic, numerals are excluded.',
      corpusReference: 'Group means come from the practice-test index published at /v1/tests/stats.',
      limits: { maxCharacters: MAX_TEXT_LENGTH },
    },
  };
}

/** Lexical, structural and theme profile of a writing sample. */
function essayProfile(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const text = requireText(params);
  const task = getEnum(params, 'task', TASKS) ?? 'task2';
  const themeLimit = getInt(params, 'limit', 1, 10, 5);
  return {
    data: analyseEssay(text, task, themeLimit),
    meta: {
      method:
        'Surface heuristics only: token diversity, sentence-length spread, Cambridge headword coverage, recurring-theme keywords and fixed thresholds.',
      disclaimer:
        'Hints are teaching heuristics, not scores. They reference the criteria of the analytic descriptors published at /v1/bands/descriptors.',
      taskMinimumWords: TASK_MINIMUM_WORDS[task],
    },
  };
}

/** Longest answer sheet the marker accepts, in characters per list. */
export const MAX_SHEET_LENGTH = 4000;

/**
 * Split a pipe-delimited answer list.
 *
 * Pipes are used rather than commas because IELTS answers routinely contain
 * commas ("2,000 years") and never contain pipes. An empty slot is a blank
 * answer, so `a||c` is three questions with the second left unanswered.
 *
 * @param value - Raw list.
 * @param key - Parameter name, used in error messages.
 */
function splitList(value: string, key: string): string[] {
  if (value.length > MAX_SHEET_LENGTH) {
    throw badRequest(`Parameter "${key}" must be at most ${MAX_SHEET_LENGTH} characters.`, {
      parameter: key,
      received: String(value.length),
      limit: String(MAX_SHEET_LENGTH),
    });
  }
  return value.split('|').map((entry) => entry.trim());
}

/** Mark a Listening or Reading answer sheet against a published key. */
function mark(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const key = splitList(requireString(params, 'key'), 'key');
  const answersRaw = getString(params, 'answers');
  const answers = answersRaw === undefined ? [] : splitList(answersRaw, 'answers');
  if (answers.length > key.length) {
    throw badRequest('More answers were supplied than the key has questions.', {
      parameter: 'answers',
      answers: String(answers.length),
      key: String(key.length),
    });
  }
  if (key.length > MAX_RAW_SCORE) {
    throw badRequest(`A key may contain at most ${MAX_RAW_SCORE} questions.`, {
      parameter: 'key',
      received: String(key.length),
      limit: String(MAX_RAW_SCORE),
    });
  }
  const wordLimit = getInt(params, 'wordLimit', 1, 10, -1);
  const paper = getEnum(params, 'paper', RAW_SCORE_PAPERS);
  const sheet = markSheet(answers, key, wordLimit > 0 ? { wordLimit } : {});

  const band =
    paper !== undefined && key.length === MAX_RAW_SCORE
      ? (() => {
          const row = rawScoreRow(paper, sheet.correct);
          return {
            paper,
            band: row.band,
            cefr: cefrForBand(row.band),
            marksToNextBand: nextBandFrom(paper, sheet.correct),
            extrapolated: row.extrapolated,
          };
        })()
      : null;

  return {
    data: { ...sheet, band },
    meta: {
      method:
        'Marking is case-insensitive, ignores surrounding punctuation and optional bracketed words, accepts any alternative separated by "/" or "OR", and treats British and American spellings as equivalent.',
      wordLimit: wordLimit > 0 ? wordLimit : null,
      nearMiss:
        'A near miss is a wrong answer within one edit of an accepted form: the mark was almost certainly lost to spelling rather than to comprehension.',
      banding:
        band === null
          ? `Supply paper=${RAW_SCORE_PAPERS.join('|')} together with a full ${MAX_RAW_SCORE}-question key to receive a band.`
          : 'The band comes from the indicative table published at /v1/scores/raw/tables.',
      limits: { maxQuestions: MAX_RAW_SCORE, maxCharactersPerList: MAX_SHEET_LENGTH },
    },
  };
}

/** Text-analysis routes. */
export const toolRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/tools/readability',
    versioned: true,
    summary: 'Flesch Reading Ease, Flesch-Kincaid grade and text statistics for any passage.',
    handler: readability,
  },
  {
    method: 'GET',
    path: '/v1/tools/essay-profile',
    versioned: true,
    summary:
      'Lexical diversity, headword coverage, themes and descriptor-aligned hints for a writing sample.',
    handler: essayProfile,
  },
  {
    method: 'GET',
    path: '/v1/tools/mark',
    versioned: true,
    summary: 'Mark a Listening or Reading answer sheet against a published key and convert it to a band.',
    handler: mark,
  },
];
