/**
 * Deterministic, allowlisted metadata extraction from a GitHub recursive tree.
 * This module never fetches blobs or executes code from the upstream repository.
 */

import { createHash } from 'node:crypto';

import { PRACTICE_COLLECTION_DEFINITIONS, PRACTICE_SOURCE } from '../data/practice-source.js';
import { sortBy } from './search.js';

import type { PracticeCollectionId, PracticeIndex, PracticeItem, PracticeLevel } from '../types.js';

type RecordValue = Record<string, unknown>;
type Selection = {
  collection: PracticeCollectionId;
  level: PracticeLevel;
  number: number;
  title: string;
  audioPath?: string;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRegularBlob(entry: RecordValue): boolean {
  return entry.mode === '100644' || entry.mode === '100755';
}

function identify(path: string): Selection | undefined {
  const listening =
    /^Listening_102_Basic\/(Basic|Intermediate|Advanced)\/Lesson_([1-9]\d*)\/index\.html$/.exec(path);
  if (listening !== null) {
    const level = listening[1] as string;
    const number = Number(listening[2]);
    return {
      collection: 'listening-basic',
      level: level.toLowerCase() as PracticeLevel,
      number,
      title: `Listening ${level} lesson ${number}`,
      audioPath: path.replace(/index\.html$/, 'audio.mp3'),
    };
  }
  const reading = /^Reading_1232_Basic\/frontend\/data\/(A1-A2|B1-B2|C1-C2)\/lesson_(\d{3})\.json$/.exec(
    path,
  );
  if (reading !== null) {
    const level = reading[1] as string;
    const number = Number(reading[2]);
    return {
      collection: 'reading-basic',
      level: level.toLowerCase() as PracticeLevel,
      number,
      title: `Reading ${level} lesson ${number}`,
    };
  }
  const full = /^(Listening_204_FullTest|Reading_315_FullTest)\/Test_([1-9]\d*)\/Test_\2\.html$/.exec(path);
  if (full !== null) {
    const number = Number(full[2]);
    const isListening = full[1] === 'Listening_204_FullTest';
    return {
      collection: isListening ? 'listening-full' : 'reading-full',
      level: 'unspecified',
      number,
      title: `${isListening ? 'Listening' : 'Reading'} full test ${number}`,
      ...(isListening ? { audioPath: `${full[1]}/Test_${number}/audio_${number}.mp3` } : {}),
    };
  }
  return undefined;
}

function countBy(
  items: readonly PracticeItem[],
  key: 'collection' | 'skill' | 'level' | 'audio',
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  return counts;
}

/**
 * Build the pinned practice metadata release from an untrusted GitHub tree.
 * Rejects truncated/wrong-snapshot trees, duplicate paths and invalid canonical
 * blobs. Non-allowlisted blobs are counted but their metadata is not copied.
 */
export function buildPracticeIndex(input: unknown): PracticeIndex {
  if (
    !isRecord(input) ||
    input.sha !== PRACTICE_SOURCE.treeSha ||
    input.truncated !== false ||
    !Array.isArray(input.tree)
  ) {
    throw new Error('Expected a complete GitHub tree for the pinned practice snapshot.');
  }
  const blobs = new Map<string, RecordValue>();
  const paths = new Set<string>();
  for (const entry of input.tree) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.type !== 'string') {
      throw new Error('Invalid GitHub tree entry: expected path and type strings.');
    }
    if (paths.has(entry.path)) throw new Error(`Duplicate path in GitHub tree: ${entry.path}`);
    paths.add(entry.path);
    if (entry.type === 'blob') blobs.set(entry.path, entry);
  }

  const items: PracticeItem[] = [];
  for (const [path, entry] of blobs) {
    const selection = identify(path);
    if (selection === undefined) continue;
    if (
      !isRegularBlob(entry) ||
      typeof entry.sha !== 'string' ||
      !/^[a-f0-9]{40}$/.test(entry.sha) ||
      typeof entry.size !== 'number' ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    ) {
      throw new Error(`Expected a regular blob with a SHA-1 and non-negative safe byte count: ${path}`);
    }
    if (!Number.isSafeInteger(selection.number) || selection.number < 1) {
      throw new Error(`Invalid lesson number: ${path}`);
    }
    const definition = PRACTICE_COLLECTION_DEFINITIONS.find(
      (collection) => collection.id === selection.collection,
    ) as (typeof PRACTICE_COLLECTION_DEFINITIONS)[number];
    const levelId = selection.level === 'unspecified' ? '' : `-${selection.level}`;
    const companion = selection.audioPath === undefined ? undefined : blobs.get(selection.audioPath);
    items.push({
      id: `${selection.collection}${levelId}-${String(selection.number).padStart(3, '0')}`,
      collection: selection.collection,
      skill: definition.skill,
      mode: definition.mode,
      level: selection.level,
      number: selection.number,
      title: selection.title,
      path,
      format: path.endsWith('.json') ? 'json' : 'html',
      sizeBytes: entry.size,
      sha1: entry.sha,
      sourceUrl: `${PRACTICE_SOURCE.repository}/blob/${PRACTICE_SOURCE.commit}/${path}`,
      audio:
        selection.audioPath === undefined
          ? 'not-applicable'
          : companion !== undefined && isRegularBlob(companion)
            ? 'present'
            : 'missing',
    });
  }
  const sorted = sortBy(items, (item) => item.id, 'asc');
  const collections = PRACTICE_COLLECTION_DEFINITIONS.map((definition) => {
    const members = sorted.filter((item) => item.collection === definition.id);
    return {
      ...definition,
      indexedItems: members.length,
      levels: [...new Set(members.map((item) => item.level))].sort(),
    };
  });
  return {
    schemaVersion: 1,
    source: { ...PRACTICE_SOURCE },
    rights: { metadataLicense: 'CC-BY-4.0', contentIncluded: false },
    integrity: {
      algorithm: 'sha256',
      scope: 'JSON.stringify(items)',
      value: createHash('sha256').update(JSON.stringify(sorted)).digest('hex'),
    },
    collections,
    stats: {
      repositoryFiles: blobs.size,
      indexedItems: sorted.length,
      byCollection: countBy(sorted, 'collection'),
      bySkill: countBy(sorted, 'skill'),
      byLevel: countBy(sorted, 'level'),
      byAudio: countBy(sorted, 'audio'),
    },
    items: sorted,
  };
}
