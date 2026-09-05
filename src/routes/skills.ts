/**
 * Skills and exam-format routes (`/v1/skills`).
 */

import { SKILL_FORMATS, SKILL_IDS, findSkillFormat } from '../data/skills.js';
import { notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** List all four skill formats. */
function list(): HandlerResult {
  return {
    data: SKILL_FORMATS,
    meta: { count: SKILL_FORMATS.length, skills: SKILL_IDS, source: 'Published IELTS partner test formats.' },
  };
}

/** One skill format. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params.skillId as string;
  const skill = findSkillFormat(id);
  if (skill === undefined) {
    throw notFound(`Unknown skill "${id}".`, { parameter: 'skillId', allowed: SKILL_IDS.join(',') });
  }
  return { data: skill, meta: { skill: skill.id } };
}

/** Skills routes. */
export const skillRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/skills',
    versioned: true,
    summary: 'Exam format reference for the four IELTS skills.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/skills/:skillId',
    versioned: true,
    summary: 'One skill: parts, timing, question counts, delivery rules and scoring.',
    handler: detail,
  },
];
