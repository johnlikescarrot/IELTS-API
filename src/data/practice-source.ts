/**
 * Reviewed provenance and vocabulary for the reading/listening metadata index.
 * No upstream code, exercise text, account data or media is redistributed.
 */

import type { PracticeCollection, PracticeManifest } from '../types.js';

/** The immutable upstream snapshot reviewed for this dataset release. */
export const PRACTICE_SOURCE: PracticeManifest['source'] = {
  repository: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
  commit: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
  treeSha: '52e6e832d6b3243205ebe3bb7fe901bbeca7f504',
  reviewedOn: '2026-09-05',
  contentLicense: 'not-specified',
  access: 'may-require-login-or-payment',
  note: 'Metadata only. Upstream documentation describes login and paid access; public GitHub visibility does not grant reuse rights. Levels are unvalidated directory labels. Audio presence does not establish playability or permission to use it.',
};

/** Collection definitions; declared counts are labels, not measured availability. */
export const PRACTICE_COLLECTION_DEFINITIONS: readonly Omit<PracticeCollection, 'indexedItems' | 'levels'>[] =
  [
    {
      id: 'listening-basic',
      title: 'Listening exercises',
      skill: 'listening',
      mode: 'exercise',
      sourceDirectory: 'Listening_102_Basic',
      declaredItems: 102,
    },
    {
      id: 'listening-full',
      title: 'Listening full tests',
      skill: 'listening',
      mode: 'full-test',
      sourceDirectory: 'Listening_204_FullTest',
      declaredItems: 204,
    },
    {
      id: 'reading-basic',
      title: 'Reading exercises',
      skill: 'reading',
      mode: 'exercise',
      sourceDirectory: 'Reading_1232_Basic',
      declaredItems: 1232,
    },
    {
      id: 'reading-full',
      title: 'Reading full tests',
      skill: 'reading',
      mode: 'full-test',
      sourceDirectory: 'Reading_315_FullTest',
      declaredItems: 315,
    },
  ];

/** Filterable collection identifiers. */
export const PRACTICE_COLLECTION_IDS = PRACTICE_COLLECTION_DEFINITIONS.map((collection) => collection.id);
/** Filterable skills. */
export const PRACTICE_SKILLS = ['listening', 'reading'] as const;
/** Filterable source packaging. */
export const PRACTICE_MODES = ['exercise', 'full-test'] as const;
/** Source labels; intentionally do not infer individual CEFR levels. */
export const PRACTICE_LEVELS = [
  'basic',
  'intermediate',
  'advanced',
  'a1-a2',
  'b1-b2',
  'c1-c2',
  'unspecified',
] as const;
/** Audio metadata filters. */
export const PRACTICE_AUDIO_STATUSES = ['present', 'missing', 'not-applicable'] as const;
/** Versioned algorithm identifier for replaying a research sample. */
export const PRACTICE_SAMPLING_ALGORITHM = 'fnv1a32-mulberry32-partial-fisher-yates-v1';
