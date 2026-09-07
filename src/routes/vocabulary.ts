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

import {
  VOCABULARY_COLLECTIONS,
  findCollection,
  vocabularyCollectionsStats,
  wordsForCollection,
} from '../data/vocabularyCollections.js';
import { estimateDifficulty } from '../lib/vocabularyDifficulty.js';
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

/** Collections index (Cambridge volumes + 22 thematic scenes). */
function collections(): HandlerResult {
  const stats = vocabularyCollectionsStats();
  return {
    data: VOCABULARY_COLLECTIONS,
    meta: {
      total: VOCABULARY_COLLECTIONS.length,
      stats,
      note: 'Thematic collections use keyword matching and arbitrary hash fallback, not validated semantic classification.',
    },
  };
}

/** One collection by id. */
function collectionDetail(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const collection = findCollection(id);
  if (collection === undefined) {
    throw notFound(`No vocabulary collection for "${id}".`, { id });
  }
  const stats = vocabularyCollectionsStats();
  const count = stats.wordsPerCollection[id] as number;
  return { data: collection, meta: { id, words: count } };
}

/** Paginated words in a collection. */
function collectionWords(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const collection = findCollection(id);
  if (collection === undefined) {
    throw notFound(`No vocabulary collection for "${id}".`, { id });
  }
  const params = toParams(context.url);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);
  const page = wordsForCollection(id, limit, offset);
  return {
    data: page.items,
    meta: { id, total: page.total, limit: page.limit, offset: page.offset, hasMore: page.hasMore },
  };
}

/** Deterministic review queue (seeded sample with synthetic SRS metadata). */
function reviewQueue(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 10);
  const seed = getString(params, 'seed') ?? 'ielts-api:review-queue';
  const entries = randomEntries(seed, count);
  const data = entries.map((entry, index) => ({
    ...entry,
    queuePosition: index + 1,
    suggestedIntervalDays: Math.max(1, Math.round((entry.volumes.length / 22) * 7 + 1)),
  }));
  return {
    data,
    meta: {
      count,
      seed,
      total: count,
      note: 'Synthetic sample, not a due queue derived from learner history. Use POST /v1/study/review/queue for client-owned progress.',
    },
  };
}

/** Difficulty estimate for a headword. */
function difficulty(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const word = getString(params, 'word');
  if (word === undefined) {
    throw badRequest('Parameter "word" is required.', { parameter: 'word' });
  }
  const entry = findWord(word);
  if (entry === undefined) {
    throw notFound(`No vocabulary entry for "${word}".`, { word });
  }
  return {
    data: estimateDifficulty(entry),
    meta: {
      word: entry.word,
      note: 'Heuristic score and CEFR-style label; not a calibrated CEFR placement or learner assessment.',
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
    path: '/v1/vocabulary/collections',
    versioned: true,
    summary: 'Vocabulary collections: 22 Cambridge volumes and 22 thematic scenes.',
    handler: collections,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/collections/:id',
    versioned: true,
    summary: 'One vocabulary collection by id.',
    handler: collectionDetail,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/collections/:id/words',
    versioned: true,
    summary: 'Paginated headwords in a vocabulary collection.',
    handler: collectionWords,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/review-queue',
    versioned: true,
    summary: 'Deterministic review queue (seeded sample with SRS hints).',
    handler: reviewQueue,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/difficulty',
    versioned: true,
    summary: 'Difficulty estimate (0-100, CEFR level) for a headword.',
    handler: difficulty,
  },
  {
    method: 'GET',
    path: '/v1/vocabulary/:word',
    versioned: true,
    summary: 'Look up a single headword.',
    handler: lookup,
  },
];
