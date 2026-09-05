/** OpenAPI 3.1 / JSON Schema definitions for the metadata-only practice contract. */
import { PRACTICE_COLLECTION_IDS, PRACTICE_LEVELS } from '../data/practice-extract.js';
import type { JsonValue } from '../types.js';

const STRING = { type: 'string' };
const COUNT = { type: 'integer', minimum: 0 };
const COUNTS = { type: 'object', additionalProperties: COUNT };
const SKILL = { type: 'string', enum: ['listening', 'reading'] };
const MODE = { type: 'string', enum: ['lesson', 'full-test'] };
const COLLECTION = { type: 'string', enum: [...PRACTICE_COLLECTION_IDS] };
const ROLE = {
  type: 'string',
  enum: [
    'page',
    'questions',
    'processed-questions',
    'audio',
    'document',
    'data-script',
    'strategies',
    'image',
  ],
};
const ROLES = { type: 'array', maxItems: 8, items: ROLE, uniqueItems: true };
const SHA1 = { type: 'string', pattern: '^[a-f0-9]{40}$' };

/** Shared definitions referenced by the practice response schemas. */
// Export/asset bounds describe this pinned snapshot; update them with a new source snapshot.
export const PRACTICE_SCHEMAS: Record<string, JsonValue> = {
  PracticeAsset: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'role', 'sizeBytes', 'sha1'],
    properties: { path: STRING, role: ROLE, sizeBytes: COUNT, sha1: SHA1 },
  },
  PracticeItem: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'collection',
      'skill',
      'mode',
      'level',
      'sequence',
      'sourcePath',
      'assets',
      'missingRoles',
      'structurallyComplete',
    ],
    properties: {
      id: STRING,
      collection: COLLECTION,
      skill: SKILL,
      mode: MODE,
      level: { type: 'string', enum: [...PRACTICE_LEVELS] },
      sequence: { type: 'integer', minimum: 1 },
      sourcePath: STRING,
      assets: { type: 'array', maxItems: 8, items: { $ref: '#/components/schemas/PracticeAsset' } },
      missingRoles: ROLES,
      structurallyComplete: { type: 'boolean' },
    },
  },
  PracticeCollection: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'name', 'skill', 'mode', 'expectedUnits', 'requiredRoles'],
    properties: {
      id: COLLECTION,
      name: STRING,
      skill: SKILL,
      mode: MODE,
      expectedUnits: COUNT,
      requiredRoles: ROLES,
    },
  },
  PracticeStats: {
    type: 'object',
    additionalProperties: false,
    required: [
      'repositoryFiles',
      'repositoryBytes',
      'indexedAssets',
      'indexedBytes',
      'excludedFiles',
      'units',
      'completeUnits',
      'incompleteUnits',
      'bySkill',
      'byCollection',
      'byLevel',
      'byAssetRole',
      'duplicateBlobGroups',
      'repeatedBlobReferences',
    ],
    properties: {
      repositoryFiles: COUNT,
      repositoryBytes: COUNT,
      indexedAssets: COUNT,
      indexedBytes: COUNT,
      excludedFiles: COUNT,
      units: COUNT,
      completeUnits: COUNT,
      incompleteUnits: COUNT,
      bySkill: COUNTS,
      byCollection: COUNTS,
      byLevel: COUNTS,
      byAssetRole: COUNTS,
      duplicateBlobGroups: COUNT,
      repeatedBlobReferences: COUNT,
    },
  },
  PracticeMeta: {
    type: 'object',
    required: ['schemaVersion', 'generator', 'source', 'metadataLicense', 'note', 'contentSha256'],
    properties: {
      schemaVersion: STRING,
      generator: STRING,
      source: {
        type: 'object',
        additionalProperties: false,
        required: ['repository', 'commit', 'tree', 'committedAt', 'license', 'access'],
        properties: {
          repository: STRING,
          commit: SHA1,
          tree: SHA1,
          committedAt: STRING,
          license: STRING,
          access: STRING,
        },
      },
      metadataLicense: { const: 'CC-BY-4.0' },
      note: STRING,
      contentSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },
  PracticeCatalog: {
    type: 'object',
    additionalProperties: false,
    required: ['meta', 'collections', 'stats', 'items'],
    properties: {
      meta: { $ref: '#/components/schemas/PracticeMeta' },
      collections: { type: 'array', maxItems: 4, items: { $ref: '#/components/schemas/PracticeCollection' } },
      stats: { $ref: '#/components/schemas/PracticeStats' },
      items: { type: 'array', maxItems: 1852, items: { $ref: '#/components/schemas/PracticeItem' } },
    },
  },
};

function envelope(data: JsonValue): JsonValue {
  return {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      { properties: { data, meta: { $ref: '#/components/schemas/PracticeMeta' } } },
    ],
  };
}
const ITEM_LIST = { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/PracticeItem' } };

/** Actual successful response schemas, including the unwrapped archival export. */
export const PRACTICE_RESPONSES: Record<string, JsonValue> = {
  '/v1/practice': envelope({
    type: 'object',
    required: ['collections', 'stats'],
    properties: {
      collections: { type: 'array', maxItems: 4, items: { $ref: '#/components/schemas/PracticeCollection' } },
      stats: { $ref: '#/components/schemas/PracticeStats' },
    },
  }),
  '/v1/practice/stats': envelope({ $ref: '#/components/schemas/PracticeStats' }),
  '/v1/practice/items': envelope(ITEM_LIST),
  '/v1/practice/items/:id': envelope({ $ref: '#/components/schemas/PracticeItem' }),
  '/v1/practice/sample': envelope({ ...ITEM_LIST, maxItems: 50 }),
  '/v1/practice/export': { $ref: '#/components/schemas/PracticeCatalog' },
};
