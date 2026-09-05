/**
 * Operating-platform routes (`/v1/platform`).
 *
 * The platform at <https://github.com/wanli4473/yysd-testcenter> is the first
 * fully operating IELTS preparation product this API indexes: a live mock-exam
 * and vocabulary platform, not a static dump. These endpoints publish its
 * derived, non-substitutive metadata — manifest by zone/subject, vocabulary
 * theme catalogue, speaking recall-bank statistics and A-Level catalogue — so
 * the structure of an operating product can be studied without redistributing
 * any HTML exam page or audio file.
 */

import {
  alevelBoards,
  alevelStats,
  ebbinghausSchedules,
  findManifestItem,
  findVocabTheme,
  manifestFacets,
  manifestStats,
  platformMeta,
  platformStats,
  searchManifest,
  searchVocabThemes,
  speakingBank,
  vocabCategories,
  vocabThemeFacets,
  vocabThemesStats,
} from '../data/platform.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';

const MANIFEST_SORT = ['id', 'title', 'duration', 'added'] as const;
const VOCAB_SORT = ['id', 'title', 'count'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Platform overview: provenance, aggregate statistics and facets. */
function index(): HandlerResult {
  return {
    data: { meta: platformMeta(), stats: platformStats() },
    meta: {
      facets: {
        zone: manifestFacets('zone'),
        subject: manifestFacets('subject'),
        vocabCategory: vocabThemeFacets('category'),
      },
    },
  };
}

/** Platform statistics only. */
function stats(): HandlerResult {
  return { data: platformStats() };
}

/** Manifest statistics and facets. */
function manifest(): HandlerResult {
  return {
    data: { stats: manifestStats(), items: manifestStats().totalItems },
    meta: {
      facets: {
        zone: manifestFacets('zone'),
        subject: manifestFacets('subject'),
      },
    },
  };
}

/** Search the manifest. */
function manifestItems(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', MANIFEST_SORT);
  const order = getEnum(params, 'order', ORDERS);
  const zones = parseList(getString(params, 'zone'), 'zone', manifestFacets('zone'));
  const subjects = parseList(getString(params, 'subject'), 'subject', manifestFacets('subject'));
  const page = searchManifest({
    limit,
    offset,
    query,
    ...(zones === undefined ? {} : { zones }),
    ...(subjects === undefined ? {} : { subjects }),
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
        zone: manifestFacets('zone'),
        subject: manifestFacets('subject'),
      },
      note: platformMeta().note,
    },
  };
}

/** One manifest item. */
function manifestItem(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findManifestItem(id);
  if (item === undefined) {
    throw notFound(`No manifest item matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: item };
}

/** Vocabulary-theme catalogue overview. */
function vocabThemesIndex(): HandlerResult {
  return {
    data: {
      categories: vocabCategories(),
      stats: vocabThemesStats(),
    },
    meta: {
      facets: { category: vocabThemeFacets('category') },
    },
  };
}

/** Search the vocabulary themes. */
function vocabThemesItems(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', VOCAB_SORT);
  const order = getEnum(params, 'order', ORDERS);
  const categories = parseList(getString(params, 'category'), 'category', vocabThemeFacets('category'));
  const page = searchVocabThemes({
    limit,
    offset,
    query,
    ...(categories === undefined ? {} : { categories }),
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
      facets: { category: vocabThemeFacets('category') },
    },
  };
}

/** One vocabulary theme. */
function vocabTheme(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const item = findVocabTheme(id);
  if (item === undefined) {
    throw notFound(`No vocabulary theme matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: item };
}

/** Speaking recall bank overview. */
function speaking(): HandlerResult {
  const bank = speakingBank();
  return {
    data: bank,
    meta: { note: platformMeta().note },
  };
}

/** A-Level catalogue overview. */
function alevel(): HandlerResult {
  return {
    data: { boards: alevelBoards(), stats: alevelStats() },
  };
}

/** One A-Level board. */
function alevelBoard(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const board = alevelBoards().find((b) => b.id.toLowerCase() === id.toLowerCase());
  if (board === undefined) {
    throw notFound(`No A-Level board matches "${id}".`, { id, documentation: '/docs' });
  }
  return { data: board };
}

/** Ebbinghaus schedules. */
function schedules(): HandlerResult {
  return { data: ebbinghausSchedules() };
}

/** Platform routes. */
export const platformRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/platform',
    versioned: true,
    summary: 'Provenance, aggregate statistics and facets for the operating IELTS platform index.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/platform/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/platform/manifest',
    versioned: true,
    summary: 'Manifest statistics and facets.',
    handler: manifest,
  },
  {
    method: 'GET',
    path: '/v1/platform/manifest/items',
    versioned: true,
    summary: 'Search the manifest by zone, subject or free text.',
    handler: manifestItems,
  },
  {
    method: 'GET',
    path: '/v1/platform/manifest/:id',
    versioned: true,
    summary: 'One manifest item by identifier.',
    handler: manifestItem,
  },
  {
    method: 'GET',
    path: '/v1/platform/vocab-themes',
    versioned: true,
    summary: 'Vocabulary-theme catalogue categories and statistics.',
    handler: vocabThemesIndex,
  },
  {
    method: 'GET',
    path: '/v1/platform/vocab-themes/items',
    versioned: true,
    summary: 'Search the vocabulary themes by category or free text.',
    handler: vocabThemesItems,
  },
  {
    method: 'GET',
    path: '/v1/platform/vocab-themes/:id',
    versioned: true,
    summary: 'One vocabulary theme by identifier.',
    handler: vocabTheme,
  },
  {
    method: 'GET',
    path: '/v1/platform/speaking',
    versioned: true,
    summary: 'Quarterly speaking recall bank overview and aggregated topic statistics.',
    handler: speaking,
  },
  {
    method: 'GET',
    path: '/v1/platform/alevel',
    versioned: true,
    summary: 'A-Level past-paper catalogue by board.',
    handler: alevel,
  },
  {
    method: 'GET',
    path: '/v1/platform/alevel/:id',
    versioned: true,
    summary: 'One A-Level board by identifier.',
    handler: alevelBoard,
  },
  {
    method: 'GET',
    path: '/v1/platform/schedules',
    versioned: true,
    summary: 'Ebbinghaus spaced-repetition schedules.',
    handler: schedules,
  },
];
