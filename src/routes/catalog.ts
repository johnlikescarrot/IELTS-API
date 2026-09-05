/**
 * Open practice content catalog routes (`/v1/catalog`).
 */

import {
  CATALOG_LICENSE_NOTE,
  CATALOG_UPSTREAM_REPOSITORY,
  CATALOG_COLLECTIONS,
  catalogTotals,
  findCollection,
  resolveEntry,
} from '../data/catalog.js';
import { badRequest, notFound } from '../lib/errors.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Collection summary without the raw availability ranges. */
function summarize(collectionId: string): HandlerResult {
  const collection = findCollection(collectionId);
  if (collection === undefined) {
    throw notFound(`Unknown catalog collection "${collectionId}".`, {
      parameter: 'collectionId',
      allowed: CATALOG_COLLECTIONS.map((entry) => entry.id).join(','),
    });
  }
  const available = collection.artifacts.map((artifact) => ({
    name: artifact.name,
    kind: artifact.kind,
    description: artifact.description,
    pathTemplate: artifact.pathTemplate,
    entriesAvailable: artifact.present.reduce((sum, [min, max]) => sum + (max - min + 1), 0),
  }));
  return {
    data: {
      id: collection.id,
      skill: collection.skill,
      tier: collection.tier,
      title: collection.title,
      description: collection.description,
      totalEntries: collection.totalEntries,
      levels: collection.levels,
      entryDirectory: collection.entryDirectory,
      artifacts: available,
      resolveEndpoint: `/v1/catalog/${collection.id}/entries/:index`,
    },
    meta: { upstream: CATALOG_UPSTREAM_REPOSITORY, licenseNote: CATALOG_LICENSE_NOTE },
  };
}

/** Resolve one entry (lesson or test) to concrete upstream file URLs. */
function entry(context: RouteContext): HandlerResult {
  const collectionId = context.params.collectionId as string;
  const rawIndex = context.params.index as string;
  const collection = findCollection(collectionId);
  if (collection === undefined) {
    throw notFound(`Unknown catalog collection "${collectionId}".`, {
      parameter: 'collectionId',
      allowed: CATALOG_COLLECTIONS.map((item) => item.id).join(','),
    });
  }
  if (!/^\d+$/.test(rawIndex)) {
    throw badRequest('Entry index must be a positive integer.', { parameter: 'index', received: rawIndex });
  }
  const resolved = resolveEntry(collection, Number.parseInt(rawIndex, 10));
  if (resolved === undefined) {
    throw notFound(
      `Entry ${rawIndex} is out of range for "${collectionId}" or has no file in the upstream repository.`,
      { parameter: 'index', totalEntries: String(collection.totalEntries) },
    );
  }
  return {
    data: resolved,
    meta: {
      upstream: CATALOG_UPSTREAM_REPOSITORY,
      licenseNote: CATALOG_LICENSE_NOTE,
      note: 'Fetch the rawUrl files directly from the upstream repository; this API serves metadata only.',
    },
  };
}

/** Catalog routes. */
export const catalogRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/catalog',
    versioned: true,
    summary: 'Index of the open community practice estate (102 + 204 listening, 1,232 + 315 reading items).',
    handler: () => ({
      data: CATALOG_COLLECTIONS.map((collection) => ({
        id: collection.id,
        skill: collection.skill,
        tier: collection.tier,
        title: collection.title,
        totalEntries: collection.totalEntries,
      })),
      meta: {
        ...catalogTotals(),
        upstream: CATALOG_UPSTREAM_REPOSITORY,
        licenseNote: CATALOG_LICENSE_NOTE,
      },
    }),
  },
  {
    method: 'GET',
    path: '/v1/catalog/:collectionId',
    versioned: true,
    summary: 'One catalog collection: layout, levels, artifact templates and availability counts.',
    handler: (context) => summarize(context.params.collectionId as string),
  },
  {
    method: 'GET',
    path: '/v1/catalog/:collectionId/entries/:index',
    versioned: true,
    summary: 'Resolve one lesson or test to validated upstream file URLs with per-artifact availability.',
    handler: entry,
  },
];
