/**
 * Assignment-archive routes (`/v1/assignments`).
 */

import { assignmentFacets, assignmentMeta, assignmentStats, searchAssignments } from '../data/assignments.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['date', 'genre', 'learner', 'words', 'readingEase'] as const;
const ORDERS = ['asc', 'desc'] as const;
const TASKS = ['task1', 'task2'] as const;
const KINDS = ['submission', 'instructor'] as const;

/** Archive metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: assignmentMeta(), stats: assignmentStats() },
    meta: {
      facets: {
        genre: assignmentFacets('genre'),
        learner: assignmentFacets('learner'),
        task: assignmentFacets('task'),
        kind: assignmentFacets('kind'),
      },
    },
  };
}

/** Archive statistics only. */
function stats(): HandlerResult {
  return { data: assignmentStats() };
}

/** Search the assignment index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const tasks = parseList(getString(params, 'task'), 'task', TASKS) as ('task1' | 'task2')[] | undefined;
  const genres = parseList(getString(params, 'genre'), 'genre', assignmentFacets('genre'));
  const learners = parseList(getString(params, 'learner'), 'learner', assignmentFacets('learner'));
  const kinds = parseList(getString(params, 'kind'), 'kind', KINDS);
  const from = getString(params, 'from');
  const to = getString(params, 'to');
  const page = searchAssignments({
    limit,
    offset,
    query,
    ...(tasks === undefined ? {} : { tasks }),
    ...(genres === undefined ? {} : { genres }),
    ...(learners === undefined ? {} : { learners }),
    ...(kinds === undefined ? {} : { kinds }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
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
      sort: sort ?? 'date',
      order: order ?? 'asc',
      facets: {
        genre: assignmentFacets('genre'),
        learner: assignmentFacets('learner'),
        task: assignmentFacets('task'),
        kind: assignmentFacets('kind'),
      },
      note: assignmentMeta().note,
    },
  };
}

/** Assignment-archive routes. */
export const assignmentRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/assignments',
    versioned: true,
    summary: 'Metadata and statistics for the indexed IELTS cohort assignment archive.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/assignments/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/assignments/items',
    versioned: true,
    summary:
      'Search the assignment archive by task, genre, learner, kind, date range or free text, with surface statistics per document.',
    handler: items,
  },
];
