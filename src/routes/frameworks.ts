/**
 * Response-framework routes (`/v1/frameworks`).
 */

import { FRAMEWORK_SECTIONS, RESPONSE_FRAMEWORKS, findFramework } from '../data/frameworks.js';
import { ESSAY_QUESTION_TYPES } from '../data/topics.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { Skill } from '../types.js';

const SECTIONS = FRAMEWORK_SECTIONS;
const SKILLS = ['writing', 'speaking'] as const satisfies readonly Skill[];

/** The framework taxonomy. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const section = getEnum(params, 'section', SECTIONS);
  const skill = getEnum(params, 'skill', SKILLS);
  const questionType = getEnum(params, 'type', ESSAY_QUESTION_TYPES);
  const part = getInt(params, 'part', 1, 3, -1);
  const query = getString(params, 'q') ?? '';
  const filtered = RESPONSE_FRAMEWORKS.filter((framework) => {
    if (section !== undefined && framework.section !== section) {
      return false;
    }
    if (skill !== undefined && framework.skill !== skill) {
      return false;
    }
    if (questionType !== undefined && !framework.questionTypes.includes(questionType)) {
      return false;
    }
    if (part > 0 && !framework.speakingParts.includes(part)) {
      return false;
    }
    if (
      query.length > 0 &&
      !matchesQuery(
        [
          framework.id,
          framework.name,
          framework.summary,
          ...framework.stages.flatMap((stage) => [stage.position, stage.purpose, ...stage.language]),
        ],
        query,
      )
    ) {
      return false;
    }
    return true;
  });
  return {
    data: filtered,
    meta: {
      total: filtered.length,
      section: section ?? null,
      skill: skill ?? null,
      type: questionType ?? null,
      part: part > 0 ? part : null,
      sections: FRAMEWORK_SECTIONS,
      questionTypes: ESSAY_QUESTION_TYPES,
      crossLinks: {
        writingPrompts: '/v1/topics/writing',
        speakingItems: '/v1/topics/speaking',
        taskFamilies: '/v1/tasks/writing',
      },
    },
  };
}

/** One response framework. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const framework = findFramework(id);
  if (framework === undefined) {
    throw notFound(`No framework with id "${id}".`, {
      id,
      allowed: RESPONSE_FRAMEWORKS.map((entry) => entry.id).join(','),
    });
  }
  return { data: framework, meta: { sections: FRAMEWORK_SECTIONS } };
}

/** Framework routes. */
export const frameworkRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/frameworks',
    versioned: true,
    summary: 'Response frameworks for Writing Task 2 and Speaking Parts 2-3, with stages and cue language.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/frameworks/:id',
    versioned: true,
    summary: 'One framework, with its ordered stages, cue language and pitfalls.',
    handler: detail,
  },
];
