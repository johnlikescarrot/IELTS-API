/**
 * IELTS Practice and Curriculum Catalogue routes (`/v1/practice`).
 */

import {
  PRACTICE_COLLECTIONS,
  PRACTICE_LEVELS,
  PRACTICE_META,
  PRACTICE_SKILLS,
  PRACTICE_STRATEGIES,
  STUDY_FRAMEWORK_STEPS,
  findPracticeStrategy,
  findPracticeUnit,
  getStrategiesBySkill,
  practiceStats,
  randomPracticeUnits,
  searchPracticeUnits,
} from '../data/practice.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, getOptionalBoolean, getOptionalInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { PracticeUnit, Skill } from '../types.js';

/** Search practice units. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const skill = getEnum(params, 'skill', PRACTICE_SKILLS);
  const collection = getEnum(params, 'collection', PRACTICE_COLLECTIONS);
  const level = getEnum(params, 'level', PRACTICE_LEVELS);
  const hasAudio = getOptionalBoolean(params, 'hasAudio');
  const unitNumber = getOptionalInt(params, 'unitNumber', 1, 1000);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 2000, 0);

  const page = searchPracticeUnits({
    limit,
    offset,
    query,
    ...(skill === undefined ? {} : { skill }),
    ...(collection === undefined ? {} : { collection }),
    ...(level === undefined ? {} : { level }),
    ...(hasAudio === undefined ? {} : { hasAudio }),
    ...(unitNumber === undefined ? {} : { unitNumber }),
  });

  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      skill: skill ?? null,
      collection: collection ?? null,
      level: level ?? null,
      hasAudio: hasAudio ?? null,
      collections: PRACTICE_COLLECTIONS,
      levels: PRACTICE_LEVELS,
      skills: PRACTICE_SKILLS,
      note: PRACTICE_META.note,
    },
  };
}

/** Aggregate statistics. */
function stats(): HandlerResult {
  return { data: practiceStats(), meta: { meta: PRACTICE_META } };
}

/** Deterministic random sample. */
function random(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 50, 5);
  const skill = getEnum(params, 'skill', PRACTICE_SKILLS);
  const collection = getEnum(params, 'collection', PRACTICE_COLLECTIONS);
  const seed = getString(params, 'seed') ?? String(Date.now());
  return {
    data: randomPracticeUnits(seed, count, skill, collection),
    meta: { count, seed, skill: skill ?? null, collection: collection ?? null },
  };
}

/** List all strategies or filter by query. */
function listStrategies(): HandlerResult {
  return {
    data: PRACTICE_STRATEGIES,
    meta: {
      total: PRACTICE_STRATEGIES.length,
      readingStrategies: PRACTICE_STRATEGIES.filter((s) => s.skill === 'reading').length,
      listeningStrategies: PRACTICE_STRATEGIES.filter((s) => s.skill === 'listening').length,
    },
  };
}

/** List strategies for one skill. */
function skillStrategies(context: RouteContext): HandlerResult {
  const rawSkill = context.params.skill as string;
  if (rawSkill !== 'reading' && rawSkill !== 'listening') {
    throw badRequest('Skill parameter must be "reading" or "listening".', {
      skill: rawSkill,
      allowed: 'reading,listening',
    });
  }
  const items = getStrategiesBySkill(rawSkill);
  return {
    data: items,
    meta: { skill: rawSkill, count: items.length },
  };
}

/** Look up a specific strategy guide. */
function lookupStrategy(context: RouteContext): HandlerResult {
  const rawSkill = context.params.skill as string;
  if (rawSkill !== 'reading' && rawSkill !== 'listening') {
    throw badRequest('Skill parameter must be "reading" or "listening".', {
      skill: rawSkill,
      allowed: 'reading,listening',
    });
  }
  const strategyId = context.params.id as string;
  const strategy = findPracticeStrategy(rawSkill as Skill, strategyId);
  if (strategy === undefined) {
    throw notFound(`No strategy found for skill "${rawSkill}" and id "${strategyId}".`, {
      skill: rawSkill,
      id: strategyId,
    });
  }
  return {
    data: strategy,
    meta: { skill: rawSkill, id: strategyId, name: strategy.name },
  };
}

/** Get the 6-step study framework. */
function steps(): HandlerResult {
  return {
    data: STUDY_FRAMEWORK_STEPS,
    meta: {
      totalSteps: STUDY_FRAMEWORK_STEPS.length,
      methodology: '6-step systematic IELTS study framework',
    },
  };
}

/** Look up one practice unit by identifier. */
function lookup(context: RouteContext): HandlerResult {
  const id = context.params.id as string;
  const unit: PracticeUnit | undefined = findPracticeUnit(id);
  if (unit === undefined) {
    throw notFound(`No practice unit with id "${id}".`, { id });
  }
  return {
    data: unit,
    meta: { id: unit.id, collection: unit.collection, skill: unit.skill },
  };
}

/** Practice routes. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice',
    versioned: true,
    summary: 'Search and filter the 1,852 practice units by skill, collection, level, or audio availability.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/practice/stats',
    versioned: true,
    summary: 'Aggregate statistics and availability for the practice catalogue.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/practice/random',
    versioned: true,
    summary: 'A seeded random sample of practice units.',
    handler: random,
  },
  {
    method: 'GET',
    path: '/v1/practice/strategies',
    versioned: true,
    summary: 'List all task family strategies for Reading and Listening.',
    handler: listStrategies,
  },
  {
    method: 'GET',
    path: '/v1/practice/strategies/:skill',
    versioned: true,
    summary: 'List task family strategies for a specific skill (reading or listening).',
    handler: skillStrategies,
  },
  {
    method: 'GET',
    path: '/v1/practice/strategies/:skill/:id',
    versioned: true,
    summary: 'Detailed strategy guide for a specific task family.',
    handler: lookupStrategy,
  },
  {
    method: 'GET',
    path: '/v1/practice/steps',
    versioned: true,
    summary: 'The 6-step systematic IELTS preparation framework.',
    handler: steps,
  },
  {
    method: 'GET',
    path: '/v1/practice/:id',
    versioned: true,
    summary: 'Look up a single practice unit by identifier.',
    handler: lookup,
  },
];
