/**
 * High-frequency theme bank routes (`/v1/themes`).
 */

import {
  THEME_CATEGORIES,
  THEME_META,
  THEME_SKILLS,
  findTheme,
  randomThemes,
  searchThemes,
  themeStats,
} from '../data/themes.js';
import { ESSAY_QUESTION_TYPES } from '../data/topics.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { IeltsTheme } from '../types.js';

/** Search the theme bank. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const category = getEnum(params, 'category', THEME_CATEGORIES);
  const skill = getEnum(params, 'skill', THEME_SKILLS);
  const questionType = getEnum(params, 'type', ESSAY_QUESTION_TYPES);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const page = searchThemes({
    limit,
    offset,
    query,
    ...(category === undefined ? {} : { category }),
    ...(skill === undefined ? {} : { skill }),
    ...(questionType === undefined ? {} : { questionType }),
  });

  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      category: category ?? null,
      skill: skill ?? null,
      type: questionType ?? null,
      categories: THEME_CATEGORIES,
      skills: THEME_SKILLS,
      questionTypes: ESSAY_QUESTION_TYPES,
      note: THEME_META.note,
    },
  };
}

/** Aggregate statistics. */
function stats(): HandlerResult {
  return { data: themeStats(), meta: { meta: THEME_META } };
}

/** Deterministic random sample. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 3);
  const seed = getString(params, 'seed') ?? String(Date.now());
  return { data: randomThemes(seed, count), meta: { count, seed } };
}

/** Look up one theme by identifier. */
function lookup(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const theme: IeltsTheme | undefined = findTheme(id);
  if (theme === undefined) {
    throw notFound(`No theme with id "${id}".`, { id });
  }
  return { data: theme, meta: { id: theme.id, rank: theme.rank } };
}

/** Theme bank routes. */
export const themeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/themes',
    versioned: true,
    summary: 'Search the high-frequency IELTS theme bank by category, skill or question type.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/themes/stats',
    versioned: true,
    summary: 'Aggregate statistics for the theme bank.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/themes/random',
    versioned: true,
    summary: 'A seeded random sample of themes.',
    handler: random,
  },
  {
    method: 'GET',
    path: '/v1/themes/:id',
    versioned: true,
    summary: 'Look up a single theme by identifier.',
    handler: lookup,
  },
];
