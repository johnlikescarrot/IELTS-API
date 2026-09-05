/**
 * Machine-readable provenance for every dataset the API publishes.
 *
 * Reproducible research needs to know not just what a response said but where
 * the numbers came from. This module answers that in one place: for each
 * dataset it records the upstream source, how the dataset was derived, the
 * licence it is published under, the endpoints that serve it, the extraction
 * script that regenerates it and — for the four datasets shipped as JSON files
 * — the SHA-256 digest and byte size of the exact file this process loaded.
 *
 * The digests are computed from the files on disk at first use, so a response
 * describes the running deployment rather than a value baked in at build time:
 * a reader can verify a cited response against the archived file.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

import { BAND_DESCRIPTORS, BAND_SCALE } from './bands.js';
import { CONVERSION_TARGETS } from './conversions.js';
import { RESPONSE_FRAMEWORKS } from './frameworks.js';
import { materialsStats } from './materials.js';
import { practiceStats } from './practiceTests.js';
import { QUESTION_TYPES } from './questionTypes.js';
import { RAW_SCORE_PAPERS } from './rawScores.js';
import { RESOURCES } from './resources.js';
import { TASK_TYPES } from './tasks.js';
import { EXAM_THEMES } from './themes.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from './topics.js';
import { corpusItems } from './corpus.js';
import { vocabularyStats } from './vocabulary.js';

import type { DatasetRecord } from '../types.js';

/** Digest and size of one shipped JSON file. */
export interface FileFingerprint {
  /** Lower-case hexadecimal SHA-256 of the file contents. */
  sha256: string;
  /** File size in bytes. */
  sizeBytes: number;
}

/** Fingerprints computed so far, keyed by file name. */
const fingerprints = new Map<string, FileFingerprint>();

/**
 * Fingerprint a dataset file shipped in `data/`.
 *
 * @param fileName - File name relative to the repository `data/` directory.
 */
export function fingerprintOf(fileName: string): FileFingerprint {
  const cached = fingerprints.get(fileName);
  if (cached !== undefined) {
    return cached;
  }
  const location = new URL(`../../data/${fileName}`, import.meta.url);
  const bytes = readFileSync(location);
  const fingerprint: FileFingerprint = {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sizeBytes: statSync(location).size,
  };
  fingerprints.set(fileName, fingerprint);
  return fingerprint;
}

/** Drop every cached fingerprint (used by tests). */
export function clearFingerprintCache(): void {
  fingerprints.clear();
}

/** Static half of a dataset record; counts and digests are resolved lazily. */
interface DatasetSpec {
  id: string;
  name: string;
  description: string;
  derivation: DatasetRecord['derivation'];
  source: string | null;
  sourceUrl: string | null;
  license: string;
  endpoints: string[];
  script: string | null;
  file: string | null;
  count: () => number;
}

/** Every dataset, in the order the documentation introduces them. */
const SPECS: readonly DatasetSpec[] = [
  {
    id: 'vocabulary',
    name: 'Cambridge IELTS 1-22 vocabulary',
    description:
      'Headwords with phonetic transcription, senses, morpheme hints and the Cambridge volumes each word occurs in.',
    derivation: 'extracted',
    source: 'zhengyishiming/IELTS (1-22yas.xlsx)',
    sourceUrl: 'https://github.com/zhengyishiming/IELTS',
    license: 'CC BY 4.0',
    endpoints: ['/v1/vocabulary', '/v1/vocabulary/{word}', '/v1/vocabulary/stats'],
    script: 'scripts/extract_vocabulary.py',
    file: 'vocabulary.json',
    count: () => vocabularyStats().words,
  },
  {
    id: 'practice-tests',
    name: 'Practice-test structure and readability index',
    description:
      'Derived structure, question-type and readability metadata for practice tests and CEFR-graded reading lessons. No test content is redistributed.',
    derivation: 'extracted',
    source: 'ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
    sourceUrl: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
    license: 'CC BY 4.0',
    endpoints: ['/v1/tests/items', '/v1/tests/stats'],
    script: 'scripts/extract_practice_tests.py',
    file: 'practice-tests.json',
    count: () => practiceStats().indexedItems,
  },
  {
    id: 'corpus',
    name: 'Research-corpus index',
    description: 'Metadata index of an open IELTS research corpus; file metadata only, no content.',
    derivation: 'extracted',
    source: 'zhengyishiming/IELTS',
    sourceUrl: 'https://github.com/zhengyishiming/IELTS',
    license: 'CC BY 4.0',
    endpoints: ['/v1/corpus/items', '/v1/corpus/stats'],
    script: 'scripts/extract_corpus.py',
    file: 'corpus.json',
    count: () => corpusItems().length,
  },
  {
    id: 'materials',
    name: 'Study-materials index',
    description:
      'Metadata index of a self-study materials collection: recall banks, question banks, templates and vocabulary files.',
    derivation: 'extracted',
    source: 'Oxidaner/ielts',
    sourceUrl: 'https://github.com/Oxidaner/ielts',
    license: 'CC BY 4.0',
    endpoints: ['/v1/materials/items', '/v1/materials/stats'],
    script: 'scripts/extract_materials.py',
    file: 'materials.json',
    count: () => materialsStats().indexedFiles,
  },
  {
    id: 'band-descriptors',
    name: 'Analytic band descriptors',
    description:
      'Condensed, original-language paraphrases of the analytic criteria for Speaking and Writing across bands 0-9.',
    derivation: 'original',
    source: 'IELTS partners (paraphrased, not reproduced)',
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    license: 'CC BY 4.0',
    endpoints: ['/v1/bands/descriptors', '/v1/bands/scale'],
    script: null,
    file: null,
    count: () => BAND_DESCRIPTORS.length,
  },
  {
    id: 'band-scale',
    name: 'Band scale',
    description: 'The 0-9 scale in half-band steps with proficiency labels and indicative CEFR levels.',
    derivation: 'compiled',
    source: 'IELTS partners',
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    license: 'CC BY 4.0',
    endpoints: ['/v1/bands/scale'],
    script: null,
    file: null,
    count: () => BAND_SCALE.length,
  },
  {
    id: 'conversions',
    name: 'Score concordances',
    description: 'Indicative concordances to CEFR, TOEFL iBT, the Cambridge English Scale, PTE and DET.',
    derivation: 'compiled',
    source: 'Test providers’ published comparison tables',
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    license: 'CC BY 4.0',
    endpoints: ['/v1/scores/convert', '/v1/scores/interpret'],
    script: null,
    file: null,
    count: () => CONVERSION_TARGETS.length,
  },
  {
    id: 'raw-scores',
    name: 'Raw-score conversion tables',
    description:
      'Indicative raw-score to band tables out of 40 for Listening, Academic Reading and General Training Reading.',
    derivation: 'compiled',
    source: 'IELTS partners’ official practice material',
    sourceUrl: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
    license: 'CC BY 4.0',
    endpoints: ['/v1/scores/raw', '/v1/scores/raw-tables'],
    script: null,
    file: null,
    count: () => RAW_SCORE_PAPERS.length,
  },
  {
    id: 'question-types',
    name: 'Question-type taxonomy',
    description:
      'Canonical Reading and Listening question types with strategy guidance and frequencies observed in the practice-test index.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/question-types', '/v1/question-types/{id}'],
    script: null,
    file: null,
    count: () => QUESTION_TYPES.length,
  },
  {
    id: 'frameworks',
    name: 'Response frameworks',
    description: 'Ordered stage plans with cue language and pitfalls for Writing Task 2 and Speaking parts.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/frameworks', '/v1/frameworks/{id}'],
    script: null,
    file: null,
    count: () => RESPONSE_FRAMEWORKS.length,
  },
  {
    id: 'themes',
    name: 'Recurring exam themes',
    description: 'Recurring topic themes with keyword sets, used by the essay profiler and the planner.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/topics/themes'],
    script: null,
    file: null,
    count: () => EXAM_THEMES.length,
  },
  {
    id: 'writing-topics',
    name: 'Writing Task 2 prompt bank',
    description: 'Original Task 2 prompts tagged by category and question family, each with two positions.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/topics/writing'],
    script: null,
    file: null,
    count: () => WRITING_TOPICS.length,
  },
  {
    id: 'speaking-topics',
    name: 'Speaking topic bank',
    description: 'Original Speaking Part 1-3 topics and question sets.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/topics/speaking'],
    script: null,
    file: null,
    count: () => SPEAKING_TOPICS.length,
  },
  {
    id: 'tasks',
    name: 'Writing Task 1 families',
    description: 'Task 1 question families for both modules with response structures and time budgets.',
    derivation: 'original',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/tasks/writing'],
    script: null,
    file: null,
    count: () => TASK_TYPES.length,
  },
  {
    id: 'resources',
    name: 'Open resource catalogue',
    description: 'Freely accessible IELTS preparation resources and open datasets, with licences.',
    derivation: 'compiled',
    source: null,
    sourceUrl: null,
    license: 'CC BY 4.0',
    endpoints: ['/v1/resources'],
    script: null,
    file: null,
    count: () => RESOURCES.length,
  },
];

/**
 * Build the provenance record for every dataset.
 *
 * @returns One record per dataset, with live counts and file digests.
 */
export function datasetRecords(): DatasetRecord[] {
  return SPECS.map((spec) => {
    const fingerprint = spec.file === null ? undefined : fingerprintOf(spec.file);
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      derivation: spec.derivation,
      source: spec.source,
      sourceUrl: spec.sourceUrl,
      license: spec.license,
      records: spec.count(),
      endpoints: [...spec.endpoints],
      script: spec.script,
      sha256: fingerprint?.sha256 ?? null,
      sizeBytes: fingerprint?.sizeBytes ?? null,
    };
  });
}

/**
 * Look up one dataset provenance record.
 *
 * @param id - Dataset identifier.
 */
export function datasetRecord(id: string): DatasetRecord | undefined {
  return datasetRecords().find((record) => record.id === id);
}

/** Identifiers of every documented dataset. */
export const DATASET_IDS: readonly string[] = SPECS.map((spec) => spec.id);
