/**
 * Listening taxonomy routes (`/v1/listening`).
 *
 * The 530-group listening annotation from
 * <https://github.com/wanli4473/yysd-testcenter> (library/listening-taxonomy.json)
 * is here as a bilingual, queryable taxonomy: 7 question types, 16 scenes,
 * 3 difficulty tiers, each group pinned to a Cambridge volume / test / part /
 * question range. The taxonomy complements `/v1/question-types` (the 13-family
 * reading-heavy taxonomy from the practice-test corpus) with a listening-first
 * lens that is directly actionable for per-section drill selection and study
 * planning.
 */

import {
  findListeningGroup,
  findListeningScene,
  findListeningType,
  listeningDiffs,
  listeningScenes,
  listeningStats,
  listeningTypes,
  searchListeningGroups,
} from '../data/platform.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';

const GROUP_SORT = ['id', 'volume', 'part', 'questions'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Listening overview: statistics and facets. */
function index(): HandlerResult {
  return {
    data: { stats: listeningStats() },
    meta: {
      facets: {
        volume: [...new Set(listeningStats().volumes)].sort(),
        part: ['1', '2', '3', '4'],
        qType: listeningTypes().map((t) => t.id),
        scene: listeningScenes().map((s) => s.id),
        diff: listeningDiffs().map((d) => d.id),
      },
    },
  };
}

/** Listening statistics only. */
function stats(): HandlerResult {
  return { data: listeningStats() };
}

/** All listening question types. */
function types(): HandlerResult {
  return { data: listeningTypes() };
}

/** One listening type by English identifier. */
function typeItem(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findListeningType(id);
  if (item === undefined) {
    throw notFound(`No listening type matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: item };
}

/** All listening scenes. */
function scenes(): HandlerResult {
  return { data: listeningScenes() };
}

/** One listening scene. */
function sceneItem(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findListeningScene(id);
  if (item === undefined) {
    throw notFound(`No listening scene matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: item };
}

/** All difficulty tiers. */
function diffs(): HandlerResult {
  return { data: listeningDiffs() };
}

/** Search listening groups. */
function groups(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 2000, 0);
  const sort = getEnum(params, 'sort', GROUP_SORT);
  const order = getEnum(params, 'order', ORDERS);
  const volumes = parseList(getString(params, 'volume'), 'volume', listeningStats().volumes);
  const qTypes = parseList(
    getString(params, 'qType'),
    'qType',
    listeningTypes().map((t) => t.id),
  );
  const scenesParam = parseList(
    getString(params, 'scene'),
    'scene',
    listeningScenes().map((s) => s.id),
  );
  const diffsParam = parseList(
    getString(params, 'diff'),
    'diff',
    listeningDiffs().map((d) => d.id),
  );
  const partRaw = getString(params, 'part');
  let parts: number[] | undefined;
  if (partRaw !== undefined) {
    const parsed = parseList(partRaw, 'part', ['1', '2', '3', '4']);
    if (parsed !== undefined) {
      parts = parsed.map((v) => Number.parseInt(v, 10));
    }
  }
  const page = searchListeningGroups({
    limit,
    offset,
    query,
    ...(volumes === undefined ? {} : { volumes }),
    ...(parts === undefined ? {} : { parts }),
    ...(qTypes === undefined ? {} : { qTypes }),
    ...(scenesParam === undefined ? {} : { scenes: scenesParam }),
    ...(diffsParam === undefined ? {} : { diffs: diffsParam }),
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
      facets: {
        volume: listeningStats().volumes,
        part: ['1', '2', '3', '4'],
        qType: listeningTypes().map((t) => t.id),
        scene: listeningScenes().map((s) => s.id),
        diff: listeningDiffs().map((d) => d.id),
      },
    },
  };
}

/** One listening group. */
function groupItem(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findListeningGroup(id);
  if (item === undefined) {
    throw notFound(`No listening group matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: item };
}

/** Listening routes. */
export const listeningRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/listening',
    versioned: true,
    summary: 'Listening taxonomy overview: statistics and facets.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/listening/stats',
    versioned: true,
    summary: 'Listening taxonomy statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/listening/types',
    versioned: true,
    summary: 'Seven listening question types (bilingual) with observed frequencies.',
    handler: types,
  },
  {
    method: 'GET',
    path: '/v1/listening/types/:id',
    versioned: true,
    summary: 'One listening question type by English identifier.',
    handler: typeItem,
  },
  {
    method: 'GET',
    path: '/v1/listening/scenes',
    versioned: true,
    summary: 'Sixteen listening scenes / topical contexts with observed frequencies.',
    handler: scenes,
  },
  {
    method: 'GET',
    path: '/v1/listening/scenes/:id',
    versioned: true,
    summary: 'One listening scene by English identifier.',
    handler: sceneItem,
  },
  {
    method: 'GET',
    path: '/v1/listening/diffs',
    versioned: true,
    summary: 'Difficulty tiers for listening sections.',
    handler: diffs,
  },
  {
    method: 'GET',
    path: '/v1/listening/groups',
    versioned: true,
    summary: 'Search the 530 listening section groups by volume, part, type, scene or difficulty.',
    handler: groups,
  },
  {
    method: 'GET',
    path: '/v1/listening/groups/:id',
    versioned: true,
    summary: 'One listening section group by identifier.',
    handler: groupItem,
  },
];
