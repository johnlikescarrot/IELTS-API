/**
 * Communicative-context routes (`/v1/scenes`).
 *
 * The listening scenes and reading domains behind the receptive papers, each
 * linked to the canonical question types it favours, the signals that unlock
 * it, and keyword queries into the vocabulary dataset.
 */

import { SCENES, SCENE_SKILLS, findScene } from '../data/scenes.js';
import { QUESTION_TYPE_IDS } from '../data/questionTypes.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** List the communicative contexts, optionally filtered. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', SCENE_SKILLS);
  const section = getInt(params, 'section', 1, 4, -1);
  const type = getEnum(params, 'type', QUESTION_TYPE_IDS);
  const query = getString(params, 'q') ?? '';
  const filtered = SCENES.filter((scene) => {
    if (skill !== undefined && scene.skill !== skill) {
      return false;
    }
    if (section > 0 && !scene.sections.includes(section)) {
      return false;
    }
    if (type !== undefined && !scene.typicalQuestionTypes.includes(type)) {
      return false;
    }
    if (
      query.length > 0 &&
      !matchesQuery([scene.id, scene.name, scene.description, ...scene.keywords, ...scene.signals], query)
    ) {
      return false;
    }
    return true;
  });
  return {
    data: filtered,
    meta: {
      total: filtered.length,
      skill: skill ?? null,
      section: section > 0 ? section : null,
      type: type ?? null,
      skills: SCENE_SKILLS,
      questionTypes: '/v1/question-types',
    },
  };
}

/** One communicative context, with links into the datasets it draws on. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const scene = findScene(id);
  if (scene === undefined) {
    throw notFound(`No scene with id "${id}".`, {
      id,
      allowed: SCENES.map((entry) => entry.id).join(','),
    });
  }
  return {
    data: scene,
    meta: {
      questionTypes: scene.typicalQuestionTypes.map((type) => `/v1/question-types/${type}`),
      vocabulary: scene.keywords.map((keyword) => `/v1/vocabulary?q=${encodeURIComponent(keyword)}`),
      practice: `/v1/tests/items?skill=${scene.skill}`,
    },
  };
}

/** Communicative-context routes. */
export const sceneRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/scenes',
    versioned: true,
    summary: 'Listening scenes and reading domains with their favoured question types and signals.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/scenes/:id',
    versioned: true,
    summary: 'One communicative context, with links into the question-type and vocabulary datasets.',
    handler: detail,
  },
];
