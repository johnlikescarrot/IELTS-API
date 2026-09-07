/**
 * Vocabulary routes (`/v1/vocabulary`).
 */

import { COLLECTION_IDS } from '../data/collections.js';
import {
  searchVocabulary,
  vocabularyStats,
  findWord,
  randomEntries,
  PARTS_OF_SPEECH,
} from '../data/vocabulary.js';
import { paginate, parseList } from '../lib/search.js';
import { collectionForEntry } from '../lib/collections.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, getIsoDate, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PartOfSpeech, VocabularyEntry } from '../types.js';

const MATCH_MODES = ['contains', 'prefix', 'exact'] as const;
const SORT_KEYS = ['word', 'length', 'volumes', 'senses'] as const;
const ORDERS = ['asc', 'desc'] as const;
const FREQUENCIES = ['high', 'medium', 'low'] as const;

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
  const collectionTokens = parseList(getString(params, 'collection'), 'collection', COLLECTION_IDS);
  const frequencyTokens = parseList(getString(params, 'frequency'), 'frequency', FREQUENCIES);
  const match = getEnum(params, 'match', MATCH_MODES);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);

  // Base search without collection (data layer handles frequency/volumes/pos).
  const base = searchVocabulary({
    limit: 100000,
    offset: 0,
    ...(query === undefined ? {} : { query }),
    ...(volumes === undefined ? {} : { volumes }),
    ...(posTokens === undefined ? {} : { partsOfSpeech: posTokens as PartOfSpeech[] }),
    ...(frequencyTokens === undefined
      ? {}
      : { frequencies: frequencyTokens as ('high' | 'medium' | 'low')[] }),
    ...(match === undefined ? {} : { match }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });

  let filtered: VocabularyEntry[] = base.items as VocabularyEntry[];
  if (collectionTokens !== undefined && collectionTokens.length > 0) {
    const allowed = new Set(collectionTokens);
    filtered = filtered.filter((entry) => {
      const collection = collectionForEntry(entry.id);
      return collection !== null && allowed.has(collection);
    });
  }

  const total = filtered.length;
  const page = paginate(filtered, limit, offset);

  return {
    data: page.items,
    meta: {
      total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query ?? null,
      volume: volumes ?? null,
      pos: posTokens ?? null,
      collection: collectionTokens ?? null,
      frequency: frequencyTokens ?? null,
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
