/**
 * Shared domain types used across the IELTS API.
 */

/** The two IELTS variants. */
export type TestModule = "academic" | "general";

/** The four IELTS paper components (Listening, Reading, Writing, Speaking). */
export type Component = "listening" | "reading" | "writing" | "speaking";

/** Accepted human-assessed component band values: full and half bands from 1 to 9. */
export const VALID_BANDS: readonly number[] = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0,
];

/**
 * The two styles of the IELTS Writing test.
 * Task 1 differs between Academic (a report on a graph/chart/diagram) and
 * General Training (a letter); Task 2 is an essay for both variants.
 */
export type WritingTaskNumber = 1 | 2;

/** Reported type of a writing prompt. */
export type PromptKind = "report" | "letter" | "essay";

/** A single IELTS band-score row (lowest raw marks needed to reach the band). */
export interface BandRow {
  /** The lowest raw score that earns the stated band. */
  rawFrom: number;
  /** The band awarded from {@link rawFrom} up to the next row. */
  band: number;
}

/**
 * A full component scorecard used to derive an overall band.
 * Values must be members of {@link VALID_BANDS}.
 */
export interface ComponentScores {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

/** JSON-API style envelope fields that every successful payload can carry. */
export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** A paginated collection response. */
export interface Page<T> {
  data: T[];
  meta: {
    total: number;
    offset: number;
    limit: number;
    count: number;
  };
}
