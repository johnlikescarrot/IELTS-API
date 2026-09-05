/**
 * OpenAPI 3.1 document generation.
 *
 * The document is generated from the live route table, so it can never drift
 * from the implementation: adding a route automatically documents it.
 */

import { CONVERSION_TARGETS } from '../data/conversions.js';
import { ESSAY_QUESTION_TYPES, WRITING_CATEGORIES } from '../data/topics.js';
import { PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { RESOURCE_TYPES } from '../data/resources.js';
import { TASK_MODULES } from '../data/tasks.js';
import {
  PRACTICE_ASSETS,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SKILLS,
} from '../data/practice-source.js';
import { READING_TASKS, LISTENING_TASKS } from '../data/receptive-tasks.js';
import {
  ENVELOPE_SCHEMA,
  ERROR_SCHEMA,
  PRACTICE_SOURCE_SCHEMA,
  PRACTICE_ASSET_SCHEMA,
  PRACTICE_UNIT_SCHEMA,
  PRACTICE_META_SCHEMA,
  PRACTICE_STATS_SCHEMA,
  PRACTICE_EXPORT_SCHEMA,
  RECEPTIVE_TASK_SCHEMA,
} from './schemas.js';

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

/** The same validated filters apply to practice search, sampling and JSON Lines export. */
const PRACTICE_FILTERS: JsonValue[] = [
  {
    ...QUERY,
    description: 'Case-insensitive substring over IDs, generated labels and paths (not exercise contents).',
    schema: { type: 'string', maxLength: 200 },
  },
  { name: 'skill', in: 'query', schema: { type: 'string', enum: [...PRACTICE_SKILLS] } },
  { name: 'mode', in: 'query', schema: { type: 'string', enum: [...PRACTICE_MODES] } },
  {
    name: 'level',
    in: 'query',
    description: 'Upstream directory label, not a calibrated proficiency level.',
    schema: { type: 'string', enum: [...PRACTICE_LEVELS] },
  },
  {
    name: 'asset',
    in: 'query',
    description: 'Require at least one asset of this kind; no asset content is returned.',
    schema: { type: 'string', enum: [...PRACTICE_ASSETS] },
  },
];

/** Query parameters per path. */
const PARAMETERS: Record<string, JsonValue[]> = {
  '/v1/practice': [
    ...PRACTICE_FILTERS,
    LIMIT,
    { ...OFFSET, schema: { type: 'integer', minimum: 0, maximum: 1000000, default: 0 } },
  ],
  '/v1/practice/sample': [
    ...PRACTICE_FILTERS,
    {
      name: 'seed',
      in: 'query',
      required: true,
      description: 'Required trimmed seed; reproduce with the same index checksum, filters and count.',
      schema: { type: 'string', minLength: 1, maxLength: 128 },
    },
    {
      name: 'count',
      in: 'query',
      description: 'Sample size, capped by the matching population; returned in canonical ID order.',
      schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
    },
  ],
  '/v1/practice/export': PRACTICE_FILTERS,
  '/v1/tasks/reading': [
    { ...QUERY, schema: { type: 'string', maxLength: 200 } },
    { name: 'type', in: 'query', schema: { type: 'string', enum: READING_TASKS.map((item) => item.id) } },
  ],
  '/v1/tasks/listening': [
    { ...QUERY, schema: { type: 'string', maxLength: 200 } },
    { name: 'type', in: 'query', schema: { type: 'string', enum: LISTENING_TASKS.map((item) => item.id) } },
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
    const path = route.path.replace(/:([^/]+)/g, '{$1}');
    const representation = route.response ?? { contentType: 'application/json', schema: ENVELOPE_SCHEMA };
    paths[path] = {
      get: {
        operationId: route.path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'root',
        summary: route.summary,
        tags: route.versioned ? ['v1'] : ['service'],
        parameters,
        responses: {
          '200': {
            description: 'Successful response.',
            content: { [representation.contentType]: { schema: representation.schema } },
          },
          '304': { description: 'Not modified (ETag matched).' },
          '405': {
            description: 'Method not allowed.',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '500': {
            description: 'Unexpected server error.',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '400': {
            description: 'Invalid parameters.',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '404': {
            description: 'Not found.',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
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
        'descriptors, score concordances, original task guidance for all four skills,',
        'and pinned, metadata-only corpus and Reading/Listening practice inventories.',
        'Metadata licensing does not grant rights to the indexed upstream contents.',
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
      schemas: {
        ApiResponse: ENVELOPE_SCHEMA,
        ApiError: ERROR_SCHEMA,
        PracticeSource: PRACTICE_SOURCE_SCHEMA,
        PracticeAsset: PRACTICE_ASSET_SCHEMA,
        PracticeUnit: PRACTICE_UNIT_SCHEMA,
        PracticeMeta: PRACTICE_META_SCHEMA,
        PracticeStats: PRACTICE_STATS_SCHEMA,
        PracticeExportRecord: PRACTICE_EXPORT_SCHEMA,
        ReceptiveTask: RECEPTIVE_TASK_SCHEMA,
      },
    },
    externalDocs: {
      description: 'Source code, citation metadata and data provenance',
      url: 'https://github.com/johnlikescarrot/IELTS-API',
    },
  };
}
