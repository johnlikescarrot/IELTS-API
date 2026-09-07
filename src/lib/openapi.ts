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
import { TASK_MODULES } from '../data/tasks.js';

import {
  REVIEW_DATE_SCHEMA,
  REVIEW_REQUEST_SCHEMAS,
  REVIEW_RESPONSE_SCHEMAS,
  REVIEW_SCHEMAS,
} from './reviewSchemas.js';

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
  '/v1/vocabulary/deck': [
    {
      name: 'seed',
      in: 'query',
      required: true,
      description: 'Use the same seed and filters on every page. Archive the API version too.',
      schema: { type: 'string', minLength: 1, maxLength: 128 },
    },
    {
      name: 'on',
      in: 'query',
      required: true,
      description: 'Initial due date for the unsaved cards.',
      schema: REVIEW_DATE_SCHEMA,
    },
    {
      name: 'volume',
      in: 'query',
      description: 'Comma-separated Cambridge volumes; union within this filter.',
      schema: { type: 'string', example: '1,2' },
    },
    {
      name: 'pos',
      in: 'query',
      description: 'Comma-separated parts of speech; combined with volume by intersection.',
      schema: { type: 'string', example: 'noun,verb' },
    },
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
    { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100000, default: 0 } },
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
  '/v1/vocabulary/collections/:id/words': [LIMIT, OFFSET],
  '/v1/vocabulary/review-queue': [
    { name: 'count', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
    { name: 'seed', in: 'query', schema: { type: 'string' } },
  ],
  '/v1/vocabulary/difficulty': [{ name: 'word', in: 'query', required: true, schema: { type: 'string' } }],
  '/v1/srs/schedule': [
    { name: 'reviewCount', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 0 } },
    { name: 'mastery', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100, default: 50 } },
    { name: 'quality', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 5, default: 4 } },
    { name: 'interval', in: 'query', schema: { type: 'number', minimum: 1, maximum: 365, default: 1 } },
    { name: 'repetitions', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 0 } },
    { name: 'easeFactor', in: 'query', schema: { type: 'number', minimum: 1.3, maximum: 5, default: 2.5 } },
    { name: 'leitnerBox', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5, default: 1 } },
    {
      name: 'leitnerCorrect',
      in: 'query',
      schema: { type: 'string', enum: ['true', 'false', '1', '0'], default: 'true' },
    },
    { name: 'method', in: 'query', schema: { type: 'string', enum: ['ebbinghaus', 'leitner', 'sm2'] } },
    { name: 'now', in: 'query', schema: { type: 'string', format: 'date-time' } },
  ],
  '/v1/srs/streak': [
    {
      name: 'dates',
      in: 'query',
      description: 'Comma-separated ISO dates (YYYY-MM-DD).',
      schema: { type: 'string' },
    },
  ],
  '/v1/srs/calendar': [
    { name: 'seed', in: 'query', schema: { type: 'string', default: 'ielts-api' } },
    { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 } },
    { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
  ],
  '/v1/srs/helpers': [
    { name: 'minutes', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1440 } },
    { name: 'elapsedDays', in: 'query', schema: { type: 'number', minimum: 0, maximum: 3650 } },
    { name: 'stabilityDays', in: 'query', schema: { type: 'number', minimum: 0.1, maximum: 3650 } },
    { name: 'errors', in: 'query', schema: { type: 'number', minimum: 1, maximum: 100 } },
    { name: 'daysSince', in: 'query', schema: { type: 'number', minimum: 0, maximum: 3650 } },
    { name: 'mastery', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
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
  required: ['status', 'data', 'meta'],
  properties: {
    status: { type: 'integer' },
    data: { type: 'null' },
    meta: {
      type: 'object',
      required: ['error', 'version'],
      properties: {
        version: { type: 'string' },
        error: {
          type: 'object',
          required: ['code', 'message', 'details'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
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
    const path = route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    const inputSchema = route.method === 'POST' ? REVIEW_REQUEST_SCHEMAS[route.path] : undefined;
    const dataSchema = REVIEW_RESPONSE_SCHEMAS[route.path];
    const envelope =
      dataSchema === undefined
        ? { $ref: '#/components/schemas/ApiResponse' }
        : {
            ...ENVELOPE,
            properties: { ...ENVELOPE.properties, data: { $ref: `#/components/schemas/${dataSchema}` } },
          };
    const operation = {
      operationId:
        route.path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') + (route.method === 'POST' ? '_post' : ''),
      summary: route.summary,
      tags: route.versioned ? ['v1'] : ['service'],
      parameters,
      ...(inputSchema === undefined
        ? {}
        : {
            requestBody: {
              required: true,
              description:
                'Uncompressed UTF-8 JSON, at most 262144 bytes, received within 10 seconds. No query inputs, authentication or server-side storage.',
              content: { 'application/json': { schema: { $ref: `#/components/schemas/${inputSchema}` } } },
            },
          }),
      responses: {
        '200': {
          description:
            route.method === 'POST'
              ? 'Computed result; Cache-Control: no-store. Save the returned state locally.'
              : 'Successful response.',
          content: { 'application/json': { schema: envelope } },
        },
        ...(route.method === 'GET'
          ? { '304': { description: 'Not modified (ETag matched).' } }
          : {
              '408': {
                description: 'JSON body upload timed out.',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
              },
              '413': {
                description: 'JSON body exceeds 262144 bytes.',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
              },
              '415': {
                description: 'Use uncompressed application/json with UTF-8.',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
              },
            }),
        '400': {
          description: 'Invalid inputs.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '404': {
          description: 'Not found.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '405': {
          description: 'Method not supported by this endpoint.',
          headers: { Allow: { schema: { type: 'string' }, description: 'Supported methods.' } },
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    };
    paths[path] = {
      ...((paths[path] as Record<string, JsonValue> | undefined) ?? {}),
      [route.method.toLowerCase()]: operation,
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
        '(readability and essay profile), composes study plans, and provides seeded',
        'vocabulary flashcards and stateless, client-owned SM-2 review scheduling.',
        'Companion GET tools retain 44 volume/thematic collections, difficulty heuristics,',
        'illustrative rehearsal-model comparisons, streaks and synthetic calendars.',
        '',
        'No API key, no registration, no rate limiting by key: every endpoint is open.',
      ].join('\n'),
      license: {
        name: 'MIT (code) / CC BY 4.0 (data)',
        url: 'https://github.com/johnlikescarrot/IELTS-API/blob/main/LICENSE',
      },
    },
    servers: [{ url: serverUrl, description: 'This instance' }],
    security: [],
    tags: [
      { name: 'v1', description: 'Versioned, stable endpoints.' },
      { name: 'service', description: 'Service discovery, health and documentation.' },
    ],
    paths,
    components: {
      schemas: { ApiResponse: ENVELOPE, ApiError: ERROR, ...REVIEW_SCHEMAS },
    },
    externalDocs: {
      description: 'Source code, citation metadata and data provenance',
      url: 'https://github.com/johnlikescarrot/IELTS-API',
    },
  };
}
