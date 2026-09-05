/**
 * Machine-readable provenance for reproducible research.
 *
 * A response from this module is intentionally deterministic: it contains no
 * request time or host-specific values. Researchers can archive it alongside a
 * response and verify that the published JSON datasets are the same bytes used
 * by the running service.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { corpus } from '../data/corpus.js';
import { PRACTICE_META } from '../data/practice.js';
import { THEME_META } from '../data/themes.js';
import { vocabulary } from '../data/vocabulary.js';
import { API_VERSION, CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL, SERVICE_NAME } from '../version.js';

import type { ManifestDataset, ResearchManifest } from '../types.js';

/** Compute SHA-256 for a file path relative to repo root, or empty hash on missing. */
export function sha256OfFile(relPath: string): string {
  try {
    const content = readFileSync(relPath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return '0'.repeat(64);
  }
}

/** Pre-computed dataset digests. */
const VOCABULARY_SHA256 = sha256OfFile('data/vocabulary.json');
const CORPUS_SHA256 = sha256OfFile('data/corpus.json');

/** Static dataset catalog for the research manifest. */
export const MANIFEST_DATASETS: Record<string, ManifestDataset> = {
  vocabulary: {
    id: 'vocabulary',
    path: 'data/vocabulary.json',
    sha256: VOCABULARY_SHA256,
    records: vocabulary().entries.length,
    source: {
      url: 'https://github.com/zhengyishiming/IELTS',
      snapshot: 'd66fded8b74057a96a677eb25d9b9f7b39965ce3',
    },
    license: DATA_LICENSE,
    note: 'Cambridge IELTS 1-22 extracted vocabulary dataset with phonetic, senses, and occurrence frequencies.',
  },
  corpus: {
    id: 'corpus',
    path: 'data/corpus.json',
    sha256: CORPUS_SHA256,
    records: corpus().items.length,
    source: {
      url: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
      snapshot: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
    },
    license: DATA_LICENSE,
    note: 'IELTS research corpus cataloguing study materials and practice components.',
  },
  themes: {
    id: 'themes',
    path: 'src/data/themes.ts',
    sha256: createHash('sha256')
      .update(THEME_META.name + THEME_META.source)
      .digest('hex'),
    records: THEME_META.themes,
    source: {
      url: THEME_META.sourceUrl,
      snapshot: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
    },
    license: THEME_META.license,
    note: THEME_META.note,
  },
  practice: {
    id: 'practice',
    path: 'src/data/practice.ts',
    sha256: createHash('sha256')
      .update(PRACTICE_META.name + PRACTICE_META.source)
      .digest('hex'),
    records: PRACTICE_META.totalUnits,
    source: {
      url: PRACTICE_META.sourceUrl,
      snapshot: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
    },
    license: PRACTICE_META.license,
    note: PRACTICE_META.note,
  },
};

/** Deterministic research provenance manifest. */
export const RESEARCH_MANIFEST: ResearchManifest = {
  manifestVersion: 1,
  api: {
    name: SERVICE_NAME,
    version: API_VERSION,
    repository: REPOSITORY_URL,
    license: `${CODE_LICENSE} (code) / ${DATA_LICENSE} (data)`,
    docsUrl: `${REPOSITORY_URL}#readme`,
  },
  datasets: MANIFEST_DATASETS,
  review: {
    upstream: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
    commit: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
    reviewedDate: '2026-09-05',
    unitsObserved: 1852,
    unitsDeclared: 1853,
    notes: [
      'Reading basic: 1,232 observed units across A1-A2 (198), B1-B2 (374), C1-C2 (660).',
      'Reading full tests: 314 observed units out of 315 declared (Test 105 is missing in upstream repository).',
      'Listening basic: 102 observed units across Basic (34), Intermediate (34), Advanced (34).',
      'Listening full tests: 204 observed units; audio files are missing for tests 83, 85, and 88.',
      'All dataset lookups, scoring conversions, and strategy guides are 100% unauthenticated and open.',
    ],
  },
};

/**
 * Return the deterministic research manifest.
 */
export function getManifest(): ResearchManifest {
  return RESEARCH_MANIFEST;
}
