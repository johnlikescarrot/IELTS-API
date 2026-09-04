/**
 * Dataset index: every collection plus derived lookups.
 *
 * Derived structures (topic lists, flattened question indexes, section
 * lookups) are computed once at module load so handlers stay declarative
 * and the integrity tests can assert they match the raw data.
 */

import type {
  ListeningSection,
  PracticeTest,
  QuestionRef,
  ReadingSection,
  SpeakingItem,
  Tip,
  Word,
  WritingMistake,
  WritingTask,
} from "../types.js";
import { words } from "./words.js";
import { readingTests } from "./reading.js";
import { listeningTests } from "./listening.js";
import { writingTasks } from "./writing.js";
import { writingMistakes } from "./writing-mistakes.js";
import { speakingItems } from "./speaking.js";
import { tips } from "./tips.js";
import { distinctTopics } from "../lib/collections.js";

export {
  words,
  readingTests,
  listeningTests,
  writingTasks,
  writingMistakes,
  speakingItems,
  tips,
};

/** All practice tests (reading and listening) in stable order. */
export const practiceTests: readonly PracticeTest[] = [
  ...readingTests,
  ...listeningTests,
];

/** Distinct vocabulary topics, sorted. */
export const wordTopics: readonly string[] = distinctTopics(words);

/** Distinct writing topics, sorted. */
export const writingTopics: readonly string[] = distinctTopics(writingTasks);

/** Distinct speaking topics, sorted. */
export const speakingTopics: readonly string[] = distinctTopics(speakingItems);

/** Every practice question, flattened with its parent references. */
export const allQuestions: readonly QuestionRef[] = practiceTests.flatMap(
  (test) =>
    test.sections.flatMap((section) =>
      section.questions.map((question) => ({
        ...question,
        testId: test.id,
        sectionId: section.id,
        skill: test.skill,
      })),
    ),
);

/** A section paired with its parent test, addressable by section id. */
export interface SectionRef {
  readonly test: PracticeTest;
  readonly section: ReadingSection | ListeningSection;
}

/** Lookup from section id (e.g. `rt-001-s1`) to section and parent test. */
export const sectionsById: ReadonlyMap<string, SectionRef> = new Map(
  practiceTests.flatMap((test) =>
    test.sections.map((section) => [
      section.id,
      { test, section } as SectionRef,
    ]),
  ),
);

/** Total item counts advertised by the `/v1/meta` endpoint. */
export const datasetCounts: Readonly<Record<string, number>> = {
  words: words.length,
  readingTests: readingTests.length,
  listeningTests: listeningTests.length,
  readingSections: readingTests.reduce(
    (sum, test) => sum + test.sections.length,
    0,
  ),
  listeningSections: listeningTests.reduce(
    (sum, test) => sum + test.sections.length,
    0,
  ),
  practiceQuestions: allQuestions.length,
  writingTasks: writingTasks.length,
  writingMistakes: writingMistakes.length,
  speakingItems: speakingItems.length,
  tips: tips.length,
};

export type {
  Word,
  WritingTask,
  WritingMistake,
  SpeakingItem,
  Tip,
  QuestionRef,
};
