/**
 * Dataset provenance routes (`/v1/datasets`).
 *
 * These endpoints answer the question a reviewer asks about any cited API
 * response: which dataset produced this number, where did that dataset come
 * from, under what licence is it published, and is the file on the server the
 * same file the author cited? The last question is answered with a SHA-256
 * digest of the JSON file the running process loaded.
 */

import { DATASET_IDS, datasetRecord, datasetRecords } from '../data/provenance.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';
import { CODE_LICENSE, DATA_LICENSE } from '../version.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { DatasetRecord } from '../types.js';

/** How a dataset was produced. */
const DERIVATIONS = ['extracted', 'original', 'compiled'] as const;

/** List every dataset with its provenance. */
function list(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const derivation = getEnum(params, 'derivation', DERIVATIONS);
  const query = getString(params, 'q') ?? '';
  const records = datasetRecords().filter((record: DatasetRecord) => {
    if (derivation !== undefined && record.derivation !== derivation) {
      return false;
    }
    return query.length === 0 || matchesQuery([record.id, record.name, record.description], query);
  });
  return {
    data: records,
    meta: {
      count: records.length,
      total: DATASET_IDS.length,
      derivation: derivation ?? null,
      derivations: DERIVATIONS,
      licenses: { code: CODE_LICENSE, data: DATA_LICENSE },
      digest:
        'sha256 and sizeBytes are computed from the dataset file loaded by this process, so a response can be verified against an archived copy.',
      note: 'Datasets marked "extracted" publish derived, non-substitutive metadata only; no upstream content is redistributed.',
    },
  };
}

/** One dataset provenance record. */
function detail(context: RouteContext): HandlerResult {
  const id = (context.params['id'] as string).toLowerCase();
  const record = datasetRecord(id);
  if (record === undefined) {
    throw notFound(`No dataset with id "${id}".`, { id, known: DATASET_IDS.join(',') });
  }
  return { data: record, meta: { licenses: { code: CODE_LICENSE, data: DATA_LICENSE } } };
}

/** Dataset provenance routes. */
export const datasetRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/datasets',
    versioned: true,
    summary: 'Provenance, licence, record count and file digest for every published dataset.',
    handler: list,
  },
  {
    method: 'GET',
    path: '/v1/datasets/:id',
    versioned: true,
    summary: 'Provenance record for one dataset.',
    handler: detail,
  },
];
