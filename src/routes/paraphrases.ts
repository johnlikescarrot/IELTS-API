/**
 * Paraphrase routes (`/v1/paraphrases`).
 */

import {
  PARAPHRASE_PARTS_OF_SPEECH,
  findParaphraseGroup,
  listeningWordsMeta,
  paraphraseGroupsPage,
  paraphraseMechanisms,
  paraphraseStats,
} from '../data/listeningWords.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ParaphrasePos } from '../types.js';

/** List the paraphrase groups. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const pos = getEnum(params, 'pos', PARAPHRASE_PARTS_OF_SPEECH) as ParaphrasePos | undefined;
  const query = getString(params, 'q') ?? '';
  const sort = getEnum(params, 'sort', ['id', 'terms'] as const) ?? 'id';
  const order = getEnum(params, 'order', ['asc', 'desc'] as const) ?? 'asc';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100_000, 0);
  const page = paraphraseGroupsPage({ pos, query, sort, order, limit, offset });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      pos: pos ?? null,
      partsOfSpeech: PARAPHRASE_PARTS_OF_SPEECH,
      stats: paraphraseStats(),
    },
  };
}

/** The paraphrase mechanisms the source sheet's introduction describes. */
function mechanisms(): HandlerResult {
  return {
    data: paraphraseMechanisms(),
    meta: {
      count: paraphraseMechanisms().length,
      note: 'Original wording written for this project.',
      source: listeningWordsMeta(),
    },
  };
}

/** One paraphrase group. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const group = findParaphraseGroup(id);
  if (group === undefined) {
    throw notFound(`No paraphrase group with id "${id}".`, {
      id,
      partsOfSpeech: PARAPHRASE_PARTS_OF_SPEECH.join(','),
    });
  }
  return { data: group, meta: { id } };
}

/** Paraphrase routes. */
export const paraphraseRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/paraphrases',
    versioned: true,
    summary: 'Listening same-meaning replacement groups, searchable by sense and term.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/paraphrases/mechanisms',
    versioned: true,
    summary: 'The paraphrase mechanisms (word-family, polarity, hyponymy, ...) behind the groups.',
    handler: mechanisms,
  },
  {
    method: 'GET',
    path: '/v1/paraphrases/:id',
    versioned: true,
    summary: 'One paraphrase group with its sense, gloss and interchangeable terms.',
    handler: detail,
  },
];
