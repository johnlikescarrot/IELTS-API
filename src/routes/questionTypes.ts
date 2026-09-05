/**
 * Question-type taxonomy routes (`/v1/question-types`).
 */

import {
  QUESTION_TYPE_FAMILIES,
  QUESTION_TYPE_IDS,
  findQuestionType,
  questionTypesWithFrequency,
} from '../data/questionTypes.js';
import { PRACTICE_SKILLS, practiceMeta } from '../data/practiceTests.js';
import { getEnum, getString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** The taxonomy, with the frequencies observed in the indexed corpus. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', PRACTICE_SKILLS);
  const family = getEnum(params, 'family', QUESTION_TYPE_FAMILIES);
  const query = getString(params, 'q') ?? '';
  const types = questionTypesWithFrequency(skill).filter((type) => {
    if (family !== undefined && type.family !== family) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([type.id, type.name, type.description, type.assesses], query)) {
      return false;
    }
    return true;
  });
  return {
    data: types,
    meta: {
      total: types.length,
      skill: skill ?? null,
      family: family ?? null,
      families: QUESTION_TYPE_FAMILIES,
      ids: QUESTION_TYPE_IDS,
      frequencySource: practiceMeta().repository,
      note: 'Frequencies are observed in the practice corpus indexed by /v1/tests, not published by the IELTS partners.',
    },
  };
}

/** One canonical question type. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const type = findQuestionType(id);
  if (type === undefined) {
    throw notFound(`No question type with id "${id}".`, { id, allowed: QUESTION_TYPE_IDS.join(',') });
  }
  return { data: type, meta: { ids: QUESTION_TYPE_IDS } };
}

/** Question-type routes. */
export const questionTypeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/question-types',
    versioned: true,
    summary: 'Canonical IELTS question-type taxonomy with strategies and observed frequencies.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/question-types/:id',
    versioned: true,
    summary: 'One question type, with its strategy, traps and upstream label variants.',
    handler: detail,
  },
];
