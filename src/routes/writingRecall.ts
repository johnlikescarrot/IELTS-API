/**
 * Recalled writing-task routes (`/v1/writing/recall`) and rhetorical move
 * structures (`/v1/writing/move-structures`).
 */

import {
  RECALL_FAMILIES,
  RECALL_THEMES,
  RECALL_TYPES,
  findRecalledPrompt,
  recallMeta,
  recallStats,
  recalledPromptsPage,
} from '../data/writingRecall.js';
import {
  MOVE_STRUCTURE_IDS,
  findMoveStructure,
  findMoveStructuresByAppliesTo,
} from '../data/moveStructures.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { RecallFamily, RecallType } from '../types.js';

/** List the recalled prompts with the index statistics. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const type = getEnum(params, 'type', RECALL_TYPES) as RecallType | undefined;
  const family = getEnum(params, 'family', RECALL_FAMILIES) as RecallFamily | undefined;
  const theme = getEnum(params, 'theme', RECALL_THEMES);
  const query = getString(params, 'q') ?? '';
  const sort = getEnum(params, 'sort', ['id', 'difficulty', 'occurrences'] as const) ?? 'id';
  const order = getEnum(params, 'order', ['asc', 'desc'] as const) ?? 'asc';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100_000, 0);
  const page = recalledPromptsPage({ type, family, theme, query, sort, order, limit, offset });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      type: type ?? null,
      family: family ?? null,
      theme: theme ?? null,
      types: RECALL_TYPES,
      families: RECALL_FAMILIES,
      themes: RECALL_THEMES,
      stats: recallStats(),
      source: recallMeta(),
    },
  };
}

/** One recalled prompt. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const prompt = findRecalledPrompt(id);
  if (prompt === undefined) {
    throw notFound(`No recalled prompt with id "${id}".`, { id });
  }
  return { data: prompt, meta: { id, source: recallMeta().attribution } };
}

/** The rhetorical move structures. */
function moveStructures(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const applies = getString(params, 'applies-to');
  const structures = findMoveStructuresByAppliesTo(applies ?? '');
  return {
    data: structures,
    meta: {
      total: structures.length,
      ids: MOVE_STRUCTURE_IDS,
      appliesTo: applies ?? null,
      note: 'Original wording written for this project; standard pedagogical word lists.',
    },
  };
}

/** One rhetorical move structure. */
function moveStructureDetail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const structure = findMoveStructure(id);
  if (structure === undefined) {
    throw notFound(`No move structure with id "${id}".`, { id, allowed: MOVE_STRUCTURE_IDS.join(',') });
  }
  return { data: structure, meta: { ids: MOVE_STRUCTURE_IDS } };
}

/** Writing recall and move-structure routes. */
export const writingRecallRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/writing/recall',
    versioned: true,
    summary:
      'Crowd-recalled computer-based Writing Task 2 prompts (Dec 2024 - Jan 2025) with preparer annotations.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/writing/recall/:id',
    versioned: true,
    summary: 'One recalled prompt with its normalised type, theme and difficulty.',
    handler: detail,
  },
  {
    method: 'GET',
    path: '/v1/writing/move-structures',
    versioned: true,
    summary: 'Rhetorical move structures for Task 1 (static/dynamic) and Task 2 (concession-rebuttal).',
    handler: moveStructures,
  },
  {
    method: 'GET',
    path: '/v1/writing/move-structures/:id',
    versioned: true,
    summary: 'One move structure with its ordered moves and companion lexicon.',
    handler: moveStructureDetail,
  },
];
