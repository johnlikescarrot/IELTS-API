/**
 * OpenAPI 3.1 document generation.
 *
 * The document is generated from the live route table, so it can never drift
 * from the implementation: adding a route automatically documents it.
 */

import { CEFR_BANDS, PRACTICE_COLLECTIONS, PRACTICE_SKILLS } from '../data/practiceTests.js';
import { CONVERSION_TARGETS } from '../data/conversions.js';
import { FRAMEWORK_SECTIONS } from '../data/frameworks.js';
import { archiveFacets } from '../data/archive.js';
import { materialsFacets } from '../data/materials.js';
import {
  TESTCENTER_DIFFICULTIES,
  TESTCENTER_PAPERS,
  TESTCENTER_TAGGED_PAPERS,
  testcenterCatalogFacets,
  testcenterGroupFacets,
} from '../data/testcenter.js';
import { QUESTION_TYPE_FAMILIES, QUESTION_TYPE_IDS } from '../data/questionTypes.js';
import { THEME_GROUPS } from '../data/themes.js';
import { ESSAY_QUESTION_TYPES, WRITING_CATEGORIES } from '../data/topics.js';
import { PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { RESOURCE_TYPES } from '../data/resources.js';
import { SCHEDULER_IDS } from '../data/retention.js';
import { TASK_MODULES } from '../data/tasks.js';

import type { RouteDefinition } from './route.js';
import type { JsonValue } from '../types.js';

/** Shared page-size parameter. */
const LIMIT = {
  name: 'limit',
  in: 'query',
  description: 'Page size (1-100).',
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};
const OFFSET = {
  name: 'offset',
  in: 'query',
  description: 'Zero-based offset.',
  schema: { type: 'integer', minimum: 0, default: 0 },
};
const QUERY = { name: 'q', in: 'query', description: 'Free-text search.', schema: { type: 'string' } };

const SCHEDULER = {
  name: 'scheduler',
  in: 'query',
  required: true,
  description: 'Review scheduler to use.',
  schema: { type: 'string', enum: [...SCHEDULER_IDS] },
};
const START = {
  name: 'start',
  in: 'query',
  description: 'ISO date (YYYY-MM-DD) the item was first learned. Defaults to today.',
  schema: { type: 'string', format: 'date' },
};
const QUALITY = {
  name: 'quality',
  in: 'query',
  description: 'Grade applied to every review, on the SM-2 0-5 scale.',
  schema: { type: 'integer', minimum: 0, maximum: 5, default: 5 },
};
const HORIZON = {
  name: 'horizonDays',
  in: 'query',
  description: 'Length of the projection, in days.',
};
const TARGET_RECALL = {
  name: 'targetRecall',
  in: 'query',
  description: 'Recall probability the half-life scheduler schedules at.',
  schema: { type: 'number', minimum: 0.5, maximum: 0.99, default: 0.9 },
};

/** Query parameters per path. */
const PARAMETERS: Record<string, JsonValue[]> = {
  '/v1/vocabulary': [
    QUERY,
    {
      name: 'match',
      in: 'query',
      description: 'How `q` is matched against the dataset.',
      schema: { type: 'string', enum: ['contains', 'prefix', 'exact'], default: 'contains' },
    },
    {
      name: 'volume',
      in: 'query',
      description: 'Comma-separated Cambridge IELTS volumes (1-22).',
      schema: { type: 'string', example: '10,11,12' },
    },
    {
      name: 'pos',
      in: 'query',
      description: 'Comma-separated parts of speech.',
      schema: { type: 'string', enum: [...PARTS_OF_SPEECH] },
    },
    {
      name: 'sort',
      in: 'query',
      description: 'Sort key.',
      schema: { type: 'string', enum: ['word', 'length', 'volumes', 'senses'], default: 'word' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/vocabulary/random': [
    { name: 'count', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
    {
      name: 'seed',
      in: 'query',
      description: 'Seed; identical seeds return identical samples.',
      schema: { type: 'string' },
    },
  ],
  '/v1/vocabulary/daily': [
    {
      name: 'date',
      in: 'query',
      description: 'ISO date (YYYY-MM-DD). Defaults to today.',
      schema: { type: 'string', format: 'date' },
    },
    { name: 'count', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10, default: 1 } },
  ],
  '/v1/bands/descriptors': [
    {
      name: 'set',
      in: 'query',
      schema: { type: 'string', enum: ['speaking', 'writing-task-1', 'writing-task-2'], default: 'speaking' },
    },
    {
      name: 'criterion',
      in: 'query',
      schema: {
        type: 'string',
        enum: [
          'fluencyAndCoherence',
          'lexicalResource',
          'grammaticalRangeAndAccuracy',
          'pronunciation',
          'taskAchievement',
          'taskResponse',
          'coherenceAndCohesion',
        ],
      },
    },
    { name: 'band', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 9 } },
  ],
  '/v1/scores/overall': ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({
    name: skill,
    in: 'query',
    required: true,
    description: `Band score for ${skill} (0-9 in 0.5 steps).`,
    schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
  })),
  '/v1/scores/convert': [
    {
      name: 'band',
      in: 'query',
      required: true,
      schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
    },
    { name: 'to', in: 'query', required: true, schema: { type: 'string', enum: [...CONVERSION_TARGETS] } },
  ],
  '/v1/scores/interpret': [
    { name: 'scale', in: 'query', required: true, schema: { type: 'string', enum: [...CONVERSION_TARGETS] } },
    { name: 'score', in: 'query', required: true, schema: { type: 'number' } },
  ],
  '/v1/topics/writing': [
    QUERY,
    { name: 'category', in: 'query', schema: { type: 'string', enum: [...WRITING_CATEGORIES] } },
    { name: 'type', in: 'query', schema: { type: 'string', enum: [...ESSAY_QUESTION_TYPES] } },
    LIMIT,
    OFFSET,
  ],
  '/v1/topics/speaking': [
    QUERY,
    { name: 'part', in: 'query', schema: { type: 'integer', enum: [1, 2, 3] } },
    LIMIT,
    OFFSET,
  ],
  '/v1/topics/themes': [
    QUERY,
    { name: 'group', in: 'query', schema: { type: 'string', enum: [...THEME_GROUPS] } },
    {
      name: 'skill',
      in: 'query',
      schema: { type: 'string', enum: ['listening', 'reading', 'writing', 'speaking'] },
    },
  ],
  '/v1/tasks/writing': [{ name: 'module', in: 'query', schema: { type: 'string', enum: [...TASK_MODULES] } }],
  '/v1/question-types': [
    QUERY,
    { name: 'skill', in: 'query', schema: { type: 'string', enum: [...PRACTICE_SKILLS] } },
    { name: 'family', in: 'query', schema: { type: 'string', enum: [...QUESTION_TYPE_FAMILIES] } },
  ],
  '/v1/frameworks': [
    QUERY,
    { name: 'section', in: 'query', schema: { type: 'string', enum: [...FRAMEWORK_SECTIONS] } },
    { name: 'skill', in: 'query', schema: { type: 'string', enum: ['writing', 'speaking'] } },
    {
      name: 'type',
      in: 'query',
      description: 'Essay question family.',
      schema: { type: 'string', enum: [...ESSAY_QUESTION_TYPES] },
    },
    {
      name: 'part',
      in: 'query',
      description: 'Speaking part.',
      schema: { type: 'integer', enum: [1, 2, 3] },
    },
  ],
  '/v1/tests/items': [
    QUERY,
    {
      name: 'collection',
      in: 'query',
      description: 'Comma-separated collections.',
      schema: { type: 'string', enum: [...PRACTICE_COLLECTIONS] },
    },
    {
      name: 'skill',
      in: 'query',
      description: 'Comma-separated skills.',
      schema: { type: 'string', enum: [...PRACTICE_SKILLS] },
    },
    {
      name: 'level',
      in: 'query',
      description: 'Comma-separated CEFR bands.',
      schema: { type: 'string', enum: CEFR_BANDS.map((band) => band.toLowerCase()) },
    },
    {
      name: 'type',
      in: 'query',
      description: 'Comma-separated canonical question types; items must contain all of them.',
      schema: { type: 'string', enum: [...QUESTION_TYPE_IDS] },
    },
    { name: 'minQuestions', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 1000 } },
    { name: 'maxQuestions', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 1000 } },
    {
      name: 'minReadingEase',
      in: 'query',
      description: 'Minimum Flesch Reading Ease; drops items without a written passage.',
      schema: { type: 'number' },
    },
    { name: 'maxReadingEase', in: 'query', schema: { type: 'number' } },
    { name: 'audio', in: 'query', schema: { type: 'boolean', default: false } },
    {
      name: 'sort',
      in: 'query',
      schema: {
        type: 'string',
        enum: ['id', 'title', 'questions', 'words', 'reading-ease', 'grade'],
        default: 'id',
      },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/corpus/items': [
    QUERY,
    { name: 'category', in: 'query', schema: { type: 'string' } },
    { name: 'skill', in: 'query', schema: { type: 'string' } },
    { name: 'format', in: 'query', schema: { type: 'string' } },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string', enum: ['title', 'category', 'skill', 'size'], default: 'title' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/materials/items': [
    QUERY,
    { name: 'category', in: 'query', schema: { type: 'string', enum: materialsFacets('category') } },
    { name: 'skill', in: 'query', schema: { type: 'string', enum: materialsFacets('skill') } },
    { name: 'format', in: 'query', schema: { type: 'string', enum: materialsFacets('format') } },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string', enum: ['title', 'category', 'skill', 'size'], default: 'title' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/resources': [
    QUERY,
    { name: 'type', in: 'query', schema: { type: 'string', enum: [...RESOURCE_TYPES] } },
    LIMIT,
    OFFSET,
  ],
  '/v1/archive/items': [
    QUERY,
    { name: 'collection', in: 'query', schema: { type: 'string', enum: archiveFacets('collection') } },
    { name: 'format', in: 'query', schema: { type: 'string', enum: archiveFacets('format') } },
    { name: 'media', in: 'query', schema: { type: 'string', enum: archiveFacets('media') } },
    { name: 'skill', in: 'query', schema: { type: 'string', enum: archiveFacets('skill') } },
    {
      name: 'volume',
      in: 'query',
      description: 'Restrict to one Cambridge IELTS volume (1-18).',
      schema: { type: 'integer', minimum: 1, maximum: 18 },
    },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string', enum: ['title', 'collection', 'volume', 'date', 'size'], default: 'title' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/testcenter/catalog': [
    QUERY,
    { name: 'zone', in: 'query', schema: { type: 'string', enum: testcenterCatalogFacets('zone') } },
    {
      name: 'subject',
      in: 'query',
      schema: { type: 'string', enum: testcenterCatalogFacets('subject') },
    },
    { name: 'paper', in: 'query', schema: { type: 'string', enum: [...TESTCENTER_PAPERS] } },
    {
      name: 'volume',
      in: 'query',
      description: 'Restrict to one Cambridge IELTS volume (3-21).',
      schema: { type: 'integer', minimum: 3, maximum: 21 },
    },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string', enum: ['title', 'subject', 'duration', 'added'], default: 'title' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/testcenter/groups': [
    QUERY,
    {
      name: 'paper',
      in: 'query',
      schema: { type: 'string', enum: [...TESTCENTER_TAGGED_PAPERS] },
    },
    { name: 'type', in: 'query', schema: { type: 'string', enum: [...QUESTION_TYPE_IDS] } },
    {
      name: 'scene',
      in: 'query',
      description: 'Teaching-scene slug from `/v1/testcenter/scenes`.',
      schema: { type: 'string', enum: testcenterGroupFacets('scene') },
    },
    {
      name: 'difficulty',
      in: 'query',
      schema: { type: 'string', enum: [...TESTCENTER_DIFFICULTIES] },
    },
    {
      name: 'volume',
      in: 'query',
      description: 'Restrict to one Cambridge IELTS volume (3-21).',
      schema: { type: 'integer', minimum: 3, maximum: 21 },
    },
    {
      name: 'test',
      in: 'query',
      description: 'Restrict to one Cambridge test number (1-4).',
      schema: { type: 'integer', minimum: 1, maximum: 4 },
    },
    {
      name: 'sort',
      in: 'query',
      schema: { type: 'string', enum: ['volume', 'questions', 'type', 'scene'], default: 'volume' },
    },
    { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
    LIMIT,
    OFFSET,
  ],
  '/v1/testcenter/scoring': [
    {
      name: 'paper',
      in: 'query',
      description: 'Tagged paper whose calibration to return; required with `raw`.',
      schema: { type: 'string', enum: [...TESTCENTER_TAGGED_PAPERS] },
    },
    {
      name: 'raw',
      in: 'query',
      description: 'Raw score (any integer); with `paper`, looks the band up.',
      schema: { type: 'integer', minimum: 0, maximum: 40 },
    },
  ],
  '/v1/testcenter/drill': [
    {
      name: 'paper',
      in: 'query',
      required: true,
      description: 'Tagged paper to compose the drill from.',
      schema: { type: 'string', enum: [...TESTCENTER_TAGGED_PAPERS] },
    },
    { name: 'type', in: 'query', schema: { type: 'string', enum: [...QUESTION_TYPE_IDS] } },
    {
      name: 'scene',
      in: 'query',
      description: 'Teaching-scene slug from `/v1/testcenter/scenes`.',
      schema: { type: 'string', enum: testcenterGroupFacets('scene') },
    },
    {
      name: 'difficulty',
      in: 'query',
      schema: { type: 'string', enum: [...TESTCENTER_DIFFICULTIES] },
    },
    {
      name: 'volume',
      in: 'query',
      description: 'Restrict the selection to one Cambridge volume (3-21).',
      schema: { type: 'integer', minimum: 3, maximum: 21 },
    },
    {
      name: 'test',
      in: 'query',
      description: 'Restrict the selection to one Cambridge test number (1-4).',
      schema: { type: 'integer', minimum: 1, maximum: 4 },
    },
    {
      name: 'questions',
      in: 'query',
      description: 'Question budget to fill; the last group may overshoot.',
      schema: { type: 'integer', minimum: 1, maximum: 40, default: 10 },
    },
    {
      name: 'minutes',
      in: 'query',
      description: 'Explicit time budget in minutes (1-180); defaults to the pacing estimate.',
      schema: { type: 'integer', minimum: 1, maximum: 180 },
    },
  ],
  '/v1/tools/readability': [
    {
      name: 'text',
      in: 'query',
      required: true,
      description: 'Text to analyse; at most 4,000 characters and at least one alphabetic word.',
      schema: { type: 'string' },
    },
  ],
  '/v1/tools/essay-profile': [
    {
      name: 'text',
      in: 'query',
      required: true,
      description: 'Writing sample to analyse; at most 4,000 characters and at least one alphabetic word.',
      schema: { type: 'string' },
    },
    { name: 'task', in: 'query', schema: { type: 'string', enum: ['task1', 'task2'], default: 'task2' } },
    {
      name: 'limit',
      in: 'query',
      description: 'Maximum detected themes to report.',
      schema: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
  ],
  '/v1/retention/curve': [
    {
      name: 'minutes',
      in: 'query',
      description: "Evaluate Ebbinghaus's 1885 equation at this lag, in minutes.",
      schema: { type: 'number', minimum: 1, maximum: 5256000 },
    },
  ],
  '/v1/retention/schedulers': [
    {
      name: 'provenance',
      in: 'query',
      description: 'Filter by how well sourced the intervals are.',
      schema: {
        type: 'string',
        enum: ['published-algorithm', 'published-schedule', 'folk-pedagogical'],
      },
    },
  ],
  '/v1/retention/schedule': [
    SCHEDULER,
    START,
    QUALITY,
    { ...HORIZON, schema: { type: 'integer', minimum: 1, maximum: 3650, default: 365 } },
    {
      name: 'maxReviews',
      in: 'query',
      description: 'Hard cap on the number of reviews returned.',
      schema: { type: 'integer', minimum: 1, maximum: 200, default: 200 },
    },
    TARGET_RECALL,
  ],
  '/v1/retention/grade': [
    SCHEDULER,
    {
      name: 'quality',
      in: 'query',
      required: true,
      description: 'Grade on the SM-2 0-5 scale; 3 is the lowest passing grade.',
      schema: { type: 'integer', minimum: 0, maximum: 5 },
    },
    {
      name: 'repetitions',
      in: 'query',
      description: 'Successful reviews before this one.',
      schema: { type: 'integer', minimum: 0, maximum: 1000, default: 0 },
    },
    {
      name: 'lapses',
      in: 'query',
      description: 'Failed reviews before this one.',
      schema: { type: 'integer', minimum: 0, maximum: 1000, default: 0 },
    },
    {
      name: 'previousIntervalSeconds',
      in: 'query',
      description: 'Interval that preceded this review, needed by SM-2 beyond its second review.',
      schema: { type: 'integer', minimum: 0, maximum: 315360000, default: 0 },
    },
    {
      name: 'easeFactor',
      in: 'query',
      description: 'SM-2 easiness factor before this review.',
      schema: { type: 'number', minimum: 1.3, maximum: 5, default: 2.5 },
    },
    TARGET_RECALL,
  ],
  '/v1/retention/compare': [
    START,
    QUALITY,
    { ...HORIZON, schema: { type: 'integer', minimum: 1, maximum: 3650, default: 365 } },
    {
      name: 'maxReviews',
      in: 'query',
      description: 'Hard cap on the number of reviews rolled forward per scheduler.',
      schema: { type: 'integer', minimum: 1, maximum: 500, default: 500 },
    },
    TARGET_RECALL,
  ],
  '/v1/retention/workload': [
    SCHEDULER,
    QUALITY,
    {
      name: 'wordsPerDay',
      in: 'query',
      description: 'New headwords introduced every day.',
      schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
    },
    { ...HORIZON, schema: { type: 'integer', minimum: 7, maximum: 730, default: 365 } },
    TARGET_RECALL,
  ],
  '/v1/study/plan': [
    {
      name: 'target',
      in: 'query',
      required: true,
      description: 'Target overall band.',
      schema: { type: 'number', minimum: 4, maximum: 9, multipleOf: 0.5 },
    },
    {
      name: 'listening',
      in: 'query',
      description: 'Current listening band; defaults to target − 1.5.',
      schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
    },
    {
      name: 'reading',
      in: 'query',
      description: 'Current reading band; defaults to target − 1.5.',
      schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
    },
    {
      name: 'writing',
      in: 'query',
      description: 'Current writing band; defaults to target − 1.5.',
      schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
    },
    {
      name: 'speaking',
      in: 'query',
      description: 'Current speaking band; defaults to target − 1.5.',
      schema: { type: 'number', minimum: 0, maximum: 9, multipleOf: 0.5 },
    },
    {
      name: 'weeks',
      in: 'query',
      description: 'Plan length in weeks.',
      schema: { type: 'integer', minimum: 1, maximum: 52, default: 8 },
    },
    {
      name: 'hoursPerWeek',
      in: 'query',
      description: 'Study hours available per week.',
      schema: { type: 'number', minimum: 1, maximum: 80, default: 10 },
    },
    {
      name: 'wordsPerDay',
      in: 'query',
      description: 'New headwords to learn per day.',
      schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
  ],
};

/** The shared JSON envelope schema. */
const ENVELOPE = {
  type: 'object',
  required: ['status', 'data', 'meta'],
  properties: {
    status: { type: 'integer' },
    data: { description: 'Response payload: an array for collections, an object for singletons.' },
    meta: { type: 'object', additionalProperties: true },
  },
};

const ERROR = {
  type: 'object',
  required: ['status', 'error'],
  properties: {
    status: { type: 'integer' },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

/** Path parameters, e.g. `:word` in `/v1/vocabulary/:word`. */
function pathParameters(path: string): JsonValue[] {
  return path
    .split('/')
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => ({
      name: segment.slice(1),
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
}

/**
 * Build the OpenAPI 3.1 document for the running service.
 *
 * @param routes - Live route table.
 * @param serverUrl - Base URL advertised in the document.
 * @param version - API version string.
 */
export function openApiDocument(
  routes: readonly RouteDefinition[],
  serverUrl: string,
  version: string,
): JsonValue {
  const paths: Record<string, JsonValue> = {};
  for (const route of routes) {
    if (route.path === '/openapi.json' || route.path === '/docs') {
      continue;
    }
    const parameters = [...(PARAMETERS[route.path] ?? []), ...pathParameters(route.path)];
    paths[route.path] = {
      get: {
        operationId: route.path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, ''),
        summary: route.summary,
        tags: route.versioned ? ['v1'] : ['service'],
        parameters,
        responses: {
          '200': {
            description: 'Successful response.',
            content: { 'application/json': { schema: ENVELOPE } },
          },
          '304': { description: 'Not modified (ETag matched).' },
          '400': {
            description: 'Invalid parameters.',
            content: { 'application/json': { schema: ERROR } },
          },
          '404': {
            description: 'Not found.',
            content: { 'application/json': { schema: ERROR } },
          },
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'IELTS API',
      version,
      summary: 'A free, no-authentication API for IELTS preparation research.',
      description: [
        'A free, open, no-authentication REST API for IELTS research and preparation.',
        '',
        'Datasets: Cambridge IELTS 1-22 vocabulary (4,174 headwords), analytic band',
        'descriptors, score concordances, Writing and Speaking task banks, a canonical',
        'question-type taxonomy with observed frequencies, response frameworks for the',
        'productive papers, a structure and readability index of 1,702 practice tests,',
        'an index of the open IELTS research corpus, an index of a 2,385-file',
        'self-study materials collection, and a mock-exam test-centre index with the',
        'Cambridge 4-21 holdings, 1,099 hand-tagged question groups and a production',
        'raw-score-to-band calibration. The toolkit additionally scores any text',
        '(readability and essay profile) and composes the datasets into study plans.',
        '',
        'No API key, no registration, no rate limiting by key: every endpoint is open.',
      ].join('\n'),
      license: {
        name: 'MIT (code) / CC BY 4.0 (data)',
        url: 'https://github.com/johnlikescarrot/IELTS-API/blob/main/LICENSE',
      },
    },
    servers: [{ url: serverUrl, description: 'This instance' }],
    tags: [
      { name: 'v1', description: 'Versioned, stable endpoints.' },
      { name: 'service', description: 'Service discovery, health and documentation.' },
    ],
    paths,
    components: {
      schemas: { ApiResponse: ENVELOPE, ApiError: ERROR },
    },
    externalDocs: {
      description: 'Source code, citation metadata and data provenance',
      url: 'https://github.com/johnlikescarrot/IELTS-API',
    },
  };
}
