/**
 * Listening scenario routes (`/v1/scenarios`).
 */

import {
  discourseClasses,
  findDiscourseClass,
  findScenario,
  findScenarios,
  listeningWordsMeta,
  scenarioCategories,
  scenarioStats,
} from '../data/listeningWords.js';
import { badRequest } from '../lib/errors.js';
import { getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Listening sections accepted by the section filter. */
const SECTIONS = [1, 2, 3, 4] as const;

/**
 * Read the section filter, rejecting values outside the listening sections.
 *
 * @param params - Query parameters.
 */
function getSection(params: ReturnType<typeof toParams>): number | undefined {
  const raw = getString(params, 'section');
  if (raw === undefined) {
    return undefined;
  }
  const section = Number.parseInt(raw, 10);
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) {
    throw badRequest(`Parameter "section" must be one of: ${SECTIONS.join(', ')}.`, {
      parameter: 'section',
      received: raw,
      allowed: SECTIONS.join(','),
    });
  }
  return section;
}

/** List the listening scenarios. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const section = getSection(params);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const all = findScenarios({ section, query });
  const items = all.slice(offset, offset + limit);
  return {
    data: items,
    meta: {
      total: all.length,
      limit,
      offset,
      hasMore: offset + items.length < all.length,
      section: section ?? null,
      sections: SECTIONS,
      queryIncludedInCategories: query.length > 0,
      stats: scenarioStats(),
    },
  };
}

/** The discourse-relation classes with their signal markers. */
function markers(): HandlerResult {
  const classes = discourseClasses();
  return {
    data: classes,
    meta: {
      count: classes.length,
      markerTotal: classes.reduce((sum, entry) => sum + entry.markers.length, 0),
      note: 'Signal words are kept verbatim from the source, including its typos.',
      source: listeningWordsMeta(),
    },
  };
}

/** One listening scenario, with its lexical categories. */
function detail(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const id = context.params['id'] as string;
  const scenario = findScenario(id);
  if (scenario === undefined) {
    throw notFound(`No listening scenario with id "${id}".`, {
      id,
      allowed:
        'personal-details, housing, vehicles, banking, tourism, transport, places, employment, membership-sports-medical, map-tasks, course-assignment, academic-lecture',
    });
  }
  const query = getString(params, 'q') ?? '';
  const categories = scenarioCategories(scenario, query);
  return {
    data: { ...scenario, categories },
    meta: {
      id,
      totalCategories: scenario.categories.length,
      matchedCategories: categories.length,
      termTotal: categories.reduce((sum, category) => sum + category.terms.length, 0),
    },
  };
}

/** One discourse-relation class. */
function discourseDetail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const entry = findDiscourseClass(id);
  if (entry === undefined) {
    throw notFound(`No discourse class with id "${id}".`, {
      id,
      allowed: discourseClasses()
        .map((cls) => cls.id)
        .join(','),
    });
  }
  return { data: entry, meta: { id, markers: entry.markers.length } };
}

/** Scenario routes. */
export const scenarioRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/scenarios',
    versioned: true,
    summary: 'Listening scenario taxonomy with lexical fields, filterable by section.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/scenarios/discourse-markers',
    versioned: true,
    summary: 'Discourse-relation classes (adversative, causal, ...) with their signal words.',
    handler: markers,
  },
  {
    method: 'GET',
    path: '/v1/scenarios/discourse-markers/:id',
    versioned: true,
    summary: 'One discourse-relation class with its signal words.',
    handler: discourseDetail,
  },
  {
    method: 'GET',
    path: '/v1/scenarios/:id',
    versioned: true,
    summary: 'One listening scenario with its lexical categories and terms.',
    handler: detail,
  },
];
