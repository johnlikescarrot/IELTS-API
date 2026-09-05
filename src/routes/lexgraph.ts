/**
 * Lexical-network routes (`/v1/lexgraph`).
 *
 * The endpoints expose the definition graph derived from the vocabulary
 * dataset: whole-network statistics and the adjacent words of any headword.
 * Both sides are computed from the published glosses alone, so every number
 * can be re-derived by citing `/v1/vocabulary` itself.
 */

import { lexgraphStats, neighboursFor } from '../lib/lexgraph.js';
import { findWord } from '../data/vocabulary.js';
import { getEnum, getInt, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';
import { paginate, sortBy } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const DIRECTIONS = ['defines', 'used-by', 'both'] as const;
const SORTS = ['weight', 'word'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Network statistics and the most connected definers. */
function stats(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const hubs = getInt(params, 'limit', 1, 50, 10);
  return {
    data: lexgraphStats(hubs),
    meta: {
      method:
        "A directed edge A -> B exists when headword A occurs as a whole token in B's definition or senses; weight counts occurrences, self-mentions excluded and duplicate gloss texts deduplicated.",
      undirectedProjection:
        'components, largestComponent, singletons and the degree histogram ignore edge direction.',
      hubs: 'topHubs ranks by usageWeight + definerWeight, ties by word.',
    },
  };
}

/** Adjacent words of one headword in the network. */
function neighbours(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const word = context.params.word as string;
  const entry = findWord(word);
  if (entry === undefined) {
    throw notFound(`No vocabulary entry for "${word}".`, { word });
  }
  const direction = getEnum(params, 'direction', DIRECTIONS) ?? 'both';
  const minWeight = getInt(params, 'minWeight', 1, 1000, 1);
  const sort = getEnum(params, 'sort', SORTS) ?? 'weight';
  // Weighted edges read best strongest-first; alphabetical lists read best A-first.
  const order = getEnum(params, 'order', ORDERS) ?? (sort === 'word' ? 'asc' : 'desc');
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);

  const neighboursOfWord = neighboursFor(entry, direction, minWeight);
  const byWord = sortBy(neighboursOfWord, (neighbour) => neighbour.word.toLowerCase(), 'asc');
  const ordered =
    sort === 'weight'
      ? sortBy(byWord, (neighbour) => neighbour.weight, order)
      : order === 'desc'
        ? [...byWord].reverse()
        : byWord;
  const page = paginate(ordered, limit, offset);
  return {
    data: page.items,
    meta: {
      word: entry.word,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      direction,
      minWeight,
      sort,
      order,
      relation:
        '"defines": the neighbour occurs in this word\'s glosses; "used-by": this word occurs in the neighbour\'s glosses.',
    },
  };
}

/** Lexical-network routes. */
export const lexgraphRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/lexgraph',
    versioned: true,
    summary: 'Statistics of the definitional lexical network (4,174 nodes, derived from vocabulary glosses).',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/lexgraph/:word',
    versioned: true,
    summary: 'Adjacent words of a headword in the lexical network, with weights and shared volumes.',
    handler: neighbours,
  },
];
