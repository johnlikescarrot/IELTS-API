/** No-auth original reading practice and stateless feedback endpoints. */

import {
  READING_DATASET,
  READING_LEVELS,
  READING_QUESTION_TYPES,
  READING_TOPICS,
  readingExercise,
  readingStats,
  searchReading,
} from '../data/reading.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { gradeReading } from '../lib/reading.js';
import { seededIndices } from '../lib/rng.js';
import { paginate } from '../lib/search.js';

import type { ReadingExercise } from '../reading-types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Resolve filters once, sharing exactly the same rules between listing and sampling. */
function filtered(context: RouteContext): ReadingExercise[] {
  const params = toParams(context.url);
  const level = getEnum(params, 'level', READING_LEVELS);
  const topic = getEnum(params, 'topic', READING_TOPICS);
  return searchReading({
    query: getString(params, 'q') ?? '',
    ...(level === undefined ? {} : { level }),
    ...(topic === undefined ? {} : { topic }),
  });
}

/** List brief records; passages and questions are available from the detail endpoint. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const page = paginate(
    filtered(context),
    getInt(params, 'limit', 1, 100, 20),
    getInt(params, 'offset', 0, 1000, 0),
  );
  return {
    data: page.items.map(({ id, title, level, topic, suggestedMinutes, questions }) => ({
      id,
      title,
      level,
      topic,
      suggestedMinutes,
      questionCount: questions.length,
    })),
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      dataset: READING_DATASET,
      facets: { level: READING_LEVELS, topic: READING_TOPICS, questionType: READING_QUESTION_TYPES },
    },
  };
}

/** Report actual dataset sizes and content identity. */
function stats(): HandlerResult {
  return { data: readingStats(), meta: { dataset: READING_DATASET } };
}

/** Deterministic sampling without replacement; fewer results when the filtered pool is smaller. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const seed = getString(params, 'seed') ?? 'ielts-api-reading';
  const count = getInt(params, 'count', 1, 6, 1);
  const pool = filtered(context);
  const selected = seededIndices(seed, pool.length, count).map((index) => pool[index]!);
  return {
    data: selected,
    meta: {
      seed,
      requestedCount: count,
      count: selected.length,
      available: pool.length,
      dataset: READING_DATASET,
    },
  };
}

/** Public question view. This is practice, not a secure examination system. */
function detail(context: RouteContext): HandlerResult {
  return { data: readingExercise(context.params.id!), meta: { dataset: READING_DATASET } };
}

/** Feedback without accounts, storage, cookies, tracking identifiers or third-party calls. */
function grade(context: RouteContext): HandlerResult {
  return {
    data: gradeReading(context.params.id!, context.body),
    meta: {
      dataset: READING_DATASET,
      scoring: 'One mark per question; no partial credit. Practice percentage, not an IELTS band score.',
      matching:
        'NFC Unicode, case-insensitive, whitespace collapsed. Punctuation and accents preserved. Short-answer word limits use whitespace-delimited tokens.',
      privacy:
        'Submissions are not stored or logged by the application. Hosting providers may apply their own logging policies.',
    },
  };
}

/** Literal routes precede the parameterised exercise identifier. */
export const readingRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/reading',
    versioned: true,
    summary: 'Browse original reading practice by level, topic and free text.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/reading/stats',
    versioned: true,
    summary: 'Original reading collection statistics and SHA-256 identity.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/reading/random',
    versioned: true,
    summary: 'Seeded reading exercises without replacement or answer keys.',
    handler: random,
  },
  {
    method: 'GET',
    path: '/v1/reading/:id',
    versioned: true,
    summary: 'An original reading passage and questions, without solutions.',
    handler: detail,
  },
  {
    method: 'POST',
    path: '/v1/reading/:id/grade',
    versioned: true,
    summary: 'Stateless reading feedback with accepted answers and paragraph evidence.',
    handler: grade,
  },
];
