/**
 * Question-type taxonomy routes (`/v1/question-types`).
 */

import {
  QUESTION_RESPONSE_FORMATS,
  QUESTION_TYPE_SKILLS,
  QUESTION_TYPES,
  UPSTREAM_STRATEGY_FIELDS,
  findQuestionType,
  questionTypeStats,
} from '../data/question-types.js';
import { notFound } from '../lib/errors.js';
import { matchesQuery, paginate } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { QuestionTypeData } from '../types.js';

/** Fields searched by `q`. */
function searchableFields(type: QuestionTypeData): (string | null | undefined)[] {
  return [type.name, type.id, ...type.alsoCalledAs];
}

/** Filterable listing. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', QUESTION_TYPE_SKILLS);
  const format = getEnum(params, 'format', QUESTION_RESPONSE_FORMATS);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = QUESTION_TYPES.filter((type) => {
    if (skill !== undefined && !type.skills.includes(skill)) {
      return false;
    }
    if (format !== undefined && type.responseFormat !== format) {
      return false;
    }
    if (query.length > 0 && !matchesQuery(searchableFields(type), query)) {
      return false;
    }
    return true;
  });
  const page = paginate(filtered, limit, offset);
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      skill: skill ?? null,
      format: format ?? null,
      skills: QUESTION_TYPE_SKILLS,
      formats: QUESTION_RESPONSE_FORMATS,
      stats: { ...questionTypeStats() },
      upstreamStrategyFields: UPSTREAM_STRATEGY_FIELDS,
    },
  };
}

/** One question type by id. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params.typeId as string;
  const type = findQuestionType(id);
  if (type === undefined) {
    throw notFound(`Unknown question type "${id}".`, { parameter: 'typeId' });
  }
  return { data: type, meta: { id: type.id, skills: type.skills } };
}

/** Question-type routes. */
export const questionTypeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/question-types',
    versioned: true,
    summary: 'Machine-readable Listening/Reading question types with strategy playbooks.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/question-types/:typeId',
    versioned: true,
    summary: 'One question type: answer rules, playbook, distractors and pitfalls.',
    handler: detail,
  },
];
