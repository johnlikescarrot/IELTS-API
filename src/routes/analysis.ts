/**
 * Text-analytics routes (`/v1/analyze`).
 *
 * These endpoints accept a candidate response and return reproducible,
 * literature-standard measurements of it. They are the only endpoints that
 * accept `POST`, because essays routinely exceed a safe query-string length;
 * short texts may still be passed as `?text=`, which keeps every endpoint
 * usable from a plain browser address bar.
 */

import { analyseCohesion, analyseEssay, COHESIVE_DEVICES, MINIMUM_WORDS } from '../lib/essay.js';
import { badRequest } from '../lib/errors.js';
import { countText, diversity, readability, sentenceStats, tokenize, topFrequencies } from '../lib/text.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { findWord } from '../data/vocabulary.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';
import type { WritingTask } from '../lib/essay.js';
import type { JsonValue } from '../types.js';

/** Writing tasks accepted by `/v1/analyze/essay`. */
export const WRITING_TASKS: readonly WritingTask[] = ['task-1', 'task-2'];

/**
 * Read the text to analyse from the request body or the `text` parameter.
 *
 * A JSON body (`{"text": "..."}`) and a `text/plain` body are both accepted;
 * anything that is not valid JSON is treated as plain text, so `curl --data-binary`
 * works without a content-type header.
 *
 * @param context - Route context.
 * @returns The text to analyse.
 * @throws {HttpError} `400` when no non-empty text is supplied.
 */
export function extractText(context: RouteContext): string {
  const body = context.body;
  let text = getString(toParams(context.url), 'text') ?? '';
  if (body !== undefined && body.trim().length > 0) {
    text = parseBody(body);
  }
  if (text.trim().length === 0) {
    throw badRequest('Provide the text to analyse in the request body or in the "text" query parameter.', {
      parameter: 'text',
    });
  }
  return text;
}

/** Interpret a request body as JSON `{ text }` or as plain text. */
function parseBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) {
    return body;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw badRequest('The request body is not valid JSON.', { parameter: 'body' });
  }
  const value = (parsed as { text?: unknown }).text;
  if (typeof value !== 'string') {
    throw badRequest('A JSON body must contain a string "text" property.', { parameter: 'text' });
  }
  return value;
}

/** Provenance note attached to every analysis response. */
const PROVENANCE =
  'All measures are computed in-process from published formulas; no text is stored, logged or transmitted.';

/** Readability and lexical measurements for arbitrary text. */
function analyzeText(context: RouteContext): HandlerResult {
  const text = extractText(context);
  const params = toParams(context.url);
  const top = getInt(params, 'top', 0, 100, 10);
  const counts = countText(text);
  const tokens = tokenize(text);
  return {
    data: {
      counts: { ...counts },
      readability: { ...readability(counts) },
      diversity: { ...diversity(tokens) },
      sentences: { ...sentenceStats(text) },
      frequencies: topFrequencies(tokens, top),
    } as unknown as JsonValue,
    meta: {
      characters: text.length,
      top,
      formulas: [
        'flesch-reading-ease',
        'flesch-kincaid-grade',
        'gunning-fog',
        'smog',
        'coleman-liau',
        'automated-readability-index',
        'ttr',
        'root-ttr',
        'log-ttr',
        'maas',
        'mtld',
      ],
      provenance: PROVENANCE,
    },
  };
}

/** Cohesive-device usage for arbitrary text. */
function analyzeCohesion(context: RouteContext): HandlerResult {
  const text = extractText(context);
  const report = analyseCohesion(text);
  return {
    data: { ...report } as unknown as JsonValue,
    meta: {
      inventory: Object.fromEntries(
        Object.entries(COHESIVE_DEVICES).map(([group, phrases]) => [group, [...phrases]]),
      ),
      provenance: PROVENANCE,
    },
  };
}

/** Full indicative diagnostic report for a Writing response. */
function analyzeEssay(context: RouteContext): HandlerResult {
  const text = extractText(context);
  const params = toParams(context.url);
  const task = getEnum(params, 'task', WRITING_TASKS) ?? 'task-2';
  const report = analyseEssay(text, task);
  return {
    data: { ...report } as unknown as JsonValue,
    meta: {
      task,
      minimumWords: MINIMUM_WORDS[task],
      tasks: [...WRITING_TASKS],
      rubric: 'deterministic-surface-features-v1',
      provenance: PROVENANCE,
    },
  };
}

/**
 * Profile a text against the Cambridge IELTS 1-22 vocabulary dataset:
 * which of its word types appear in the dataset, and in which volumes.
 */
function analyzeVocabulary(context: RouteContext): HandlerResult {
  const text = extractText(context);
  const tokens = tokenize(text);
  const types = [...new Set(tokens)].sort((left, right) => left.localeCompare(right));
  const covered: { word: string; volumes: number[]; partOfSpeech: string }[] = [];
  const missing: string[] = [];
  for (const type of types) {
    const hit = findWord(type);
    if (hit === undefined) {
      missing.push(type);
    } else {
      covered.push({ word: hit.word, volumes: hit.volumes, partOfSpeech: hit.partOfSpeech });
    }
  }
  const coverage = types.length === 0 ? 0 : Math.round((covered.length / types.length) * 10000) / 10000;
  return {
    data: {
      types: types.length,
      inDataset: covered.length,
      coverage,
      covered,
      offList: missing,
    } as unknown as JsonValue,
    meta: {
      dataset: 'cambridge-ielts-1-22-vocabulary',
      note: 'Coverage is the share of distinct word types that appear in the Cambridge IELTS 1-22 word lists; common function words are expected to be off-list.',
      provenance: PROVENANCE,
    },
  };
}

/** Analysis routes, each available over both `GET` and `POST`. */
export const analysisRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/analyze/text',
    versioned: true,
    summary: 'Readability, lexical diversity and sentence statistics for a text.',
    handler: analyzeText,
  },
  {
    method: 'POST',
    path: '/v1/analyze/text',
    versioned: true,
    summary: 'Readability, lexical diversity and sentence statistics for a posted text.',
    handler: analyzeText,
  },
  {
    method: 'GET',
    path: '/v1/analyze/cohesion',
    versioned: true,
    summary: 'Cohesive devices used in a text, grouped by discourse function.',
    handler: analyzeCohesion,
  },
  {
    method: 'POST',
    path: '/v1/analyze/cohesion',
    versioned: true,
    summary: 'Cohesive devices used in a posted text, grouped by discourse function.',
    handler: analyzeCohesion,
  },
  {
    method: 'GET',
    path: '/v1/analyze/essay',
    versioned: true,
    summary: 'Indicative, evidence-linked diagnostic report for a Writing response.',
    handler: analyzeEssay,
  },
  {
    method: 'POST',
    path: '/v1/analyze/essay',
    versioned: true,
    summary: 'Indicative, evidence-linked diagnostic report for a posted Writing response.',
    handler: analyzeEssay,
  },
  {
    method: 'GET',
    path: '/v1/analyze/vocabulary',
    versioned: true,
    summary: 'Profile a text against the Cambridge IELTS 1-22 vocabulary dataset.',
    handler: analyzeVocabulary,
  },
  {
    method: 'POST',
    path: '/v1/analyze/vocabulary',
    versioned: true,
    summary: 'Profile a posted text against the Cambridge IELTS 1-22 vocabulary dataset.',
    handler: analyzeVocabulary,
  },
];
