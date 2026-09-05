/**
 * Self-study notes routes (`/v1/notes`).
 *
 * The index publishes derived metadata only: skill, category, format, size
 * and provenance of every file in the indexed self-study collection, plus
 * aggregate counts of the speaking question bank shipped inside it. No
 * upstream document, recording or question text is served by this API.
 */

import {
  STUDY_SKILLS,
  studyNoteFacets,
  studyNotesMeta,
  studyNotesStats,
  searchStudyNotes,
} from '../data/studyNotes.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['title', 'category', 'skill', 'size', 'path'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Collection metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: studyNotesMeta(), stats: studyNotesStats() },
    meta: {
      facets: {
        skill: studyNoteFacets('skill'),
        category: studyNoteFacets('category'),
        format: studyNoteFacets('format'),
      },
    },
  };
}

/** Collection statistics only. */
function stats(): HandlerResult {
  return { data: studyNotesStats(), meta: { note: studyNotesMeta().note } };
}

/** Search the collection index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skills = parseList(getString(params, 'skill'), 'skill', STUDY_SKILLS);
  const categories = parseList(getString(params, 'category'), 'category', studyNoteFacets('category'));
  const formats = parseList(getString(params, 'format'), 'format', studyNoteFacets('format'));
  const page = searchStudyNotes({
    limit,
    offset,
    query,
    ...(skills === undefined ? {} : { skills }),
    ...(categories === undefined ? {} : { categories }),
    ...(formats === undefined ? {} : { formats }),
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
      sort: sort ?? 'title',
      order: order ?? 'asc',
      facets: {
        skill: studyNoteFacets('skill'),
        category: studyNoteFacets('category'),
        format: studyNoteFacets('format'),
      },
      note: studyNotesMeta().note,
    },
  };
}

/** Study-notes routes. */
export const studyNoteRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/notes',
    versioned: true,
    summary: 'Metadata and statistics for the indexed self-study notes collection.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/notes/stats',
    versioned: true,
    summary: 'Aggregate statistics only, including the speaking-bank counts.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/notes/items',
    versioned: true,
    summary: 'Search the collection index by skill, category, format or free text.',
    handler: items,
  },
];
