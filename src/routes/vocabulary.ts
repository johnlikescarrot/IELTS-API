/**
 * Vocabulary routes (`/v1/vocabulary`).
 */

import {
  searchVocabulary,
  vocabularyStats,
  findWord,
  randomEntries,
  PARTS_OF_SPEECH,
} from '../data/vocabulary.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getIsoDate, getString, parseVolumeList, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PartOfSpeech, VocabularyEntry } from '../types.js';

const MATCH_MODES = ['contains', 'prefix', 'exact'] as const;
const SORT_KEYS = ['word', 'length', 'volumes', 'senses'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Search the vocabulary dataset. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? getString(params, 'query');
  const volumes = parseVolumeList(getString(params, 'volume'));
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
    path: '/v1/vocabulary/:word',
    versioned: true,
    summary: 'Look up a single headword.',
    handler: lookup,
  },
];
