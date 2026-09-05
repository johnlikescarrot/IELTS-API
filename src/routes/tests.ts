/**
 * Practice-test index routes (`/v1/tests`).
 *
 * The index publishes derived metadata only: structure, normalised question
 * types, provenance and passage-level readability statistics. No upstream
 * passage, question, answer key or recording is served by this API.
 */

import {
  CEFR_BANDS,
  PRACTICE_COLLECTIONS,
  PRACTICE_SKILLS,
  findPracticeItem,
  observedQuestionTypes,
  practiceFacets,
  practiceMeta,
  practiceStats,
  searchPracticeItems,
} from '../data/practiceTests.js';
import { parseList } from '../lib/search.js';
import { getBoolean, getEnum, getInt, getNumber, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { CefrBand, PracticeCollection, QuestionTypeId } from '../types.js';

const SORT_KEYS = ['id', 'title', 'questions', 'words', 'reading-ease', 'grade'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Index metadata, statistics and the available facets. */
function index(): HandlerResult {
  return {
    data: { meta: practiceMeta(), stats: practiceStats() },
    meta: { facets: practiceFacets() },
  };
}

/** Statistics only. */
function stats(): HandlerResult {
  return { data: practiceStats(), meta: { note: practiceMeta().note } };
}

/** Search the index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const collections = parseList(getString(params, 'collection'), 'collection', PRACTICE_COLLECTIONS);
  const skills = parseList(getString(params, 'skill'), 'skill', PRACTICE_SKILLS);
  const levels = parseList(
    getString(params, 'level'),
    'level',
    CEFR_BANDS.map((band) => band.toLowerCase()),
  );
  const types = parseList(getString(params, 'type'), 'type', observedQuestionTypes());
  const minQuestions = getInt(params, 'minQuestions', 0, 1000, -1);
  const maxQuestions = getInt(params, 'maxQuestions', 0, 1000, -1);
  const minReadingEase = getNumber(params, 'minReadingEase', -1000, 1000);
  const maxReadingEase = getNumber(params, 'maxReadingEase', -1000, 1000);
  const withAudio = getBoolean(params, 'audio', false);

  const page = searchPracticeItems({
    limit,
    offset,
    query,
    ...(collections === undefined ? {} : { collections: collections as PracticeCollection[] }),
    ...(skills === undefined ? {} : { skills: skills as ('reading' | 'listening')[] }),
    ...(levels === undefined ? {} : { levels: levels.map((level) => level.toUpperCase() as CefrBand) }),
    ...(types === undefined ? {} : { types: types as QuestionTypeId[] }),
    ...(minQuestions < 0 ? {} : { minQuestions }),
    ...(maxQuestions < 0 ? {} : { maxQuestions }),
    ...(minReadingEase === undefined ? {} : { minReadingEase }),
    ...(maxReadingEase === undefined ? {} : { maxReadingEase }),
    ...(withAudio ? { withAudio } : {}),
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
      query: query.length > 0 ? query : null,
      sort: sort ?? 'id',
      order: order ?? 'asc',
      facets: practiceFacets(),
      note: practiceMeta().note,
    },
  };
}

/** One indexed item. */
function item(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findPracticeItem(id);
  if (found === undefined) {
    throw notFound(`No indexed practice item with id "${id}".`, { id });
  }
  return {
    data: found,
    meta: {
      repository: practiceMeta().repository,
      license: practiceMeta().license,
      note: practiceMeta().note,
    },
  };
}

/** Practice-test index routes. */
export const testRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/tests',
    versioned: true,
    summary: 'Provenance and aggregate statistics for the indexed practice-test collections.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/tests/stats',
    versioned: true,
    summary: 'Structure, question-type and readability statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/tests/items',
    versioned: true,
    summary: 'Search indexed practice tests by collection, skill, CEFR band, question type or readability.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/tests/:id',
    versioned: true,
    summary: 'One indexed practice test or graded reading lesson.',
    handler: item,
  },
];
