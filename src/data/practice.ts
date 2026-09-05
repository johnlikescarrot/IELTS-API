/** Query the metadata-only Reading/Listening inventory, entirely offline at runtime. */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate } from '../lib/search.js';
import { seededIndices } from '../lib/rng.js';

import type { Page } from '../lib/search.js';
import type {
  PracticeAssetKind,
  PracticeIndex,
  PracticeLevel,
  PracticeMode,
  PracticeUnit,
  ReceptiveSkill,
} from '../types.js';

/** Optional practice filters, combined with AND semantics. */
export type PracticeFilter = {
  query?: string;
  skill?: ReceptiveSkill;
  mode?: PracticeMode;
  level?: PracticeLevel;
  asset?: PracticeAssetKind;
};

/** Explicit paging controls for the library API. */
export type PracticeQuery = PracticeFilter & { limit: number; offset: number };

/** Load the generated inventory lazily through the shared dataset cache. */
export function practiceIndex(): PracticeIndex {
  return loadDataset<PracticeIndex>('practice.json');
}

/** Return matching units in canonical ID order without mutating the inventory. */
function filteredUnits(options: PracticeFilter): PracticeUnit[] {
  return practiceIndex().items.filter(
    (item) =>
      (options.skill === undefined || item.skill === options.skill) &&
      (options.mode === undefined || item.mode === options.mode) &&
      (options.level === undefined || item.level === options.level) &&
      (options.asset === undefined || item.assets.some((asset) => asset.kind === options.asset)) &&
      matchesQuery([item.id, item.title, ...item.assets.map((asset) => asset.path)], options.query ?? ''),
  );
}

/** Search and paginate metadata; no upstream requests or authentication are performed. */
export function searchPractice(options: PracticeQuery): Page<PracticeUnit> {
  return paginate(filteredUnits(options), options.limit, options.offset);
}

/** Look up a stable collection/number ID, returning undefined for absent units. */
export function findPracticeUnit(id: string): PracticeUnit | undefined {
  return practiceIndex().items.find((item) => item.id === id);
}

/**
 * Sample distinct units from the filtered population and return them in canonical order.
 * Reproduction requires the same index checksum, filters, count and seed.
 */
export function samplePractice(options: PracticeFilter, seed: string, count: number): PracticeUnit[] {
  const items = filteredUnits(options);
  return seededIndices(`${practiceIndex().itemsSha256}:${seed}`, items.length, count).map(
    (index) => items[index] as PracticeUnit,
  );
}

/**
 * Export the full filtered population as JSON Lines (one self-describing record per unit).
 * Empty selections are represented by an empty string, not an invalid blank JSON record.
 */
export function exportPractice(options: PracticeFilter = {}): string {
  const index = practiceIndex();
  return filteredUnits(options)
    .map(
      (unit) =>
        `${JSON.stringify({
          schemaVersion: index.schemaVersion,
          source: index.source,
          metadataLicense: index.metadataLicense,
          indexSha256: index.itemsSha256,
          unit,
        })}\n`,
    )
    .join('');
}
