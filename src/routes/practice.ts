/**
 * Receptive-skills practice routes (`/v1/practice`).
 */

import {
  LISTENING_MINUTES,
  LISTENING_QUESTION_COUNT,
  LISTENING_SECTIONS,
  LISTENING_TRANSFER_MINUTES,
  PRACTICE_SKILLS,
  READING_MINUTES,
  STUDY_LEVELS,
  findPracticeTypes,
  findStudyPlans,
} from '../data/practice.js';
import { matchesQuery } from '../lib/search.js';
import { getEnum, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Question families, filterable by skill with free-text search. */
function questionTypes(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', PRACTICE_SKILLS);
  const query = getString(params, 'q') ?? '';

  const filtered = findPracticeTypes(skill).filter(
    (type) =>
      query.length === 0 ||
      matchesQuery([type.name, type.description, ...type.skillsAssessed, ...type.strategy], query),
  );
  return {
    data: filtered,
    meta: {
      total: filtered.length,
      skill: skill ?? null,
      skills: PRACTICE_SKILLS,
      query: query.length > 0 ? query : null,
    },
  };
}

/** The four Listening sections with the test timing model. */
function listeningSections(): HandlerResult {
  return {
    data: LISTENING_SECTIONS,
    meta: {
      total: LISTENING_SECTIONS.length,
      questions: LISTENING_QUESTION_COUNT,
      audioMinutes: LISTENING_MINUTES,
      transferMinutes: LISTENING_TRANSFER_MINUTES,
      note: 'Timing follows the test descriptions published by the IELTS partners: 30 minutes of audio plus 10 minutes of answer-transfer time on the paper-based test.',
    },
  };
}

/** CEFR-graded study plans, filterable by level. */
function studyPlans(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const level = getEnum(params, 'level', STUDY_LEVELS);
  const plans = findStudyPlans(level);
  return {
    data: plans,
    meta: {
      total: plans.length,
      level: level ?? null,
      levels: STUDY_LEVELS,
      readingMinutes: READING_MINUTES,
    },
  };
}

/** Practice routes. */
export const practiceRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice/question-types',
    versioned: true,
    summary: 'Listening and Reading question families with strategy and timing guidance.',
    handler: questionTypes,
  },
  {
    method: 'GET',
    path: '/v1/practice/listening/sections',
    versioned: true,
    summary: 'The four Listening sections with the test timing model.',
    handler: listeningSections,
  },
  {
    method: 'GET',
    path: '/v1/practice/study-plans',
    versioned: true,
    summary: 'CEFR-graded (A1-C2) study plans for the receptive skills.',
    handler: studyPlans,
  },
];
