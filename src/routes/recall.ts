/**
 * Exam-season recall routes (`/v1/recall`).
 *
 * The index publishes derived structure and metadata only: titles, counts,
 * categories and provenance. No cue-card wording, question text, passage,
 * transcript, audio or answer value from the upstream collection is served.
 */

import {
  RECALL_CATEGORIES,
  RECALL_KINDS,
  RECALL_PARTS,
  RECALL_SKILLS,
  RECALL_STATUSES,
  RECALL_TIERS,
  findRecallItem,
  recallCollections,
  recallFacets,
  recallMeta,
  recallStats,
  searchRecallItems,
} from '../data/recall.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { RecallKind, RecallSkill, RecallStatus, RecallTier } from '../types.js';

const SORT_KEYS = ['id', 'title', 'questions', 'part'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** All recall facets, for discovery responses. */
function facets(): Record<string, string[]> {
  return {
    kind: recallFacets('kind'),
    skill: recallFacets('skill'),
    collection: recallCollections(),
    tier: recallFacets('tier'),
    category: recallFacets('category'),
    status: recallFacets('status'),
    season: recallFacets('season'),
    part: RECALL_PARTS.map((part) => String(part)),
  };
}

/** Index metadata, aggregate statistics and the available facets. */
function index(): HandlerResult {
  return {
    data: { meta: recallMeta(), stats: recallStats() },
    meta: { facets: facets() },
  };
}

/** Statistics only. */
function stats(): HandlerResult {
  return { data: recallStats(), meta: { note: recallMeta().note } };
}

/** Search the index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const kinds = parseList(getString(params, 'kind'), 'kind', [...RECALL_KINDS]);
  const skills = parseList(getString(params, 'skill'), 'skill', [...RECALL_SKILLS]);
  const collections = parseList(getString(params, 'collection'), 'collection', recallCollections());
  const tiers = parseList(getString(params, 'tier'), 'tier', [...RECALL_TIERS]);
  const categories = parseList(getString(params, 'category'), 'category', [...RECALL_CATEGORIES]);
  const statuses = parseList(getString(params, 'status'), 'status', [...RECALL_STATUSES]);
  const seasons = parseList(getString(params, 'season'), 'season', recallFacets('season'));
  const partTokens = parseList(
    getString(params, 'part'),
    'part',
    RECALL_PARTS.map((part) => String(part)),
  );

  const page = searchRecallItems({
    limit,
    offset,
    query,
    ...(kinds === undefined ? {} : { kinds: kinds as RecallKind[] }),
    ...(skills === undefined ? {} : { skills: skills as RecallSkill[] }),
    ...(collections === undefined ? {} : { collections }),
    ...(tiers === undefined ? {} : { tiers: tiers as RecallTier[] }),
    ...(categories === undefined ? {} : { categories }),
    ...(statuses === undefined ? {} : { statuses: statuses as RecallStatus[] }),
    ...(seasons === undefined ? {} : { seasons }),
    ...(partTokens === undefined ? {} : { parts: partTokens.map((token) => Number(token)) }),
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
      facets: facets(),
      note: recallMeta().note,
    },
  };
}

/** One indexed recall item. */
function item(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findRecallItem(id);
  if (found === undefined) {
    throw notFound(`No indexed recall item with id "${id}".`, { id });
  }
  return {
    data: found,
    meta: {
      repository: recallMeta().repository,
      license: recallMeta().license,
      note: recallMeta().note,
    },
  };
}

/** Exam-season recall routes. */
export const recallRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/recall',
    versioned: true,
    summary: 'Provenance and aggregate statistics for the exam-season recall index.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/recall/stats',
    versioned: true,
    summary: 'Exam-recall statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/recall/items',
    versioned: true,
    summary: 'Search the recall index by skill, kind, season, tier, category or free text.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/recall/:id',
    versioned: true,
    summary: 'One indexed exam-recall item.',
    handler: item,
  },
];
