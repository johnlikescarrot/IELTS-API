/**
 * Speaking question-season routes (`/v1/speaking/bank`).
 */

import {
  CARD_CATEGORIES,
  CARD_STATUSES,
  bankIndex,
  findSpeakingCard,
  part1Topics,
  season,
  speakingBankMeta,
  speakingBankStats,
  speakingCardsPage,
} from '../data/speakingBank.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { CardCategory, CardStatus } from '../types.js';

/** Season overview: rotation window, statistics and the Part 1 topic sets. */
function overview(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const topics = part1Topics(query);
  return {
    data: {
      season: season(),
      part1Topics: topics,
    },
    meta: {
      total: topics.length,
      query,
      stats: speakingBankStats(),
      source: speakingBankMeta(),
      note: 'Cue-card prompt texts are not redistributed; titles identify the cards.',
    },
  };
}

/** List the classified Part 2 cue cards. */
function cueCards(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const category = getEnum(params, 'category', CARD_CATEGORIES) as CardCategory | undefined;
  const status = getEnum(params, 'status', CARD_STATUSES) as CardStatus | undefined;
  const query = getString(params, 'q') ?? '';
  const sort = getEnum(params, 'sort', ['id', 'prompt'] as const) ?? 'id';
  const order = getEnum(params, 'order', ['asc', 'desc'] as const) ?? 'asc';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100_000, 0);
  const page = speakingCardsPage({ category, status, query, sort, order, limit, offset });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      category: category ?? null,
      status: status ?? null,
      categories: CARD_CATEGORIES,
      statuses: CARD_STATUSES,
      season: season().label,
      stats: speakingBankStats(),
    },
  };
}

/** One Part 2 cue card, cross-referenced with the crowd bank. */
function cueCardDetail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const card = findSpeakingCard(id);
  if (card === undefined) {
    throw notFound(`No cue card with id "${id}".`, { id });
  }
  const related = bankIndex().find((entry) => entry.titleZh === card.titleZh) ?? null;
  return {
    data: { ...card, related },
    meta: {
      id,
      season: season().label,
      related: related === null ? null : related.id,
    },
  };
}

/** The crowd bank's Part 2 index with Part 3 follow-up counts. */
function part3(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const cards = bankIndex(query);
  return {
    data: cards,
    meta: {
      total: cards.length,
      query,
      followUpTotal: cards.reduce((sum, card) => sum + card.followUps, 0),
      season: season().label,
      note: 'Follow-up questions are counted, not redistributed.',
    },
  };
}

/** Speaking bank routes. */
export const speakingBankRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/speaking/bank',
    versioned: true,
    summary: 'Speaking question-season overview: rotation window, statistics and Part 1 topic sets.',
    handler: overview,
  },
  {
    method: 'GET',
    path: '/v1/speaking/bank/cue-cards',
    versioned: true,
    summary: 'Part 2 cue cards of the season, classified by content category and rotation status.',
    handler: cueCards,
  },
  {
    method: 'GET',
    path: '/v1/speaking/bank/cue-cards/:id',
    versioned: true,
    summary: 'One Part 2 cue card with its classification and crowd-bank cross-reference.',
    handler: cueCardDetail,
  },
  {
    method: 'GET',
    path: '/v1/speaking/bank/part3',
    versioned: true,
    summary: 'Part 3 follow-up question counts per crowd-bank card.',
    handler: part3,
  },
];
