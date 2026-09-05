/**
 * Task and topic bank routes (`/v1/topics`, `/v1/tasks`).
 */

import { ESSAY_QUESTION_TYPES, SPEAKING_TOPICS, WRITING_CATEGORIES, WRITING_TOPICS } from '../data/topics.js';
import { TASK_MODULES, findTaskTypes } from '../data/tasks.js';
import { THEME_GROUPS, findThemes } from '../data/themes.js';
import { matchesQuery, paginate } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { Skill } from '../types.js';

const PARTS = [1, 2, 3] as const;
const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const satisfies readonly Skill[];

/** Writing Task 2 prompt bank. */
function writingTopics(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const category = getEnum(params, 'category', WRITING_CATEGORIES);
  const questionType = getEnum(params, 'type', ESSAY_QUESTION_TYPES);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = WRITING_TOPICS.filter((topic) => {
    if (category !== undefined && topic.category !== category) {
      return false;
    }
    if (questionType !== undefined && topic.questionType !== questionType) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([topic.prompt, topic.category, ...topic.positions], query)) {
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
      category: category ?? null,
      type: questionType ?? null,
      categories: WRITING_CATEGORIES,
      questionTypes: ESSAY_QUESTION_TYPES,
    },
  };
}

/** Speaking topic bank. */
function speakingTopics(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const part = getInt(params, 'part', 1, 3, -1);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);

  const filtered = SPEAKING_TOPICS.filter((topic) => {
    if (part > 0 && topic.part !== part) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([topic.topic, ...topic.questions], query)) {
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
      part: part > 0 ? part : null,
      parts: [...PARTS],
    },
  };
}

/** Recurring exam themes. */
function themes(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const group = getEnum(params, 'group', THEME_GROUPS);
  const skill = getEnum(params, 'skill', SKILLS);
  const query = getString(params, 'q') ?? '';
  const filtered = findThemes({
    ...(group === undefined ? {} : { group }),
    ...(skill === undefined ? {} : { skill }),
    ...(query.length === 0 ? {} : { query }),
  });
  return {
    data: filtered,
    meta: {
      total: filtered.length,
      group: group ?? null,
      skill: skill ?? null,
      groups: THEME_GROUPS,
      note: 'Themes recur across all four papers; the keyword sets are original collocation lists.',
    },
  };
}

/** Writing Task 1 task families. */
function writingTasks(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', TASK_MODULES);
  const tasks = findTaskTypes(module);
  return {
    data: tasks,
    meta: { total: tasks.length, module: module ?? null, modules: TASK_MODULES },
  };
}

/** Topic and task routes. */
export const topicRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/topics/writing',
    versioned: true,
    summary: 'Writing Task 2 prompts, filterable by category and question type.',
    handler: writingTopics,
  },
  {
    method: 'GET',
    path: '/v1/topics/speaking',
    versioned: true,
    summary: 'Speaking Part 1, 2 and 3 items.',
    handler: speakingTopics,
  },
  {
    method: 'GET',
    path: '/v1/topics/themes',
    versioned: true,
    summary: 'Fifty recurring exam themes, grouped and keyed by paper.',
    handler: themes,
  },
  {
    method: 'GET',
    path: '/v1/tasks/writing',
    versioned: true,
    summary: 'Writing Task 1 task families with structure and timing guidance.',
    handler: writingTasks,
  },
];
