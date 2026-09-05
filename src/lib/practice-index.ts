/**
 * Compile Git tree metadata, without fetching or copying any upstream content.
 *
 * Collection paths and filenames form an allowlist. A unit's identity is its
 * collection and original number, never its position in a sorted file list.
 */

import { createHash } from 'node:crypto';
import { PRACTICE_COLLECTIONS, PRACTICE_SOURCE } from '../data/practice-source.js';

import type { PracticeCollection } from '../data/practice-source.js';
import type { PracticeAssetKind, PracticeIndex, PracticeStats, PracticeUnit } from '../types.js';

const LAYOUTS = {
  'reading-basic': /^lesson_(\d{3})\.(json|js)$/,
  'listening-basic': /^Lesson_([1-9]\d*)\/(index\.html|audio\.mp3)$/,
  'full-test': /^Test_([1-9]\d*)\/([^/]+)$/,
};

/** Validate external JSON before reading any of its properties. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a Git tree object.');
  }
  return value as Record<string, unknown>;
}

/** Map only canonical file names to their descriptive role. */
function identify(
  path: string,
):
  | { collection: PracticeCollection; sequence: number; kind: PracticeAssetKind; directory: string }
  | undefined {
  const collection = PRACTICE_COLLECTIONS.find((candidate) => path.startsWith(`${candidate.directory}/`));
  if (collection === undefined) return undefined;
  const relative = path.slice(collection.directory.length + 1);
  const match = LAYOUTS[collection.layout].exec(relative);
  if (match === null) return undefined;
  const sequence = Number(match[1]);
  const basicNames = {
    'reading-basic': new Map<string, PracticeAssetKind>([
      ['json', 'json'],
      ['js', 'javascript'],
    ]),
    'listening-basic': new Map<string, PracticeAssetKind>([
      ['index.html', 'html'],
      ['audio.mp3', 'audio'],
    ]),
  };
  const names =
    collection.layout === 'full-test'
      ? new Map<string, PracticeAssetKind>([
          ['index.html', 'html'],
          ['strategies.json', 'strategy'],
          [`Test_${sequence}.json`, 'json'],
          [`Test_${sequence}_processed.json`, 'processed-json'],
          [`Test_${sequence}.html`, 'html'],
          [`Test_${sequence}.docx`, 'document'],
          [`audio_${sequence}.mp3`, 'audio'],
        ])
      : basicNames[collection.layout];
  const kind = names.get(match[2] as string);
  if (kind === undefined) return undefined;
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > collection.declaredUnits) {
    throw new Error(`Invalid unit number in ${path}.`);
  }
  const slash = relative.lastIndexOf('/');
  const directory = slash < 0 ? collection.directory : `${collection.directory}/${relative.slice(0, slash)}`;
  return { collection, sequence, kind, directory };
}

/** Calculate counts from the unit set, not the number of representations. */
function statistics(items: readonly PracticeUnit[]): PracticeStats {
  const stats: PracticeStats = {
    units: items.length,
    assets: 0,
    bySkill: { reading: 0, listening: 0 },
    byMode: { basic: 0, 'full-test': 0 },
    byLevel: { 'a1-a2': 0, 'b1-b2': 0, 'c1-c2': 0, basic: 0, intermediate: 0, advanced: 0, unspecified: 0 },
    unitsByAsset: {
      json: 0,
      javascript: 0,
      html: 0,
      audio: 0,
      document: 0,
      'processed-json': 0,
      strategy: 0,
    },
    collections: PRACTICE_COLLECTIONS.map((collection) => {
      const present = new Set(
        items.filter((item) => item.collection === collection.id).map((item) => item.sequence),
      );
      return {
        id: collection.id,
        declaredUnits: collection.declaredUnits,
        indexedUnits: present.size,
        missingSequences: Array.from({ length: collection.declaredUnits }, (_, index) => index + 1).filter(
          (sequence) => !present.has(sequence),
        ),
      };
    }),
    listeningWithoutAudio: [],
  };
  for (const item of items) {
    stats.assets += item.assets.length;
    stats.bySkill[item.skill] += 1;
    stats.byMode[item.mode] += 1;
    stats.byLevel[item.level] += 1;
    const kinds = new Set(item.assets.map((asset) => asset.kind));
    for (const kind of kinds) stats.unitsByAsset[kind] += 1;
    if (item.skill === 'listening' && !kinds.has('audio')) stats.listeningWithoutAudio.push(item.id);
  }
  return stats;
}

/**
 * Build a deterministic metadata index from the pinned, complete recursive tree.
 *
 * @param input - Untrusted JSON from GitHub's recursive Git tree endpoint.
 * @throws If the tree is truncated, unpinned, empty, or selected metadata is invalid.
 * @returns Original metadata compilation with an explicit upstream rights boundary.
 */
export function buildPracticeIndex(input: unknown): PracticeIndex {
  const tree = record(input);
  if (tree.sha !== PRACTICE_SOURCE.commit || tree.truncated !== false || !Array.isArray(tree.tree)) {
    throw new Error('Expected the complete, untruncated tree for the pinned practice commit.');
  }
  const units = new Map<string, PracticeUnit>();
  const paths = new Set<string>();
  for (const value of tree.tree) {
    const entry = record(value);
    if (typeof entry.path !== 'string') throw new Error('Git tree entry is missing a path.');
    if (entry.type !== 'blob') continue;
    const match = identify(entry.path);
    if (match === undefined) continue;
    if (
      typeof entry.sha !== 'string' ||
      !/^[a-f0-9]{40}$/.test(entry.sha) ||
      typeof entry.size !== 'number' ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      !['100644', '100755'].includes(String(entry.mode))
    ) {
      throw new Error(`Invalid regular-file metadata for ${entry.path}.`);
    }
    if (paths.has(entry.path)) throw new Error(`Duplicate path: ${entry.path}.`);
    paths.add(entry.path);
    const { collection, sequence, kind, directory } = match;
    const id = `${collection.id}-${String(sequence).padStart(4, '0')}`;
    let unit = units.get(id);
    if (unit === undefined) {
      unit = {
        id,
        title: `${collection.id.replace(/-/g, ' ')} ${sequence}`,
        collection: collection.id,
        skill: collection.skill,
        mode: collection.mode,
        level: collection.level,
        sequence,
        sourceUrl: `${PRACTICE_SOURCE.repository}/tree/${PRACTICE_SOURCE.commit}/${directory}`,
        assets: [],
      };
      units.set(id, unit);
    }
    unit.assets.push({ kind, path: entry.path, gitBlobSha: entry.sha, sizeBytes: entry.size });
  }
  if (units.size === 0) throw new Error('No practice units found in the pinned tree.');
  const items = [...units.keys()].sort().map((id) => units.get(id) as PracticeUnit);
  for (const item of items) {
    // All selected paths are ASCII. Default string sort is locale-independent.
    const assets = new Map(item.assets.map((asset) => [asset.path, asset]));
    item.assets = [...assets.keys()].sort().map((path) => assets.get(path) as PracticeUnit['assets'][number]);
  }
  return {
    schemaVersion: 1,
    source: { ...PRACTICE_SOURCE },
    metadataLicense: 'CC-BY-4.0',
    itemsSha256: createHash('sha256').update(JSON.stringify(items)).digest('hex'),
    stats: statistics(items),
    items,
  };
}
