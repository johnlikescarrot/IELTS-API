/**
 * Shared primitive types used across the IELTS-API domain, analysis and HTTP
 * layers.
 *
 * @packageDocumentation
 */

/** The four IELTS test components that receive an individual band score. */
export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;

/** One of the four IELTS test components. */
export type Skill = (typeof SKILLS)[number];

/** The two IELTS test modules. */
export const MODULES = ["academic", "general-training"] as const;

/** An IELTS test module. */
export type Module = (typeof MODULES)[number];

/**
 * The objectively marked papers, keyed by the raw-to-band conversion table that
 * applies to them. Listening uses one table for both modules; Reading uses a
 * different table per module.
 */
export const SCORED_PAPERS = [
  "listening",
  "reading-academic",
  "reading-general-training",
] as const;

/** An objectively marked paper with a published raw-to-band conversion table. */
export type ScoredPaper = (typeof SCORED_PAPERS)[number];

/**
 * A reportable IELTS band score: a multiple of 0.5 in the closed interval
 * [0, 9].
 */
export type Band = number;

/** Assessment criteria applied by examiners to the productive skills. */
export const RUBRIC_CRITERIA = [
  "task-achievement",
  "task-response",
  "coherence-and-cohesion",
  "lexical-resource",
  "grammatical-range-and-accuracy",
  "fluency-and-coherence",
  "pronunciation",
] as const;

/** A single analytic assessment criterion. */
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

/** Rubrics for which public band descriptors are modelled by this project. */
export const RUBRICS = [
  "writing-task-1",
  "writing-task-2",
  "speaking",
] as const;

/** A rubric identifier. */
export type Rubric = (typeof RUBRICS)[number];
