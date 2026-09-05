/**
 * OpenAPI 3.1 document generation.
 *
 * The document is generated from the live route table, so it can never drift
 * from the implementation: adding a route automatically documents it.
 */

import { READING_LEVELS, READING_TOPICS } from '../data/reading.js';
import { READING_SCHEMAS } from './reading-openapi.js';
import { CONVERSION_TARGETS } from '../data/conversions.js';
import { ESSAY_QUESTION_TYPES, WRITING_CATEGORIES } from '../data/topics.js';
import { PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { RESOURCE_TYPES } from '../data/resources.js';
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

const READING_FILTERS = [
  QUERY,
  { name: 'level', in: 'query', schema: { type: 'string', enum: [...READING_LEVELS] } },
  { name: 'topic', in: 'query', schema: { type: 'string', enum: [...READING_TOPICS] } },
];

/** Query parameters per path. */
const PARAMETERS: Record<string, JsonValue[]> = {
  '/v1/reading': [...READING_FILTERS, LIMIT, { ...OFFSET, schema: { ...OFFSET.schema, maximum: 1000 } }],
  '/v1/reading/random': [
    ...READING_FILTERS,
    {
      name: 'seed',
      in: 'query',
      description: 'Reproducible within a dataset SHA-256; default is fixed.',
      schema: { type: 'string', default: 'ielts-api-reading' },
    },
    { name: 'count', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 6, default: 1 } },
  ],
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
  '/v1/tasks/writing': [{ name: 'module', in: 'query', schema: { type: 'string', enum: [...TASK_MODULES] } }],
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
  '/v1/resources': [
    QUERY,
    { name: 'type', in: 'query', schema: { type: 'string', enum: [...RESOURCE_TYPES] } },
    LIMIT,
    OFFSET,
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
    status: { type: 'integer', minimum: 400, maximum: 599 },
    data: { type: 'null' },
    meta: {
      type: 'object',
      required: ['version', 'error'],
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

const READING_RESPONSES: Record<string, JsonValue> = {
  '/v1/reading': { type: 'array', items: { $ref: '#/components/schemas/ReadingSummary' } },
  '/v1/reading/stats': { $ref: '#/components/schemas/ReadingStats' },
  '/v1/reading/random': { type: 'array', items: { $ref: '#/components/schemas/ReadingExercise' } },
  '/v1/reading/:id': { $ref: '#/components/schemas/ReadingExercise' },
  '/v1/reading/:id/grade': { $ref: '#/components/schemas/ReadingGrade' },
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
  const paths: Record<string, Record<string, JsonValue>> = {};
  for (const route of routes) {
    if (route.path === '/openapi.json' || route.path === '/docs') {
      continue;
    }
    const parameters = [...(PARAMETERS[route.path] ?? []), ...pathParameters(route.path)];
    const path = route.path.replace(/:([^/]+)/g, '{$1}');
    const method = route.method.toLowerCase();
    const isPost = route.method === 'POST';
    const responseSchema = {
      ...ENVELOPE,
      properties: { ...ENVELOPE.properties, data: READING_RESPONSES[route.path] ?? ENVELOPE.properties.data },
    };
    paths[path] ??= {};
    paths[path][method] = {
      operationId: `${method}_${route.path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
      summary: route.summary,
      tags: route.versioned ? ['v1'] : ['service'],
      parameters,
      ...(route.path === '/v1/reading/:id/grade'
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ReadingSubmission' },
                  example: {
                    answers: [
                      { questionId: 'q1', answer: 'B' },
                      { questionId: 'q5', answer: 'seven' },
                    ],
                  },
                },
              },
            },
          }
        : {}),
      responses: {
        '200': {
          description: 'Successful response.',
          content: { 'application/json': { schema: responseSchema } },
        },
        ...(isPost ? {} : { '304': { description: 'Not modified (ETag matched).' } }),
        '400': {
          description: 'Invalid parameters or JSON submission.',
          content: { 'application/json': { schema: ERROR } },
        },
        '404': { description: 'Not found.', content: { 'application/json': { schema: ERROR } } },
        '405': {
          description: 'Method not allowed; see the Allow header.',
          content: { 'application/json': { schema: ERROR } },
        },
        '500': {
          description: 'Unexpected server error.',
          content: { 'application/json': { schema: ERROR } },
        },
        ...(isPost
          ? {
              '408': {
                description: 'Request body deadline exceeded.',
                content: { 'application/json': { schema: ERROR } },
              },
              '413': {
                description: 'JSON body exceeds 16384 UTF-8 bytes.',
                content: { 'application/json': { schema: ERROR } },
              },
              '415': {
                description: 'Use uncompressed application/json with UTF-8 encoding.',
                content: { 'application/json': { schema: ERROR } },
              },
            }
          : {}),
      },
    };
  }

  return {
    openapi: '3.1.0',
    security: [],
    info: {
      title: 'IELTS API',
      version,
      summary: 'A free, no-authentication API for IELTS preparation research.',
      description: [
        'A free, open, no-authentication REST API for IELTS research and preparation.',
        '',
        'Datasets: Cambridge IELTS 1-22 vocabulary (4,174 headwords), analytic band',
        'descriptors, score concordances, Writing and Speaking task banks, and an index',
        'of the open IELTS research corpus, plus original reading exercises with stateless feedback.',
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
      schemas: { ApiResponse: ENVELOPE, ApiError: ERROR, ...READING_SCHEMAS },
    },
    externalDocs: {
      description: 'Source code, citation metadata and data provenance',
      url: 'https://github.com/johnlikescarrot/IELTS-API',
    },
  };
}
