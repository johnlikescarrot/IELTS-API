/**
 * Open practice corpus routes (`/v1/practice`).
 */

import {
  findPracticeItem,
  practiceFacets,
  practiceItemTypes,
  practiceMeta,
  practiceSeries,
  practiceStats,
  searchPractice,
} from '../data/practice.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PracticeItem, Skill } from '../types.js';

const SKILLS: readonly Skill[] = ['listening', 'reading'];
const KINDS: readonly PracticeItem['kind'][] = ['lesson', 'full-test'];
const SORT_KEYS = ['id', 'series', 'level', 'number', 'questions', 'words'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Index, series facts, statistics and facets for the practice corpus. */
function index(): HandlerResult {
  const facets = {
    series: practiceFacets('series'),
    level: practiceFacets('level'),
    type: practiceFacets('type'),
  };
  return {
    data: { meta: practiceMeta(), series: practiceSeries(), stats: practiceStats() },
    meta: { facets, note: 'Derived metadata only: no upstream text or audio is redistributed.' },
  };
}

/** Practice-corpus statistics only. */
function stats(): HandlerResult {
  return { data: practiceStats() };
}

/** The curated item-type taxonomy with occurrence data. */
function types(): HandlerResult {
  return {
    data: practiceItemTypes(),
    meta: { count: practiceItemTypes().length, note: practiceMeta().note },
  };
}

/** Search the practice index. */
function lessons(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 2000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skill = getEnum(params, 'skill', SKILLS);
  const kind = getEnum(params, 'kind', KINDS);
  const series = parseList(getString(params, 'series'), 'series', practiceFacets('series'));
  const types = parseList(getString(params, 'type'), 'type', practiceFacets('type'));
  // Level labels are mixed case (`A1-A2`, `Basic`); `parseList` lower-cases its
  // tokens, so validate case-insensitively and map the values back.
  const levelValues = practiceFacets('level');
  const lowerLevels = parseList(
    getString(params, 'level'),
    'level',
    levelValues.map((value) => value.toLowerCase()),
  );
  const levels = lowerLevels?.map(
    (token) => levelValues.find((value) => value.toLowerCase() === token) as string,
  );
  const page = searchPractice({
    limit,
    offset,
    query,
    ...(series === undefined ? {} : { series }),
    ...(levels === undefined ? {} : { levels }),
    ...(types === undefined ? {} : { types }),
    ...(skill === undefined ? {} : { skill }),
    ...(kind === undefined ? {} : { kind }),
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
      series: series ?? null,
      level: levels ?? null,
      type: types ?? null,
      skill: skill ?? null,
      kind: kind ?? null,
      sort: sort ?? 'id',
      order: order ?? 'asc',
      facets: {
        series: practiceFacets('series'),
        level: practiceFacets('level'),
        type: practiceFacets('type'),
      },
      note: practiceMeta().note,
    },
  };
}

/** Look up one indexed practice item. */
function lesson(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item: PracticeItem | undefined = findPracticeItem(id);
  if (item === undefined) {
    throw notFound(`No practice item "${id}".`, {
      id,
      hint: 'See /v1/practice/lessons for the full index.',
    });
  }
  return { data: item, meta: { id: item.id, series: item.series } };
}

/** Practice-corpus routes. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Index, series and statistics of the open IELTS practice corpus.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/practice/stats',
    versioned: true,
    summary: 'Aggregate statistics for the practice-corpus index.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/practice/types',
    versioned: true,
    summary: 'Curated item-type taxonomy with occurrences across the practice corpus.',
    handler: types,
  },
  {
    method: 'GET',
    path: '/v1/practice/lessons',
    versioned: true,
    summary: 'Search the practice index by series, level, item type, skill or kind.',
    handler: lessons,
  },
  {
    method: 'GET',
    path: '/v1/practice/lessons/:id',
    versioned: true,
    summary: 'Look up one indexed practice item by stable identifier.',
    handler: lesson,
  },
];
