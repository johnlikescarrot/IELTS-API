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
import { createVocabularyDeck } from '../lib/deck.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getIsoDate, getString, requireString, toParams } from '../lib/query.js';
import { badRequest, notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PartOfSpeech, VocabularyEntry } from '../types.js';

const MATCH_MODES = ['contains', 'prefix', 'exact'] as const;
const SORT_KEYS = ['word', 'length', 'volumes', 'senses'] as const;
const ORDERS = ['asc', 'desc'] as const;

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

/** A page of a reproducibly shuffled vocabulary deck, with unsaved initial states. */
function deck(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const volumes = parseVolumes(getString(params, 'volume'));
  const partsOfSpeech = parseList(getString(params, 'pos'), 'pos', PARTS_OF_SPEECH) as
    PartOfSpeech[] | undefined;
  return {
    data: createVocabularyDeck({
      seed: requireString(params, 'seed'),
      on: requireString(params, 'on'),
      limit: getInt(params, 'limit', 1, 50, 10),
      offset: getInt(params, 'offset', 0, 100000, 0),
      ...(volumes === undefined ? {} : { volumes }),
      ...(partsOfSpeech === undefined ? {} : { partsOfSpeech }),
    }),
    meta: {
      algorithm: 'sm2-v1',
      storage: 'client-owned',
      volume: volumes ?? null,
      pos: partsOfSpeech ?? null,
      note: 'Hide the answer until recall. Source glosses are not translated; null means unavailable. No progress is saved.',
    },
  };
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
    path: '/v1/vocabulary/deck',
    versioned: true,
    summary: 'Seeded, non-overlapping vocabulary flashcard pages with client-owned initial review states.',
    handler: deck,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/:word',
    versioned: true,
    summary: 'Look up a single headword.',
    handler: lookup,
  },
];
