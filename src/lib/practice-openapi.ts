/** JSON Schema 2020-12 contracts for the metadata-only practice endpoints. */

import {
  PRACTICE_AUDIO_STATUSES,
  PRACTICE_COLLECTION_IDS,
  PRACTICE_LEVELS,
  PRACTICE_MODES,
  PRACTICE_SAMPLING_ALGORITHM,
  PRACTICE_SKILLS,
} from '../data/practice-source.js';

import type { JsonValue } from '../types.js';

const text = { type: 'string' };
const count = { type: 'integer', minimum: 0 };
const sha1 = { type: 'string', pattern: '^[a-f0-9]{40}$' };
const sha256 = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const collection = { type: 'string', enum: [...PRACTICE_COLLECTION_IDS] };
const skill = { type: 'string', enum: [...PRACTICE_SKILLS] };
const mode = { type: 'string', enum: [...PRACTICE_MODES] };
const level = { type: 'string', enum: [...PRACTICE_LEVELS] };
const counts = { type: 'object', additionalProperties: count };
const itemList = { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/PracticeItem' } };
const collectionList = {
  type: 'array',
  maxItems: PRACTICE_COLLECTION_IDS.length,
  items: { $ref: '#/components/schemas/PracticeCollection' },
};
const baseMeta = { endpoint: text, version: text };
const provenance = { ...baseMeta, datasetSha256: sha256, sourceCommit: sha1, note: text };
const filters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: text,
    skill,
    collection,
    level,
    mode,
    audio: { type: 'string', enum: [...PRACTICE_AUDIO_STATUSES] },
  },
};

function object(properties: Record<string, JsonValue>): JsonValue {
  return { type: 'object', required: Object.keys(properties), properties };
}

function envelope(data: JsonValue, meta: JsonValue): JsonValue {
  return object({ status: { type: 'integer', const: 200 }, data, meta });
}

/** Reusable schemas referenced by the generated OpenAPI document. */
export const PRACTICE_SCHEMAS: Record<string, JsonValue> = {
  PracticeItem: object({
    id: text,
    collection,
    skill,
    mode,
    level,
    number: { type: 'integer', minimum: 1 },
    title: text,
    path: text,
    format: { type: 'string', enum: ['html', 'json'] },
    sizeBytes: count,
    sha1,
    sourceUrl: { type: 'string', format: 'uri' },
    audio: {
      type: 'string',
      enum: [...PRACTICE_AUDIO_STATUSES],
      description: 'Canonical regular companion file present in the tree; no playability or rights claim.',
    },
  }),
  PracticeCollection: object({
    id: collection,
    title: text,
    skill,
    mode,
    sourceDirectory: text,
    declaredItems: count,
    indexedItems: count,
    levels: { type: 'array', maxItems: PRACTICE_LEVELS.length, uniqueItems: true, items: level },
  }),
  PracticeManifest: object({
    schemaVersion: { type: 'integer', const: 1 },
    source: object({
      repository: { type: 'string', format: 'uri' },
      commit: sha1,
      treeSha: sha1,
      reviewedOn: { type: 'string', format: 'date' },
      contentLicense: { type: 'string', const: 'not-specified' },
      access: { type: 'string', const: 'may-require-login-or-payment' },
      note: text,
    }),
    rights: object({
      metadataLicense: { type: 'string', const: 'CC-BY-4.0' },
      contentIncluded: { type: 'boolean', const: false },
    }),
    integrity: object({
      algorithm: { type: 'string', const: 'sha256' },
      scope: { type: 'string', const: 'JSON.stringify(items)' },
      value: sha256,
    }),
    collections: collectionList,
    stats: object({
      repositoryFiles: count,
      indexedItems: count,
      byCollection: counts,
      bySkill: counts,
      byLevel: counts,
      byAudio: counts,
    }),
  }),
  PracticeManifestResponse: envelope({ $ref: '#/components/schemas/PracticeManifest' }, object(baseMeta)),
  PracticeCollectionsResponse: envelope(collectionList, object({ ...provenance, total: count })),
  PracticeItemResponse: envelope({ $ref: '#/components/schemas/PracticeItem' }, object(provenance)),
  PracticePageResponse: envelope(
    itemList,
    object({
      ...provenance,
      filters,
      total: count,
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      offset: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
      hasMore: { type: 'boolean' },
    }),
  ),
  PracticeSampleResponse: envelope(
    { ...itemList, maxItems: 50 },
    object({
      ...provenance,
      filters,
      seed: { type: 'string', minLength: 1, maxLength: 256 },
      requested: { type: 'integer', minimum: 1, maximum: 50 },
      returned: count,
      population: count,
      samplingAlgorithm: { type: 'string', const: PRACTICE_SAMPLING_ALGORITHM },
    }),
  ),
};

/** Per-route successful response schema references. */
export const PRACTICE_RESPONSES: Record<string, JsonValue> = {
  '/v1/practice': { $ref: '#/components/schemas/PracticeManifestResponse' },
  '/v1/practice/collections': { $ref: '#/components/schemas/PracticeCollectionsResponse' },
  '/v1/practice/items': { $ref: '#/components/schemas/PracticePageResponse' },
  '/v1/practice/items/:id': { $ref: '#/components/schemas/PracticeItemResponse' },
  '/v1/practice/sample': { $ref: '#/components/schemas/PracticeSampleResponse' },
};
