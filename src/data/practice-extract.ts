/** Deterministic, metadata-only inventory of a pinned public Git tree. */
import { createHash } from 'node:crypto';

import type {
  PracticeAsset,
  PracticeAssetRole,
  PracticeCatalog,
  PracticeCollection,
  PracticeCollectionId,
  PracticeItem,
  PracticeLevel,
  PracticeStats,
} from '../types.js';

/** Audited snapshot. A public repository is not a grant to reuse its content. */
export const PRACTICE_SOURCE = Object.freeze({
  repository: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
  commit: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
  tree: '52e6e832d6b3243205ebe3bb7fe901bbeca7f504',
  committedAt: '2026-07-03T02:16:52Z',
  license: 'not-specified',
  access: 'login-and-payment-described',
});

/** Collection IDs accepted by the API. */
export const PRACTICE_COLLECTION_IDS = [
  'listening-basic',
  'listening-tests',
  'reading-basic',
  'reading-tests',
] as const;
/** Source level labels accepted by the API; no IELTS/CEFR equivalence is inferred. */
export const PRACTICE_LEVELS = [
  'basic',
  'intermediate',
  'advanced',
  'a1-a2',
  'b1-b2',
  'c1-c2',
  'unspecified',
] as const;

const COLLECTIONS: PracticeCollection[] = [
  {
    id: 'listening-basic',
    name: 'Basic listening lessons',
    skill: 'listening',
    mode: 'lesson',
    expectedUnits: 102,
    requiredRoles: ['page', 'audio'],
  },
  {
    id: 'listening-tests',
    name: 'Listening full tests',
    skill: 'listening',
    mode: 'full-test',
    expectedUnits: 204,
    requiredRoles: ['page', 'questions', 'audio'],
  },
  {
    id: 'reading-basic',
    name: 'Level-labelled reading lessons',
    skill: 'reading',
    mode: 'lesson',
    expectedUnits: 1232,
    requiredRoles: ['questions'],
  },
  {
    id: 'reading-tests',
    name: 'Reading full tests',
    skill: 'reading',
    mode: 'full-test',
    expectedUnits: 315,
    requiredRoles: ['page', 'questions'],
  },
];
const NOTE =
  'Metadata only: upstream exercises, answers, scripts and media are not redistributed. No upstream content licence is specified; project documentation describes login and payment. Structural completeness is not a quality, accessibility or CEFR validation.';

type Blob = { path: string; sha: string; size: number; mode: string };
type Identity = {
  collection: PracticeCollectionId;
  level: PracticeLevel;
  sequence: number;
  sourcePath: string;
  role: PracticeAssetRole;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reject truncated, wrong-snapshot, malformed and ambiguous input before indexing. */
function parseTree(input: unknown): Blob[] {
  if (
    !isRecord(input) ||
    input.truncated !== false ||
    !Array.isArray(input.tree) ||
    (input.sha !== PRACTICE_SOURCE.commit && input.sha !== PRACTICE_SOURCE.tree)
  ) {
    throw new Error('Expected the complete, pinned upstream Git tree (truncated: false).');
  }
  const paths = new Set<string>();
  const blobs: Blob[] = [];
  for (const entry of input.tree) {
    if (
      !isRecord(entry) ||
      typeof entry.path !== 'string' ||
      entry.path.includes('\\') ||
      entry.path.split('/').some((part) => part === '' || part === '.' || part === '..')
    ) {
      throw new Error('Invalid Git tree entry path.');
    }
    if (paths.has(entry.path)) throw new Error(`Duplicate Git tree path: ${entry.path}`);
    paths.add(entry.path);
    if (entry.type === 'tree' || entry.type === 'commit') continue;
    if (
      entry.type !== 'blob' ||
      typeof entry.sha !== 'string' ||
      !/^[a-f0-9]{40}$/.test(entry.sha) ||
      typeof entry.size !== 'number' ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      !['100644', '100755', '120000'].includes(String(entry.mode))
    ) {
      throw new Error(`Invalid Git blob metadata: ${entry.path}`);
    }
    blobs.push({ path: entry.path, sha: entry.sha, size: entry.size, mode: String(entry.mode) });
  }
  // Code-point order, not environment-dependent locale sorting.
  return blobs.sort((a, b) => (a.path < b.path ? -1 : 1));
}

/** Match canonical paths only; templates, credentials and logs cannot become assets. */
function classify(path: string): Identity | undefined {
  const listening =
    /^(Listening_102_Basic\/(Basic|Intermediate|Advanced)\/Lesson_([1-9]\d*))\/(index\.html|audio\.mp3)$/.exec(
      path,
    );
  if (listening !== null) {
    return {
      collection: 'listening-basic',
      level: listening[2]!.toLowerCase() as PracticeLevel,
      sequence: Number(listening[3]),
      sourcePath: listening[1]!,
      role: listening[4] === 'index.html' ? 'page' : 'audio',
    };
  }
  const reading =
    /^(Reading_1232_Basic\/frontend\/data\/(A1-A2|B1-B2|C1-C2)\/lesson_(\d{3}))\.(json|js)$/.exec(path);
  if (reading !== null && Number(reading[3]) > 0) {
    return {
      collection: 'reading-basic',
      level: reading[2]!.toLowerCase() as PracticeLevel,
      sequence: Number(reading[3]),
      sourcePath: reading[1]!,
      role: reading[4] === 'json' ? 'questions' : 'data-script',
    };
  }
  const test = /^((Listening_204_FullTest|Reading_315_FullTest)\/Test_([1-9]\d*))\/(.+)$/.exec(path);
  if (test === null) return undefined;
  const sequence = Number(test[3]);
  const leaf = test[4]!;
  const roles: Record<string, PracticeAssetRole> = {
    [`Test_${sequence}.html`]: 'page',
    'index.html': 'page',
    [`Test_${sequence}.json`]: 'questions',
    [`Test_${sequence}_processed.json`]: 'processed-questions',
    [`audio_${sequence}.mp3`]: 'audio',
    [`Test_${sequence}.docx`]: 'document',
    'strategies.json': 'strategies',
  };
  const role = Object.hasOwn(roles, leaf)
    ? roles[leaf]
    : /^images\/image_\d+\.(png|webp) ?$/.test(leaf)
      ? 'image'
      : undefined;
  if (role === undefined) return undefined;
  return {
    collection: test[2] === 'Listening_204_FullTest' ? 'listening-tests' : 'reading-tests',
    level: 'unspecified',
    sequence,
    sourcePath: test[1]!,
    role,
  };
}

function tally(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of [...values].sort()) result[value] = (result[value] ?? 0) + 1;
  return result;
}

/** Hash the ordered, serialisable payload, excluding the self-referential metadata. */
export function practiceDigest(catalog: Pick<PracticeCatalog, 'collections' | 'stats' | 'items'>): string {
  return createHash('sha256')
    .update(JSON.stringify([catalog.collections, catalog.stats, catalog.items]), 'utf8')
    .digest('hex');
}

/** Build the practice inventory without fetching or executing any upstream content. */
export function extractPractice(input: unknown): PracticeCatalog {
  const blobs = parseTree(input);
  const units = new Map<string, PracticeItem>();
  for (const blob of blobs) {
    if (blob.mode === '120000') continue;
    const identity = classify(blob.path);
    if (identity === undefined) continue;
    if (!Number.isSafeInteger(identity.sequence)) throw new Error(`Unsafe unit sequence: ${blob.path}`);
    const collection = COLLECTIONS.find((candidate) => candidate.id === identity.collection)!;
    const suffix = identity.level === 'unspecified' ? '' : `${identity.level}-`;
    const id = `${identity.collection}-${suffix}${String(identity.sequence).padStart(4, '0')}`;
    let unit = units.get(id);
    if (unit === undefined) {
      unit = {
        id,
        collection: collection.id,
        skill: collection.skill,
        mode: collection.mode,
        level: identity.level,
        sequence: identity.sequence,
        sourcePath: identity.sourcePath,
        assets: [],
        missingRoles: [...collection.requiredRoles],
        structurallyComplete: false,
      };
      units.set(id, unit);
    }
    const asset: PracticeAsset = {
      path: blob.path,
      role: identity.role,
      sizeBytes: blob.size,
      sha1: blob.sha,
    };
    unit.assets.push(asset);
    unit.missingRoles = unit.missingRoles.filter((role) => role !== asset.role);
    unit.structurallyComplete = unit.missingRoles.length === 0;
  }
  const items = [...units.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const assets = items.flatMap((item) => item.assets);
  const blobCounts = Object.values(tally(assets.map((asset) => asset.sha1)));
  const completeUnits = items.filter((item) => item.structurallyComplete).length;
  const stats: PracticeStats = {
    repositoryFiles: blobs.length,
    repositoryBytes: blobs.reduce((sum, blob) => sum + blob.size, 0),
    indexedAssets: assets.length,
    indexedBytes: assets.reduce((sum, asset) => sum + asset.sizeBytes, 0),
    excludedFiles: blobs.length - assets.length,
    units: items.length,
    completeUnits,
    incompleteUnits: items.length - completeUnits,
    bySkill: tally(items.map((item) => item.skill)),
    byCollection: Object.fromEntries(
      COLLECTIONS.map((collection) => [
        collection.id,
        items.filter((item) => item.collection === collection.id).length,
      ]),
    ),
    byLevel: tally(items.map((item) => item.level)),
    byAssetRole: tally(assets.map((asset) => asset.role)),
    duplicateBlobGroups: blobCounts.filter((count) => count > 1).length,
    repeatedBlobReferences: blobCounts.reduce((sum, count) => sum + count - 1, 0),
  };
  const payload = { collections: structuredClone(COLLECTIONS), stats, items };
  return {
    meta: {
      schemaVersion: '1.0.0',
      generator: 'ielts-api/extract-practice-v1',
      source: { ...PRACTICE_SOURCE },
      metadataLicense: 'CC-BY-4.0',
      note: NOTE,
      contentSha256: practiceDigest(payload),
    },
    ...payload,
  };
}
