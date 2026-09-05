/** JSON Schema 2020-12 contracts shared by OpenAPI and live-response tests. */
import {
  PRACTICE_ASSETS,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SKILLS,
} from '../data/practice-source.js';
import type { JsonValue } from '../types.js';

const TEXT = { type: 'string' };
const SHA256 = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const ID = {
  type: 'string',
  pattern: '^(reading|listening)-(basic-(a1-a2|b1-b2|c1-c2|basic|intermediate|advanced)|full-test)-[0-9]{4}$',
};
const COUNT = { type: 'integer', minimum: 0 };

/** The standard response envelope; payload schemas are specialised per route. */
export const ENVELOPE_SCHEMA = {
  type: 'object',
  required: ['status', 'data', 'meta'],
  additionalProperties: false,
  properties: {
    status: { type: 'integer' },
    data: { description: 'The endpoint-specific payload.' },
    meta: { type: 'object', additionalProperties: true },
  },
};

/** Errors use the same envelope, with details inside meta.error and data set to null. */
export const ERROR_SCHEMA = {
  type: 'object',
  required: ['status', 'data', 'meta'],
  additionalProperties: false,
  properties: {
    status: { type: 'integer', minimum: 400, maximum: 599 },
    data: { type: 'null' },
    meta: {
      type: 'object',
      required: ['version', 'error'],
      properties: {
        version: TEXT,
        error: {
          type: 'object',
          required: ['code', 'message', 'details'],
          properties: {
            code: TEXT,
            message: TEXT,
            details: { type: 'object', additionalProperties: TEXT },
          },
        },
      },
    },
  },
};

/** Pinned source provenance with an explicit unknown licence. */
export const PRACTICE_SOURCE_SCHEMA = {
  type: 'object',
  required: ['repository', 'commit', 'license', 'contentIncluded'],
  additionalProperties: false,
  properties: {
    repository: { type: 'string', format: 'uri' },
    commit: { type: 'string', pattern: '^[a-f0-9]{40}$' },
    license: { type: 'null' },
    contentIncluded: { const: false },
  },
};

/** File metadata only; extra content fields are not permitted. */
export const PRACTICE_ASSET_SCHEMA = {
  type: 'object',
  required: ['kind', 'path', 'gitBlobSha', 'sizeBytes'],
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: [...PRACTICE_ASSETS] },
    path: TEXT,
    gitBlobSha: { type: 'string', pattern: '^[a-f0-9]{40}$' },
    sizeBytes: COUNT,
  },
};

/** Stable unit identity and its observed representations. */
export const PRACTICE_UNIT_SCHEMA = {
  type: 'object',
  required: ['id', 'title', 'collection', 'skill', 'mode', 'level', 'sequence', 'sourceUrl', 'assets'],
  additionalProperties: false,
  properties: {
    id: ID,
    title: TEXT,
    collection: TEXT,
    skill: { type: 'string', enum: [...PRACTICE_SKILLS] },
    mode: { type: 'string', enum: [...PRACTICE_MODES] },
    level: { type: 'string', enum: [...PRACTICE_LEVELS] },
    sequence: { type: 'integer', minimum: 1 },
    sourceUrl: { type: 'string', format: 'uri' },
    assets: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/PracticeAsset' } },
  },
};

/** Shared practice response metadata, including enough information to identify the index. */
export const PRACTICE_META_SCHEMA = {
  type: 'object',
  required: ['source', 'metadataLicense', 'indexSha256', 'filters', 'note', 'version', 'endpoint'],
  properties: {
    source: { $ref: '#/components/schemas/PracticeSource' },
    metadataLicense: { const: 'CC-BY-4.0' },
    indexSha256: SHA256,
    filters: { type: 'object', additionalProperties: TEXT },
    note: TEXT,
    version: TEXT,
    endpoint: TEXT,
  },
};

/** Closed count maps expose every declared facet to client generators. */
function counts(names: readonly string[]): JsonValue {
  return {
    type: 'object',
    required: [...names],
    additionalProperties: false,
    properties: Object.fromEntries(names.map((name) => [name, COUNT])),
  };
}

/** Structural completeness counts; these are not measures of exercise correctness. */
export const PRACTICE_STATS_SCHEMA = {
  type: 'object',
  required: [
    'units',
    'assets',
    'bySkill',
    'byMode',
    'byLevel',
    'unitsByAsset',
    'collections',
    'listeningWithoutAudio',
  ],
  additionalProperties: false,
  properties: {
    units: COUNT,
    assets: COUNT,
    bySkill: counts(PRACTICE_SKILLS),
    byMode: counts(PRACTICE_MODES),
    byLevel: counts(PRACTICE_LEVELS),
    unitsByAsset: counts(PRACTICE_ASSETS),
    collections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'declaredUnits', 'indexedUnits', 'missingSequences'],
        additionalProperties: false,
        properties: {
          id: TEXT,
          declaredUnits: COUNT,
          indexedUnits: COUNT,
          missingSequences: { type: 'array', uniqueItems: true, items: { type: 'integer', minimum: 1 } },
        },
      },
    },
    listeningWithoutAudio: { type: 'array', uniqueItems: true, items: ID },
  },
};

/** One self-contained JSON Lines record. */
export const PRACTICE_EXPORT_SCHEMA = {
  type: 'object',
  required: ['schemaVersion', 'source', 'metadataLicense', 'indexSha256', 'unit'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: 1 },
    source: { $ref: '#/components/schemas/PracticeSource' },
    metadataLicense: { const: 'CC-BY-4.0' },
    indexSha256: SHA256,
    unit: { $ref: '#/components/schemas/PracticeUnit' },
  },
};

/** Independently authored guidance with an official source reference. */
export const RECEPTIVE_TASK_SCHEMA = {
  type: 'object',
  required: ['id', 'skill', 'title', 'responseMode', 'focus', 'strategy', 'pitfall', 'sourceUrl'],
  additionalProperties: false,
  properties: {
    id: TEXT,
    skill: { type: 'string', enum: [...PRACTICE_SKILLS] },
    title: TEXT,
    responseMode: { type: 'string', enum: ['selection', 'text', 'mixed'] },
    focus: TEXT,
    strategy: { type: 'array', minItems: 1, items: TEXT },
    pitfall: TEXT,
    sourceUrl: { type: 'string', format: 'uri' },
  },
};

/** Specialise the shared envelope without allowing its shape to drift between routes. */
export function envelopeSchema(
  data: JsonValue,
  meta: JsonValue = ENVELOPE_SCHEMA.properties.meta,
): JsonValue {
  return { ...ENVELOPE_SCHEMA, properties: { ...ENVELOPE_SCHEMA.properties, data, meta } };
}
