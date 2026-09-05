/** Discovery and provenance for the original reading practice collection. */

import { createHash } from 'node:crypto';

import { READING_CONTENT } from './reading-content.js';
import { notFound } from '../lib/errors.js';
import { matchesQuery, sortBy } from '../lib/search.js';

import type { ReadingEntry, ReadingExercise, ReadingLevel } from '../reading-types.js';

/** Editorial difficulty labels; these must not be converted to IELTS bands. */
export const READING_LEVELS = ['foundation', 'intermediate', 'advanced'] as const;

/** Supported automatically checkable question families. */
export const READING_QUESTION_TYPES = ['single-choice', 'true-false-not-given', 'short-answer'] as const;

/** Topic facets, derived from the collection rather than a separate hand-maintained list. */
export const READING_TOPICS: readonly string[] = [
  ...new Set(READING_CONTENT.map(({ exercise }) => exercise.topic)),
].sort();

/** Content identity covers the complete authored records, including solutions. */
export const READING_DATASET = {
  id: 'ielts-api-original-reading',
  version: '1.0.0',
  license: 'CC-BY-4.0',
  sha256: createHash('sha256').update(JSON.stringify(READING_CONTENT)).digest('hex'),
  provenance:
    'Original fictional, AI-assisted passages and questions authored for IELTS API; no upstream test content is redistributed.',
  limitation:
    'A small, uncalibrated practice collection, not an official IELTS test or a validated measure of CEFR level or band score.',
} as const;

/** Optional filters for the original reading collection. */
export type ReadingQuery = {
  query?: string;
  level?: ReadingLevel;
  topic?: string;
};

/** Return matching exercises in stable identifier order, without answer keys. */
export function searchReading(options: ReadingQuery = {}): ReadingExercise[] {
  const query = options.query ?? '';
  const exercises = READING_CONTENT.map(({ exercise }) => exercise).filter((exercise) => {
    if (!matchesQuery([exercise.title, exercise.topic, ...exercise.paragraphs], query)) return false;
    if (options.level !== undefined && exercise.level !== options.level) return false;
    if (options.topic !== undefined && exercise.topic !== options.topic) return false;
    return true;
  });
  return structuredClone(sortBy(exercises, (exercise) => exercise.id, 'asc'));
}

/** Get an isolated source record for grading or offline research, including its solutions. */
export function readingEntry(id: string): ReadingEntry {
  const entry = READING_CONTENT.find(({ exercise }) => exercise.id === id);
  if (entry === undefined) throw notFound('Unknown reading exercise.', { id });
  return structuredClone(entry);
}

/** Get an exercise without disclosing the answer key. */
export function readingExercise(id: string): ReadingExercise {
  return readingEntry(id).exercise;
}

/** Aggregate statistics computed from the actual collection, not promised dataset sizes. */
export function readingStats(): {
  exercises: number;
  questions: number;
  byLevel: Record<string, number>;
  byQuestionType: Record<string, number>;
} {
  const questions = READING_CONTENT.flatMap(({ exercise }) => exercise.questions);
  return {
    exercises: READING_CONTENT.length,
    questions: questions.length,
    byLevel: Object.fromEntries(
      READING_LEVELS.map((level) => [
        level,
        READING_CONTENT.filter(({ exercise }) => exercise.level === level).length,
      ]),
    ),
    byQuestionType: Object.fromEntries(
      READING_QUESTION_TYPES.map((type) => [
        type,
        questions.filter((question) => question.type === type).length,
      ]),
    ),
  };
}
