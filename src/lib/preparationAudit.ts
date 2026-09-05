/**
 * Reproducible, metadata-only audit of the pinned msneloy/IELTS source tree.
 *
 * This module performs no networking and never reads, republishes or assigns
 * a licence to upstream content. Classification is over paths and extensions,
 * not an assertion about the pedagogical quality or rights of any file.
 */

import { createHash } from 'node:crypto';
import { extname } from 'node:path/posix';

/** Exact upstream commit inspected for the Task 1 design. */
export const PREPARATION_COMMIT = 'db1064c36b6435b8a23adaf8e74c858476c38812';

/** Git tree object referenced by the pinned commit (not the commit object itself). */
export const PREPARATION_TREE = '1a4de7132e4e0a7e63908f322bbb177393841d63';

type Entry = { path: string; type: 'blob' | 'tree'; sha: string; sizeBytes: number };
type Counts = { files: number; bytes: number };

/** Complete manifest accounting; source contents are deliberately absent. */
export type PreparationAudit = {
  repository: string;
  commit: string;
  tree: string;
  methodVersion: string;
  manifestSha256: string;
  files: number;
  bytes: number;
  directories: number;
  uniqueBlobs: number;
  duplicateFiles: number;
  byFormat: Record<string, Counts>;
  bySection: Record<string, Counts>;
  byRole: Record<string, Counts>;
  note: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a GitHub tree object.');
  }
  return value as Record<string, unknown>;
}

function parseEntry(value: unknown): Entry {
  const entry = asRecord(value);
  if (typeof entry.path !== 'string' || entry.path.length === 0) {
    throw new Error('Each tree entry needs a nonempty path.');
  }
  if (entry.path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error('Tree paths must be relative and canonical.');
  }
  if (entry.type !== 'blob' && entry.type !== 'tree') {
    throw new Error('Only blob and tree entries are supported.');
  }
  if (typeof entry.sha !== 'string' || !/^[0-9a-f]{40}$/.test(entry.sha)) {
    throw new Error('Each tree entry needs a Git SHA-1.');
  }
  let sizeBytes = 0;
  if (entry.type === 'blob') {
    if (typeof entry.size !== 'number' || !Number.isSafeInteger(entry.size) || entry.size < 0) {
      throw new Error('Blob sizes must be nonnegative safe integers.');
    }
    sizeBytes = entry.size;
  }
  return { path: entry.path, type: entry.type, sha: entry.sha, sizeBytes };
}

/** Ordered rules, including the two writing files that a Markdown-only scan misses. */
function role(path: string, format: string): string {
  if (['mp3', 'wma', 'wav'].includes(format)) {
    return 'audio';
  }
  if (path === '.gitattributes' || path === 'README.md') {
    return 'repository-metadata';
  }
  if (path.startsWith('Academic Reading Samples/') && format === 'pdf') {
    return 'reading-sample';
  }
  if (['jpg', 'jpeg', 'png'].includes(format)) {
    return path.startsWith('Assignments/') ? 'writing-figure' : 'collection-image';
  }
  if (path === 'Assignments/22.08.05/Solution.md') {
    return 'grammar-exercise';
  }
  if (path === 'Assignments/22.08.27/WRITING TASK 2.md') {
    return 'writing-prompt-list';
  }
  if (path.startsWith('Assignments/')) {
    if (
      format === 'md' ||
      path === 'Assignments/22.08.11/emon' ||
      path === 'Assignments/22.08.11/pranto.md 22.08.11'
    ) {
      return 'writing-response-file';
    }
  }
  return 'other';
}

function countBy(entries: readonly Entry[], key: (entry: Entry) => string): Record<string, Counts> {
  const counts = new Map<string, Counts>();
  for (const entry of entries) {
    const group = key(entry);
    const count = counts.get(group) ?? { files: 0, bytes: 0 };
    count.files += 1;
    count.bytes += entry.sizeBytes;
    counts.set(group, count);
  }
  return Object.fromEntries([...counts].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * Validate and audit a complete recursive GitHub tree response.
 *
 * Rejects truncated/wrong snapshots, duplicate paths and malformed entries.
 * The SHA-256 covers sorted, normalised entry metadata (including directories),
 * not file contents; Git blob IDs remain the content provenance. A remote
 * response is still trusted to truthfully describe its advertised tree.
 */
export function auditPreparationTree(value: unknown): PreparationAudit {
  const input = asRecord(value);
  if (input.sha !== PREPARATION_TREE || input.truncated !== false || !Array.isArray(input.tree)) {
    throw new Error('Expected the complete, pinned msneloy/IELTS recursive tree.');
  }
  const entries = input.tree.map(parseEntry);
  const paths = new Set<string>();
  for (const entry of entries) {
    if (paths.has(entry.path)) {
      throw new Error(`Duplicate tree path: ${entry.path}`);
    }
    paths.add(entry.path);
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : 1));
  const blobs = entries.filter((entry) => entry.type === 'blob');
  const uniqueBlobs = new Set(blobs.map((entry) => entry.sha)).size;
  const formatOf = (entry: Entry): string => extname(entry.path).slice(1).toLowerCase() || '(none)';
  const bytes = blobs.reduce((total, entry) => total + entry.sizeBytes, 0);
  if (!Number.isSafeInteger(bytes)) {
    throw new Error('Total blob size exceeds the safe integer range.');
  }
  return {
    repository: 'https://github.com/msneloy/IELTS',
    commit: PREPARATION_COMMIT,
    tree: PREPARATION_TREE,
    methodVersion: '1',
    manifestSha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
    files: blobs.length,
    bytes,
    directories: entries.length - blobs.length,
    uniqueBlobs,
    duplicateFiles: blobs.length - uniqueBlobs,
    byFormat: countBy(blobs, (entry) => extname(entry.path).toLowerCase() || '(none)'),
    bySection: countBy(blobs, (entry) =>
      entry.path.includes('/') ? (entry.path.split('/')[0] as string) : '(root)',
    ),
    byRole: countBy(blobs, (entry) => role(entry.path, formatOf(entry))),
    note: 'Path/extension metadata only; no audio transcription, learner scoring, content redistribution or upstream licence grant. Distinct Git blobs need not be semantically distinct recordings.',
  };
}
