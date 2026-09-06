/**
 * Cambridge test-blueprint routes (`/v1/blueprints`).
 *
 * These routes publish the annotation layer only: which task family occupies
 * which question range of which Cambridge paper, what the passage or recording
 * is about, and how hard one annotator judged it. No examinable content is
 * served.
 */

import {
  blueprintFacets,
  blueprintMeta,
  blueprintScenes,
  blueprintStats,
  blueprintTests,
  blueprintTypes,
  blueprintVolumes,
  findBlueprintGroup,
  findBlueprintTest,
  groupsOfTest,
  searchBlueprintGroups,
} from '../data/blueprints.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { JsonValue } from '../types.js';

const SORT_KEYS = ['id', 'volume', 'questions', 'difficulty', 'questionType'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Every facet, for discovery. */
function facetView(): Record<string, JsonValue> {
  return {
    skill: blueprintFacets('skill'),
    questionType: blueprintFacets('questionType'),
    scene: blueprintFacets('scene'),
    difficulty: blueprintFacets('difficulty'),
  };
}

/** Blueprint metadata and aggregate statistics. */
function index(): HandlerResult {
  return {
    data: { meta: blueprintMeta(), stats: blueprintStats() },
    meta: { facets: facetView() },
  };
}

/** Aggregate statistics only. */
function stats(): HandlerResult {
  return { data: blueprintStats(), meta: { note: blueprintMeta().note } };
}

/** The canonical question-type table, as observed in the blueprints. */
function types(): HandlerResult {
  return {
    data: blueprintTypes() as unknown as JsonValue,
    meta: {
      total: blueprintTypes().length,
      note: 'Counts are of annotated question groups, not of individual questions, unless the field says otherwise.',
    },
  };
}

/** The subject-scene table. */
function scenes(): HandlerResult {
  const rows = blueprintScenes();
  return {
    data: rows as unknown as JsonValue,
    meta: {
      total: rows.length,
      note: 'Reading and Listening carry separate scene vocabularies upstream, so every slug is prefixed with its skill.',
    },
  };
}

/** The volume table. */
function volumes(): HandlerResult {
  const rows = blueprintVolumes();
  return {
    data: rows as unknown as JsonValue,
    meta: {
      total: rows.length,
      note: 'One row per Cambridge volume, for comparing task-family and scene mix across editions 5-21.',
    },
  };
}

/** Every annotated paper. */
function tests(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skills = parseList(getString(params, 'skill'), 'skill', blueprintFacets('skill'));
  const rows = blueprintTests().filter(
    (test) => skills === undefined || skills.length === 0 || skills.includes(test.skill),
  );
  return {
    data: rows as unknown as JsonValue,
    meta: {
      total: rows.length,
      complete: rows.filter((test) => test.complete).length,
      note: 'A paper is complete when its annotated groups tile questions 1-40 exactly once; gaps are published, not hidden.',
    },
  };
}

/** One annotated paper, with its groups in question order. */
function test(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findBlueprintTest(id);
  if (found === undefined) {
    throw notFound(`No annotated paper with id "${id}".`, { id });
  }
  return {
    data: { ...found, groups: groupsOfTest(found.id) } as unknown as JsonValue,
    meta: { note: blueprintMeta().note },
  };
}

/** Search the annotated question groups. */
function groups(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 2000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skills = parseList(getString(params, 'skill'), 'skill', blueprintFacets('skill'));
  const questionTypes = parseList(
    getString(params, 'questionType'),
    'questionType',
    blueprintFacets('questionType'),
  );
  const sceneFilter = parseList(getString(params, 'scene'), 'scene', blueprintFacets('scene'));
  const difficulties = parseList(
    getString(params, 'difficulty'),
    'difficulty',
    blueprintFacets('difficulty'),
  );
  const rawVolumes = parseList(
    getString(params, 'volume'),
    'volume',
    blueprintStats().volumes.map((volume) => String(volume)),
  );
  const part = getInt(params, 'part', 1, 4, 0);

  const page = searchBlueprintGroups({
    limit,
    offset,
    query,
    ...(skills === undefined ? {} : { skills }),
    ...(questionTypes === undefined ? {} : { questionTypes }),
    ...(sceneFilter === undefined ? {} : { scenes: sceneFilter }),
    ...(difficulties === undefined ? {} : { difficulties }),
    ...(rawVolumes === undefined ? {} : { volumes: rawVolumes.map(Number) }),
    ...(part === 0 ? {} : { part }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });

  return {
    data: page.items as unknown as JsonValue,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      sort: sort ?? 'volume',
      order: order ?? 'asc',
      facets: facetView(),
    },
  };
}

/** One annotated question group. */
function group(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findBlueprintGroup(id);
  if (found === undefined) {
    throw notFound(`No annotated question group with id "${id}".`, { id });
  }
  return { data: found as unknown as JsonValue, meta: { note: blueprintMeta().note } };
}

/** Blueprint routes. */
export const blueprintRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/blueprints',
    versioned: true,
    summary: 'Provenance and aggregate statistics for the Cambridge 5-21 blueprint annotation.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/stats',
    versioned: true,
    summary: 'Aggregate blueprint statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/types',
    versioned: true,
    summary: 'How often each canonical question type occurs, and where.',
    handler: types,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/scenes',
    versioned: true,
    summary: 'Subject scenes and the task families they attract.',
    handler: scenes,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/volumes',
    versioned: true,
    summary: 'Task-family and scene mix per Cambridge volume.',
    handler: volumes,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/tests',
    versioned: true,
    summary: 'Every annotated Cambridge paper with its annotation completeness.',
    handler: tests,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/tests/:id',
    versioned: true,
    summary: 'One annotated paper, with its question groups in question order.',
    handler: test,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/groups',
    versioned: true,
    summary: 'Search question groups by skill, type, scene, difficulty, volume or part.',
    handler: groups,
  },
  {
    method: 'GET',
    path: '/v1/blueprints/groups/:id',
    versioned: true,
    summary: 'One annotated question group.',
    handler: group,
  },
];
