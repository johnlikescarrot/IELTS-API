/**
 * Vocabulary routes (`/v1/vocabulary`).
 */

import {
  searchVocabulary,
  vocabularyStats,
  findWord,
  randomEntries,
  recurrenceAnalysis,
  PARTS_OF_SPEECH,
} from '../data/vocabulary.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getIsoDate, getString, toParams } from '../lib/query.js';
import { REVIEW_SCHEMES, buildReviewPlan } from '../lib/review.js';
import { badRequest, notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PartOfSpeech, VocabularyEntry } from '../types.js';

const MATCH_MODES = ['contains', 'prefix', 'exact'] as const;
const SORT_KEYS = ['word', 'length', 'volumes', 'senses'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Maximum headwords one review schedule covers. */
const MAX_SCHEDULE_WORDS = 50;

/** Parse a comma-separated list of Cambridge IELTS volume numbers. */
function parseVolumes(raw: string | undefined): number[] | undefined {
  const tokens = parseList(raw, 'volume');
  if (tokens === undefined) {
    return undefined;
  }
  return tokens.map((token) => {
    const volume = /^\d{1,2}$/.test(token) ? Number.parseInt(token, 10) : Number.NaN;
    if (!Number.isInteger(volume) || volume < 1 || volume > 22) {
      throw badRequest('Parameter "volume" must list volumes between 1 and 22.', {
        parameter: 'volume',
        received: token,
      });
    }
    return volume;
  });
}

/** Search the vocabulary dataset. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? getString(params, 'query');
  const volumes = parseVolumes(getString(params, 'volume'));
  const posTokens = parseList(getString(params, 'pos'), 'pos', PARTS_OF_SPEECH);
  const match = getEnum(params, 'match', MATCH_MODES);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);

  const page = searchVocabulary({
    limit,
    offset,
    ...(query === undefined ? {} : { query }),
    ...(volumes === undefined ? {} : { volumes }),
    ...(posTokens === undefined ? {} : { partsOfSpeech: posTokens as PartOfSpeech[] }),
    ...(match === undefined ? {} : { match }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });

  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query ?? null,
      volume: volumes ?? null,
      pos: posTokens ?? null,
      match: match ?? 'contains',
      sort: sort ?? 'word',
      order: order ?? 'asc',
    },
  };
}

/** Dataset statistics. */
function stats(): HandlerResult {
  return { data: vocabularyStats() };
}

/** Deterministic random sample. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 5);
  const seed = getString(params, 'seed') ?? String(Date.now());
  return { data: randomEntries(seed, count), meta: { count, seed } };
}

/** Word of the day, stable for a given calendar date. */
function daily(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const date = getIsoDate(params, 'date', new Date().toISOString().slice(0, 10));
  const count = getInt(params, 'count', 1, 10, 1);
  const entries = randomEntries(`ielts-api:daily:${date}`, count);
  return { data: count === 1 ? (entries[0] as VocabularyEntry) : entries, meta: { date, count } };
}

/** Look up one headword. */
function lookup(context: RouteContext): HandlerResult {
  const word = context.params.word as string;
  const entry: VocabularyEntry | undefined = findWord(word);
  if (entry === undefined) {
    throw notFound(`No vocabulary entry for "${word}".`, { word });
  }
  return { data: entry, meta: { word: entry.word } };
}

/**
 * Parse and resolve the `words` parameter of a review schedule.
 *
 * Tokens are trimmed, de-duplicated case-insensitively and resolved against
 * the dataset; unknown headwords are rejected as a group so a typo never
 * silently shrinks the schedule.
 *
 * @param raw - Raw comma-separated headword list.
 */
function resolveWords(raw: string): VocabularyEntry[] {
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    throw badRequest('Parameter "words" must list at least one headword.', {
      parameter: 'words',
      received: raw,
    });
  }
  if (tokens.length > MAX_SCHEDULE_WORDS) {
    throw badRequest(`Parameter "words" must list at most ${MAX_SCHEDULE_WORDS} headwords.`, {
      parameter: 'words',
      received: String(tokens.length),
      limit: String(MAX_SCHEDULE_WORDS),
    });
  }
  const entries: VocabularyEntry[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const entry = findWord(token);
    if (entry === undefined) {
      unknown.push(token);
    } else if (!seen.has(entry.id)) {
      seen.add(entry.id);
      entries.push(entry);
    }
  }
  if (unknown.length > 0) {
    throw badRequest(`No vocabulary entries for: ${unknown.join(', ')}.`, {
      parameter: 'words',
      received: raw,
      unknown: unknown.join(','),
    });
  }
  return entries;
}

/** Deterministic spaced-repetition review schedule for a set of headwords. */
function schedule(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const words = getString(params, 'words');
  const count = getString(params, 'count');
  const seed = getString(params, 'seed');
  if (words !== undefined && (count !== undefined || seed !== undefined)) {
    throw badRequest('Provide either "words" or "count"/"seed", not both.', {
      parameter: 'words',
    });
  }
  const start = getIsoDate(params, 'start', new Date().toISOString().slice(0, 10));
  const scheme = getEnum(params, 'scheme', REVIEW_SCHEMES) ?? 'ebbinghaus';
  const sampleSeed = seed ?? `ielts-api:schedule:${start}`;
  const entries =
    words !== undefined
      ? resolveWords(words)
      : randomEntries(sampleSeed, getInt(params, 'count', 1, MAX_SCHEDULE_WORDS, 10));
  return {
    data: buildReviewPlan({ entries, start, scheme }),
    meta: {
      method:
        'Exponential forgetting (Ebbinghaus): retention halves every half-life and each scheduled review doubles the half-life. "predictedRetention" is the modelled probability of recall immediately before the review; the model is stateless, so it describes the schedule, not a learner.',
      scheme,
      start,
      seed: words === undefined ? sampleSeed : null,
    },
  };
}

/** Cross-volume recurrence analysis of the vocabulary dataset. */
function recurrence(): HandlerResult {
  return {
    data: recurrenceAnalysis(),
    meta: {
      method:
        'Recurrence is the number of Cambridge IELTS volumes (out of 1-22) whose published word list contains the headword. The lists are editorial selections, not token counts.',
    },
  };
}

/** Vocabulary routes. */
export const vocabularyRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/vocabulary',
    versioned: true,
    summary: 'Search the Cambridge IELTS 1-22 vocabulary dataset.',
    handler: search,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/stats',
    versioned: true,
    summary: 'Aggregate statistics for the vocabulary dataset.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/random',
    versioned: true,
    summary: 'A seeded random sample of vocabulary entries.',
    handler: random,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/daily',
    versioned: true,
    summary: 'A deterministic vocabulary entry for a calendar date.',
    handler: daily,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/recurrence',
    versioned: true,
    summary: 'Cross-volume recurrence: which headwords repeat across Cambridge IELTS volumes.',
    handler: recurrence,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/schedule',
    versioned: true,
    summary: 'A deterministic spaced-repetition review calendar with predicted retention per review.',
    handler: schedule,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/:word',
    versioned: true,
    summary: 'Look up a single headword.',
    handler: lookup,
  },
];
