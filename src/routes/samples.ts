/**
 * Learner-writing and sample-task routes (`/v1/samples`).
 *
 * The index publishes derived metadata only: the authentic learner essays,
 * prompts and chart images of seven dated classroom sessions, and the twelve
 * Academic Reading sample-task sheets, cross-linked to the question-type
 * taxonomy (`/v1/question-types`) and the task banks (`/v1/tasks/writing`,
 * `/v1/topics/writing`). No upstream file is served by this API.
 */

import { findSample, samplesFacets, samplesMeta, samplesStats, searchSamples } from '../data/samples.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { SampleFacet } from '../data/samples.js';
import type { JsonValue } from '../types.js';

const SORT_KEYS = ['id', 'title', 'session', 'size'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Related endpoints the indexed families and types resolve against. */
const CROSS_LINKS: Record<string, JsonValue> = {
  questionTypes: '/v1/question-types',
  writingTask1: '/v1/tasks/writing',
  writingTask2Prompts: '/v1/topics/writing',
  essayProfiler: '/v1/tools/essay-profile',
};

/** The facet vocabulary, built once per response so filters and facets agree. */
function facets(): Record<string, JsonValue> {
  const keys: [string, SampleFacet][] = [
    ['collection', 'collection'],
    ['kind', 'kind'],
    ['skill', 'skill'],
    ['format', 'format'],
    ['session', 'session'],
    ['author', 'author'],
    ['task', 'taskFamily'],
    ['type', 'questionType'],
  ];
  return Object.fromEntries(keys.map(([name, facet]) => [name, samplesFacets(facet)]));
}

/** Index metadata, statistics and the available facets. */
function index(): HandlerResult {
  return {
    data: { meta: samplesMeta(), stats: samplesStats() },
    meta: { facets: facets(), crossLinks: CROSS_LINKS },
  };
}

/** Statistics only. */
function stats(): HandlerResult {
  return { data: samplesStats(), meta: { note: samplesMeta().note, crossLinks: CROSS_LINKS } };
}

/** Search the index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const collections = parseList(getString(params, 'collection'), 'collection', samplesFacets('collection'));
  const kinds = parseList(getString(params, 'kind'), 'kind', samplesFacets('kind'));
  const skills = parseList(getString(params, 'skill'), 'skill', samplesFacets('skill'));
  const formats = parseList(getString(params, 'format'), 'format', samplesFacets('format'));
  const sessions = parseList(getString(params, 'session'), 'session', samplesFacets('session'));
  const authors = parseList(getString(params, 'author'), 'author', samplesFacets('author'));
  const tasks = parseList(getString(params, 'task'), 'task', samplesFacets('taskFamily'));
  const types = parseList(getString(params, 'type'), 'type', samplesFacets('questionType'));

  const page = searchSamples({
    limit,
    offset,
    query,
    ...(collections === undefined ? {} : { collections }),
    ...(kinds === undefined ? {} : { kinds }),
    ...(skills === undefined ? {} : { skills }),
    ...(formats === undefined ? {} : { formats }),
    ...(sessions === undefined ? {} : { sessions }),
    ...(authors === undefined ? {} : { authors }),
    ...(tasks === undefined ? {} : { tasks }),
    ...(types === undefined ? {} : { types }),
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
      crossLinks: CROSS_LINKS,
      note: samplesMeta().note,
    },
  };
}

/** One indexed essay, prompt, visual or sample task. */
function item(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findSample(id);
  if (found === undefined) {
    throw notFound(`No indexed sample with id "${id}".`, { id });
  }
  return {
    data: found,
    meta: {
      repository: samplesMeta().repository,
      license: samplesMeta().license,
      note: samplesMeta().note,
      crossLinks: CROSS_LINKS,
    },
  };
}

/** Learner-writing and sample-task routes. */
export const sampleRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/samples',
    versioned: true,
    summary:
      'Provenance and aggregate statistics for the learner-writing and Academic Reading sample-task index.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/samples/stats',
    versioned: true,
    summary: 'Session, task-family, author and question-type statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/samples/items',
    versioned: true,
    summary:
      'Search indexed learner essays and sample tasks by collection, kind, task family, question type, session or author.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/samples/:id',
    versioned: true,
    summary: 'One indexed essay, prompt, chart visual or Academic Reading sample task.',
    handler: item,
  },
];
