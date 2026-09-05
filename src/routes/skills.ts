/**
 * Test-format, question-type and study-plan routes.
 *
 * `/v1/skills` publishes the public format blueprints of the four papers,
 * `/v1/question-types` the receptive question families with original strategy
 * guides, and `/v1/study-system` the study cycle, plan phases and CEFR ladder
 * behind multi-week preparation (planned by `/v1/study-plan`).
 */

import {
  BLUEPRINT_SKILLS,
  CEFR_LADDER,
  findQuestionType,
  findQuestionTypes,
  findSkillBlueprint,
  QUESTION_TYPE_SKILLS,
  RAW_SCORE_TABLES,
  SKILL_BLUEPRINTS,
  STUDY_CYCLE_STEPS,
  STUDY_PHASES,
} from '../data/skills.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { matchesQuery, paginate } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Format blueprints for every skill. */
function skills(): HandlerResult {
  return {
    data: [...SKILL_BLUEPRINTS],
    meta: { total: SKILL_BLUEPRINTS.length, skills: [...BLUEPRINT_SKILLS] },
  };
}

/** One format blueprint. */
function skillById(context: RouteContext): HandlerResult {
  const skill = context.params['skill'] as string;
  const blueprint = findSkillBlueprint(skill);
  if (blueprint === undefined) {
    throw notFound(`No test-format blueprint for "${skill}".`, {
      skill,
      allowed: BLUEPRINT_SKILLS.join(','),
    });
  }
  return { data: blueprint, meta: { skill: blueprint.skill } };
}

/** Receptive question families with strategy guides. */
function questionTypes(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', QUESTION_TYPE_SKILLS);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = findQuestionTypes(skill).filter(
    (family) => query.length === 0 || matchesQuery([family.name, family.description, ...family.traps], query),
  );
  const page = paginate(filtered, limit, offset);
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      skill: skill ?? null,
      skills: [...QUESTION_TYPE_SKILLS],
    },
  };
}

/** One question-type family. */
function questionTypeById(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const family = findQuestionType(id);
  if (family === undefined) {
    throw notFound(`No question-type family for "${id}".`, { id });
  }
  return { data: family, meta: { id: family.id, skill: family.skill } };
}

/** The study system: cycle, phases and CEFR ladder. */
function studySystem(): HandlerResult {
  return {
    data: {
      cycle: [...STUDY_CYCLE_STEPS],
      phases: [...STUDY_PHASES],
      cefrLadder: [...CEFR_LADDER],
      rawScoreTables: RAW_SCORE_TABLES.map((table) => table.id),
    },
    meta: {
      steps: STUDY_CYCLE_STEPS.length,
      phases: STUDY_PHASES.length,
      note: 'Apply the six-step cycle to every practice passage; the phases order a multi-week plan.',
    },
  };
}

/** Skill, question-type and study-system routes. */
export const skillRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/skills',
    versioned: true,
    summary: 'Format blueprints of the four IELTS papers (sections, timings, question counts).',
    handler: skills,
  },
  {
    method: 'GET',
    path: '/v1/skills/:skill',
    versioned: true,
    summary: 'Format blueprint of one IELTS paper.',
    handler: skillById,
  },
  {
    method: 'GET',
    path: '/v1/question-types',
    versioned: true,
    summary: 'Receptive question families with strategy guides (`skill`, `q`).',
    handler: questionTypes,
  },
  {
    method: 'GET',
    path: '/v1/question-types/:id',
    versioned: true,
    summary: 'Strategy guide of one question family.',
    handler: questionTypeById,
  },
  {
    method: 'GET',
    path: '/v1/study-system',
    versioned: true,
    summary: 'The study system: six-step cycle, plan phases and CEFR ladder.',
    handler: studySystem,
  },
];
