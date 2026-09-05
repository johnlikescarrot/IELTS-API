/**
 * Question-type taxonomy routes (`/v1/questions`).
 */

import { QUESTION_SKILLS, QUESTION_TYPES, findQuestionType, questionTypeCounts } from '../data/questions.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { matchesQuery, paginate } from '../lib/search.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Search the Listening and Reading question-type taxonomy. */
function questions(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', QUESTION_SKILLS);
  const query = getString(params, 'q') ?? '';
  const ordered = getString(params, 'ordered');
  const limit = getInt(params, 'limit', 1, 100, 50);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = QUESTION_TYPES.filter((type) => {
    if (skill !== undefined && type.skill !== skill) {
      return false;
    }
    if (ordered !== undefined && String(type.ordered) !== ordered) {
      return false;
    }
    if (
      query.length > 0 &&
      !matchesQuery([type.name, type.description, type.tests, ...type.strategy, ...type.pitfalls], query)
    ) {
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
      skills: QUESTION_SKILLS,
      counts: questionTypeCounts(),
      note: 'Question-type names and answer rules follow the IELTS partners published test format; the strategy and pitfall notes are original to this project.',
    },
  };
}

/** One question type. */
function question(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const type = findQuestionType(id);
  if (type === undefined) {
    throw notFound(`No question type with id "${id}".`, {
      id,
      hint: 'List every identifier at /v1/questions.',
    });
  }
  const related = QUESTION_TYPES.filter(
    (candidate) => candidate.skill === type.skill && candidate.id !== type.id,
  ).map((candidate) => candidate.id);
  return { data: { ...type, related }, meta: { skill: type.skill } };
}

/** Question-type routes. */
export const questionRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/questions',
    versioned: true,
    summary: 'The Listening and Reading question-type taxonomy, with strategy and pitfall notes.',
    handler: questions,
  },
  {
    method: 'GET',
    path: '/v1/questions/:id',
    versioned: true,
    summary: 'One question type, with the other types of the same paper.',
    handler: question,
  },
];
