/**
 * Grey-literature archive routes (`/v1/archive`).
 *
 * The archive is an unlicensed personal collection of third-party material,
 * so these routes publish derived, non-substitutive metadata and statistics
 * only: no audio, PDF content, essay text or image is served.
 */

import {
  archiveFacets,
  archiveMeta,
  archiveStats,
  archiveVolumes,
  findArchiveItem,
  findArchiveVolume,
  searchArchive,
} from '../data/archive.js';
import { parseList } from '../lib/search.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['title', 'collection', 'volume', 'date', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Archive metadata, aggregate statistics and the Cambridge volume table. */
function index(): HandlerResult {
  return {
    data: { meta: archiveMeta(), stats: archiveStats(), volumes: archiveVolumes() },
    meta: { facets: archiveFacetsView() },
  };
}

/** Aggregate statistics only. */
function stats(): HandlerResult {
  return { data: archiveStats(), meta: { note: archiveMeta().note } };
}

/** The Cambridge IELTS volume table: naming schemes, media eras, completeness. */
function volumes(): HandlerResult {
  return {
    data: archiveVolumes(),
    meta: {
      count: archiveVolumes().length,
      note: 'Naming scheme, media era and recoverable test structure are derived from the file names; see RESEARCH.md Part V.',
    },
  };
}

/** One Cambridge volume row. */
function volume(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const number = Number.parseInt(id, 10);
  const found = Number.isInteger(number) ? findArchiveVolume(number) : undefined;
  if (found === undefined) {
    throw notFound(`No Cambridge IELTS volume "${id}" in the archive index.`, { id });
  }
  return { data: found, meta: { note: archiveMeta().note } };
}

/** Search the archive index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const collections = parseList(getString(params, 'collection'), 'collection', archiveFacets('collection'));
  const formats = parseList(getString(params, 'format'), 'format', archiveFacets('format'));
  const media = parseList(getString(params, 'media'), 'media', archiveFacets('media'));
  const skills = parseList(getString(params, 'skill'), 'skill', archiveFacets('skill'));
  const volume = getInt(params, 'volume', 1, 18, -1);

  const page = searchArchive({
    limit,
    offset,
    query,
    ...(collections === undefined ? {} : { collections }),
    ...(formats === undefined ? {} : { formats }),
    ...(media === undefined ? {} : { media }),
    ...(skills === undefined ? {} : { skills }),
    ...(volume < 0 ? {} : { volume }),
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
      facets: archiveFacetsView(),
      note: archiveMeta().note,
    },
  };
}

/** One indexed archive item. */
function item(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findArchiveItem(id);
  if (found === undefined) {
    throw notFound(`No archive item with id "${id}".`, { id });
  }
  return {
    data: found,
    meta: {
      repository: archiveMeta().repository,
      license: archiveMeta().license,
      note: archiveMeta().note,
    },
  };
}

/** Facet values for response metadata. */
function archiveFacetsView(): Record<string, string[]> {
  return {
    collection: archiveFacets('collection'),
    format: archiveFacets('format'),
    media: archiveFacets('media'),
    skill: archiveFacets('skill'),
  };
}

/** Archive routes. */
export const archiveRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/archive',
    versioned: true,
    summary: 'Provenance, statistics and the Cambridge volume table for the indexed grey-literature archive.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/archive/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/archive/volumes',
    versioned: true,
    summary:
      'One row per Cambridge IELTS volume: naming scheme, media era, tracks, recoverable tests, completeness.',
    handler: volumes,
  },
  {
    method: 'GET',
    path: '/v1/archive/volumes/:id',
    versioned: true,
    summary: 'One Cambridge IELTS volume row.',
    handler: volume,
  },
  {
    method: 'GET',
    path: '/v1/archive/items',
    versioned: true,
    summary: 'Search the archive index by collection, format, media, skill, Cambridge volume or free text.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/archive/:id',
    versioned: true,
    summary: 'One indexed archive item.',
    handler: item,
  },
];
