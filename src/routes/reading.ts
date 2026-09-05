/**
 * Graded reading routes (`/v1/reading`).
 */

import { READING_LEVELS, READING_TOPICS, findPassage, readingStats, searchReading } from '../data/reading.js';
import { getBoolean, getEnum, getInt, getString, toParams } from '../lib/query.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ReadingPassage } from '../types.js';

/** One passage without its answer keys, for self-test use. */
function hideAnswers(passage: ReadingPassage) {
  const questions = passage.questions.map((question) => ({
    id: question.id,
    format: question.format,
    prompt: question.prompt,
    ...(question.options === undefined ? {} : { options: question.options }),
  }));
  return { ...passage, questions };
}

/** Search the graded reading dataset. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const level = getEnum(params, 'level', READING_LEVELS);
  const topic = getEnum(params, 'topic', READING_TOPICS);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const page = searchReading({
    limit,
    offset,
    ...(level === undefined ? {} : { level }),
    ...(topic === undefined ? {} : { topic }),
    query,
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      level: level ?? null,
      topic: topic ?? null,
      levels: READING_LEVELS,
      topics: READING_TOPICS,
    },
  };
}

/** Dataset statistics. */
function stats(): HandlerResult {
  return { data: readingStats() };
}

/** One full passage, with or without the answer keys. */
function byId(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const showAnswers = getBoolean(params, 'answers', true);
  const passage = findPassage(context.params.id as string);
  if (passage === undefined) {
    throw notFound(`No reading passage with id "${context.params.id}".`, { id: String(context.params.id) });
  }
  return {
    data: showAnswers ? passage : hideAnswers(passage),
    meta: { id: passage.id, answers: showAnswers ? 'included' : 'withheld' },
  };
}

/** Reading routes. */
export const readingRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/reading',
    versioned: true,
    summary: 'Search original CEFR-graded reading passages (summaries; full text via /v1/reading/:id).',
    handler: search,
  },
  {
    method: 'GET',
    path: '/v1/reading/stats',
    versioned: true,
    summary: 'Aggregate statistics for the graded reading dataset.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/reading/:id',
    versioned: true,
    summary: 'One graded passage with its items; answers can be withheld for self-testing.',
    handler: byId,
  },
];
