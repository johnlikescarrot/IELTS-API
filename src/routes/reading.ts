/**
 * Reading routes (`/v1/reading`).
 */

import {
  searchReading,
  readingStats,
  findReadingItem,
  randomReadingItems,
  READING_LEVELS,
  READING_QUESTION_TYPES,
  readingTopics,
} from '../data/reading.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getIsoDate, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ReadingItem, ReadingLevel, ReadingQuestionType } from '../types.js';

const SORT_KEYS = ['level', 'title', 'topic', 'wordCount'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Search the reading item bank. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? getString(params, 'query');
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);

  const levels = parseList(getString(params, 'level'), 'level', READING_LEVELS) as ReadingLevel[] | undefined;
  const topics = parseList(getString(params, 'topic'), 'topic', readingTopics());
  const questionTypes = parseList(getString(params, 'type'), 'type', READING_QUESTION_TYPES) as
    ReadingQuestionType[] | undefined;

  const page = searchReading({
    limit,
    offset,
    ...(query === undefined ? {} : { query }),
    ...(levels === undefined ? {} : { levels }),
    ...(topics === undefined ? {} : { topics }),
    ...(questionTypes === undefined ? {} : { questionTypes }),
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
      level: levels ?? null,
      topic: topics ?? null,
      type: questionTypes ?? null,
      sort: sort ?? 'level',
      order: order ?? 'asc',
    },
  };
}

/** Dataset statistics. */
function stats(): HandlerResult {
  return { data: readingStats() };
}

/** Unique topic values in the item bank. */
function topicIndex(): HandlerResult {
  return { data: readingTopics(), meta: { count: readingTopics().length } };
}

/** The question-type taxonomy served by the API. */
function taxonomy(): HandlerResult {
  return { data: READING_QUESTION_TYPES, meta: { count: READING_QUESTION_TYPES.length } };
}

/** Deterministic random sample. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 5);
  const seed = getString(params, 'seed') ?? String(Date.now());
  const level = getEnum(params, 'level', READING_LEVELS);
  const items = randomReadingItems(seed, count, level);
  return { data: items, meta: { count, seed, level: level ?? null } };
}

/** Reading item of the day, stable for a given calendar date. */
function daily(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const date = getIsoDate(params, 'date', new Date().toISOString().slice(0, 10));
  const [item] = randomReadingItems(`ielts-api:reading:daily:${date}`, 1);
  return { data: item as ReadingItem, meta: { date } };
}

/** Look up one reading item. */
function lookup(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findReadingItem(id);
  if (item === undefined) {
    throw notFound(`No reading item with id "${id}".`, { id });
  }
  return { data: item, meta: { id: item.id } };
}

/** Reading routes. */
export const readingRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/reading',
    versioned: true,
    summary: 'Search the original CEFR-levelled Reading item bank.',
    handler: search,
  },
  {
    method: 'GET',
    path: '/v1/reading/stats',
    versioned: true,
    summary: 'Aggregate statistics for the Reading item bank.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/reading/topics',
    versioned: true,
    summary: 'Unique topic values used by the Reading item bank.',
    handler: topicIndex,
  },
  {
    method: 'GET',
    path: '/v1/reading/types',
    versioned: true,
    summary: 'The Academic Reading question-type taxonomy served by the API.',
    handler: taxonomy,
  },
  {
    method: 'GET',
    path: '/v1/reading/random',
    versioned: true,
    summary: 'A seeded random sample of Reading items.',
    handler: random,
  },
  {
    method: 'GET',
    path: '/v1/reading/daily',
    versioned: true,
    summary: 'A deterministic Reading item for a calendar date.',
    handler: daily,
  },
  {
    method: 'GET',
    path: '/v1/reading/:id',
    versioned: true,
    summary: 'Look up a single Reading item with its passage and questions.',
    handler: lookup,
  },
];
