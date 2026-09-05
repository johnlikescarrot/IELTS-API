/** Original, no-auth Writing Task 1 stimuli, figures and stateless data checks. */

import {
  findWritingExercise,
  searchWritingExercises,
  writingExerciseView,
  WRITING_EXERCISE_KINDS,
  WRITING_EXERCISE_META,
  WRITING_EXERCISE_REVISION,
} from '../data/writingExercises.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, getString, requireString, toParams } from '../lib/query.js';
import { renderWritingFigure } from '../lib/writingFigure.js';

import type { WritingExercise } from '../data/writingExercises.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

function exerciseFor(context: RouteContext): WritingExercise {
  const id = context.params['id'] as string;
  const exercise = findWritingExercise(id);
  if (exercise === undefined) {
    throw notFound(`No writing exercise with id "${id}".`, { id });
  }
  return exercise;
}

function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const kind = getEnum(params, 'kind', WRITING_EXERCISE_KINDS);
  const query = getString(params, 'q');
  const page = searchWritingExercises({
    limit: getInt(params, 'limit', 1, 100, 20),
    offset: getInt(params, 'offset', 0, 1000, 0),
    ...(kind === undefined ? {} : { kind }),
    ...(query === undefined ? {} : { query }),
  });
  return {
    data: page.items,
    meta: {
      ...WRITING_EXERCISE_META,
      revision: WRITING_EXERCISE_REVISION,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      kinds: [...WRITING_EXERCISE_KINDS],
      query: query ?? null,
    },
  };
}

function detail(context: RouteContext): HandlerResult {
  return { data: writingExerciseView(exerciseFor(context)), meta: WRITING_EXERCISE_META };
}

function figure(context: RouteContext): HandlerResult {
  return {
    raw: {
      contentType: 'image/svg+xml; charset=utf-8',
      body: renderWritingFigure(exerciseFor(context)),
    },
  };
}

function check(context: RouteContext): HandlerResult {
  const exercise = exerciseFor(context);
  const params = toParams(context.url);
  const questionId = requireString(params, 'question').toLowerCase();
  const answer = requireString(params, 'answer').toLowerCase();
  const question = exercise.checks.find((candidate) => candidate.id === questionId);
  if (question === undefined) {
    throw badRequest('Unknown data-check question for this exercise.', {
      parameter: 'question',
      allowed: exercise.checks.map((candidate) => candidate.id).join(','),
    });
  }
  if (!question.options.some((option) => option.id === answer)) {
    throw badRequest('Answer must be an option identifier for this question.', {
      parameter: 'answer',
      allowed: question.options.map((option) => option.id).join(','),
    });
  }
  return {
    data: {
      exerciseId: exercise.id,
      revision: WRITING_EXERCISE_REVISION,
      questionId,
      answer,
      correct: answer === question.correctOption,
      correctOption: question.correctOption,
      explanation: question.explanation,
      evidence: question.evidence,
    },
    meta: WRITING_EXERCISE_META,
  };
}

/** Versioned practice routes; JSON responses never include learner writing. */
export const writingPracticeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/practice/writing',
    versioned: true,
    summary: 'Original Academic Task 1 exercises with structured data and answer-free self-check questions.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/practice/writing/:id',
    versioned: true,
    summary: 'One original Task 1 exercise, its checklist, figure link and data-literacy questions.',
    handler: detail,
  },
  {
    method: 'GET',
    path: '/v1/practice/writing/:id/figure',
    versioned: true,
    summary: 'Accessible, self-contained SVG of the exercise data (not a JSON envelope).',
    handler: figure,
  },
  {
    method: 'GET',
    path: '/v1/practice/writing/:id/check',
    versioned: true,
    summary: 'Check one multiple-choice data-reading answer; returns evidence, never an IELTS band.',
    handler: check,
  },
];
