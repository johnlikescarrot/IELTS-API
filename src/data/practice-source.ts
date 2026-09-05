/** Pinned metadata source and explicit allowlist of learning-unit collections. */

import type { PracticeLevel, PracticeMode, ReceptiveSkill } from '../types.js';

/** No upstream code, exercise contents, audio, identities or credentials are imported. */
export const PRACTICE_SOURCE = {
  repository: 'https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS',
  commit: 'ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c',
  license: null,
  contentIncluded: false,
} as const;

/** An independently described upstream collection and its declared size. */
export type PracticeCollection = {
  id: string;
  directory: string;
  skill: ReceptiveSkill;
  mode: PracticeMode;
  level: PracticeLevel;
  declaredUnits: number;
  layout: 'reading-basic' | 'listening-basic' | 'full-test';
};

/** Reading/Listening labels retained verbatim in meaning, without guessed CEFR calibration. */
export const PRACTICE_COLLECTIONS: readonly PracticeCollection[] = [
  {
    id: 'reading-basic-a1-a2',
    directory: 'Reading_1232_Basic/frontend/data/A1-A2',
    skill: 'reading',
    mode: 'basic',
    level: 'a1-a2',
    declaredUnits: 198,
    layout: 'reading-basic',
  },
  {
    id: 'reading-basic-b1-b2',
    directory: 'Reading_1232_Basic/frontend/data/B1-B2',
    skill: 'reading',
    mode: 'basic',
    level: 'b1-b2',
    declaredUnits: 374,
    layout: 'reading-basic',
  },
  {
    id: 'reading-basic-c1-c2',
    directory: 'Reading_1232_Basic/frontend/data/C1-C2',
    skill: 'reading',
    mode: 'basic',
    level: 'c1-c2',
    declaredUnits: 660,
    layout: 'reading-basic',
  },
  {
    id: 'listening-basic-basic',
    directory: 'Listening_102_Basic/Basic',
    skill: 'listening',
    mode: 'basic',
    level: 'basic',
    declaredUnits: 34,
    layout: 'listening-basic',
  },
  {
    id: 'listening-basic-intermediate',
    directory: 'Listening_102_Basic/Intermediate',
    skill: 'listening',
    mode: 'basic',
    level: 'intermediate',
    declaredUnits: 34,
    layout: 'listening-basic',
  },
  {
    id: 'listening-basic-advanced',
    directory: 'Listening_102_Basic/Advanced',
    skill: 'listening',
    mode: 'basic',
    level: 'advanced',
    declaredUnits: 34,
    layout: 'listening-basic',
  },
  {
    id: 'reading-full-test',
    directory: 'Reading_315_FullTest',
    skill: 'reading',
    mode: 'full-test',
    level: 'unspecified',
    declaredUnits: 315,
    layout: 'full-test',
  },
  {
    id: 'listening-full-test',
    directory: 'Listening_204_FullTest',
    skill: 'listening',
    mode: 'full-test',
    level: 'unspecified',
    declaredUnits: 204,
    layout: 'full-test',
  },
];

/** Valid skill filters. */
export const PRACTICE_SKILLS = ['reading', 'listening'] as const;
/** Valid mode filters. */
export const PRACTICE_MODES = ['basic', 'full-test'] as const;
/** Valid directory-level labels. */
export const PRACTICE_LEVELS = [
  'a1-a2',
  'b1-b2',
  'c1-c2',
  'basic',
  'intermediate',
  'advanced',
  'unspecified',
] as const;
/** Valid metadata file roles. */
export const PRACTICE_ASSETS = [
  'json',
  'javascript',
  'html',
  'audio',
  'document',
  'processed-json',
  'strategy',
] as const;
