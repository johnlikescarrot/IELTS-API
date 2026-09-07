/**
 * Vocabulary difficulty estimation.
 *
 * Difficulty is a reproducible heuristic over the Cambridge IELTS 1-22 headword
 * list, not a learner model. It maps a headword's surface and distributional
 * features onto a 0-100 score, a CEFR-style band and a plain-language level
 * so researchers can sample leveled lists without training a separate model.
 *
 * Signals:
 * - **Scarcity** (40 pts) — words appearing in fewer Cambridge volumes are rarer;
 *   `scarcity = 1 − volumes/22`. Low-frequency Zhenjing tags (`source`,
 *   `frequency_level`) are unavailable for this dataset, so volume scarcity
 *   proxies frequency.
 * - **Length** (20 pts) — longer orthographic forms demand more encoding effort;
 *   `lengthScore = clamp((len−3)/10, 0, 1)`.
 * - **Polysemy** (15 pts) — more senses mean finer sense-tuning;
 *   `sensesScore = clamp((senses−1)/4, 0, 1)`.
 * - **Phonetic absence** (10 pts) — missing IPA transcription signals an atypical
 *   or loan form.
 * - **Morphology** (15 pts) — presence of morpheme hints indicates a decomposable
 *   form; lack of hints slightly raises difficulty because the word must be
 *   memorised as a whole.
 *
 * The total is the sum of the five components (0-100). CEFR bands are mapped
 * from the score: A1 (0-20), A2 (20-40), B1 (40-60), B2 (60-80), C1 (80-90),
 * C2 (90-100). The bands are heuristic and are labelled as such.
 */

import { syllablesOf } from './textstats.js';

import type { VocabularyEntry } from '../types.js';

/** Difficulty level. */
export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Result of a difficulty estimate. */
export type VocabularyDifficulty = {
  /** Headword. */
  word: string;
  /** Aggregate score 0-100. */
  score: number;
  /** CEFR-style level heuristic. */
  level: DifficultyLevel;
  /** Plain-language label. */
  label: string;
  /** Component breakdown (points contributed). */
  components: {
    scarcity: number;
    length: number;
    senses: number;
    phonetic: number;
    morphology: number;
  };
  /** Raw signals. */
  signals: {
    volumes: number;
    length: number;
    senses: number;
    syllables: number;
    hasPhonetic: boolean;
    hasMorphemes: boolean;
  };
};

const LEVEL_THRESHOLDS: readonly { max: number; level: DifficultyLevel; label: string }[] = [
  { max: 20, level: 'A1', label: 'Beginner' },
  { max: 40, level: 'A2', label: 'Elementary' },
  { max: 60, level: 'B1', label: 'Intermediate' },
  { max: 80, level: 'B2', label: 'Upper intermediate' },
  { max: 90, level: 'C1', label: 'Advanced' },
];

/**
 * Clamp to [0,1].
 *
 * @param value - Value to clamp.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Map a 0-100 score to its CEFR level and label.
 *
 * @param score - Difficulty score.
 */
function levelForScore(score: number): { level: DifficultyLevel; label: string } {
  for (const band of LEVEL_THRESHOLDS) {
    if (score <= band.max) {
      return { level: band.level, label: band.label };
    }
  }
  return { level: 'C2', label: 'Proficiency' };
}

/**
 * Estimate vocabulary difficulty for one entry.
 *
 * @param entry - Vocabulary entry.
 */
export function estimateDifficulty(entry: VocabularyEntry): VocabularyDifficulty {
  const volumes = entry.volumes.length;
  const scarcity = clamp01(1 - volumes / 22) * 40;
  const lengthScore = clamp01((entry.word.length - 3) / 10) * 20;
  const sensesScore = clamp01((entry.senses.length - 1) / 4) * 15;
  const phoneticScore = entry.phonetic === null ? 10 : 0;
  const morphologyScore = entry.morphemes === null ? 8 : 0;

  const syllables = syllablesOf(entry.word);
  // Very long words (3+ syllables) get a small bonus towards difficulty;
  // single-syllable words stay at the lengthScore alone.
  const syllableBonus = syllables >= 3 ? Math.min(7, (syllables - 2) * 2) : 0;
  const totalMorphology = Math.min(15, morphologyScore + syllableBonus);

  const raw = scarcity + lengthScore + sensesScore + phoneticScore + totalMorphology;
  const score = Math.round(Math.min(100, raw) * 100) / 100;
  const { level, label } = levelForScore(score);

  return {
    word: entry.word,
    score,
    level,
    label,
    components: {
      scarcity: Math.round(scarcity * 100) / 100,
      length: Math.round(lengthScore * 100) / 100,
      senses: Math.round(sensesScore * 100) / 100,
      phonetic: phoneticScore,
      morphology: Math.round(totalMorphology * 100) / 100,
    },
    signals: {
      volumes,
      length: entry.word.length,
      senses: entry.senses.length,
      syllables,
      hasPhonetic: entry.phonetic !== null,
      hasMorphemes: entry.morphemes !== null,
    },
  };
}

/**
 * Band a numeric score (0-100) to a difficulty level without needing a full
 * entry. Useful for sampling thresholds on `GET /v1/vocabulary/difficulty`.
 *
 * @param score - Difficulty score.
 */
export function levelForDifficultyScore(score: number): { level: DifficultyLevel; label: string } {
  const clamped = Math.max(0, Math.min(100, score));
  return levelForScore(clamped);
}
