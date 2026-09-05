/**
 * Test-format blueprint routes (`/v1/format`).
 */

import { TEST_BLUEPRINTS, TEST_MODULES, findBlueprint, totalTestMinutes } from '../data/format.js';
import { QUESTION_TYPES } from '../data/questions.js';
import { RAW_SCORE_TABLES } from '../data/rawscores.js';
import { notFound } from '../lib/errors.js';
import { getEnum, toParams } from '../lib/query.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { Skill } from '../types.js';

/** The four skills, in test-report order. */
const SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/** Every test-format blueprint, optionally filtered by skill. */
function blueprints(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', SKILLS);
  const filtered = TEST_BLUEPRINTS.filter((blueprint) => skill === undefined || blueprint.skill === skill);
  return {
    data: filtered,
    meta: {
      total: filtered.length,
      skill: skill ?? null,
      skills: SKILLS,
      modules: TEST_MODULES,
      academicTestMinutes: totalTestMinutes(),
      note: 'Timings and item counts follow the IELTS partners published test format; the commentary is original to this project. The Speaking interview may be sat on a different day.',
    },
  };
}

/** One blueprint, resolved together with its question types and score table. */
function blueprint(context: RouteContext): HandlerResult {
  const module = context.params.module as string;
  const found = findBlueprint(module);
  if (found === undefined) {
    throw notFound(`No test-format blueprint for module "${module}".`, {
      module,
      allowed: TEST_MODULES.join(','),
    });
  }
  const questionTypes = QUESTION_TYPES.filter((type) => type.skill === found.skill).map((type) => ({
    id: type.id,
    name: type.name,
    answerFormat: type.answerFormat,
  }));
  const table = found.rawScoreTable === null ? null : RAW_SCORE_TABLES[found.rawScoreTable];
  return {
    data: {
      ...found,
      totalMinutes: found.durationMinutes + found.transferMinutes,
      minutesPerItem: Math.round((found.durationMinutes / found.items) * 100) / 100,
      questionTypes,
      conversion:
        table === null
          ? null
          : { component: table.component, name: table.name, questions: table.questions, note: table.note },
    },
    meta: {
      module: found.module,
      scoring: found.scoring,
      conversionEndpoint: table === null ? null : `/v1/scores/raw?component=${table.component}`,
    },
  };
}

/** Test-format routes. */
export const formatRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/format',
    versioned: true,
    summary: 'Test-format blueprints for all six papers, with part-level timings and item counts.',
    handler: blueprints,
  },
  {
    method: 'GET',
    path: '/v1/format/:module',
    versioned: true,
    summary: 'One paper, resolved with its question types and its raw-score conversion table.',
    handler: blueprint,
  },
];
