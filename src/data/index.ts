import type { CefrLevel } from "../types.ts";
import { VOCABULARY_PART_ONE } from "./vocabulary-part-one.ts";
import { VOCABULARY_PART_TWO } from "./vocabulary-part-two.ts";
import type { VocabEntry } from "../types.ts";
import { COMMON_MISTAKES } from "./mistakes.ts";
import { BAND_DESCRIPTORS, OVERALL_BAND_SCALE } from "./descriptors.ts";
import { SPEAKING_TOPICS } from "./speaking.ts";
import { STUDY_TIPS } from "./tips.ts";
import { WRITING_PROMPTS } from "./writing.ts";

/** The full academic vocabulary corpus (120 entries across 12 topics). */
export const VOCABULARY: readonly VocabEntry[] = [...VOCABULARY_PART_ONE, ...VOCABULARY_PART_TWO];

/** CEFR levels present in the corpus, in ascending order. */
export const CEFR_LEVELS: readonly CefrLevel[] = ["A2", "B1", "B2", "C1", "C2"];

/** Rank used to sort vocabulary by CEFR level. */
export const CEFR_ORDER: Record<CefrLevel, number> = { A2: 0, B1: 1, B2: 2, C1: 3, C2: 4 };

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

/** All vocabulary topics, derived from the corpus. */
export const TOPICS: readonly string[] = sortedUnique(VOCABULARY.flatMap((entry) => entry.topics));

/** Parts of speech present in the corpus. */
export const PARTS_OF_SPEECH: readonly string[] = sortedUnique(VOCABULARY.map((entry) => entry.partOfSpeech));

/** Writing question types present in the dataset. */
export const WRITING_TYPES: readonly string[] = sortedUnique(WRITING_PROMPTS.map((prompt) => prompt.type));

/** Mistake categories present in the dataset. */
export const MISTAKE_CATEGORIES: readonly string[] = sortedUnique(COMMON_MISTAKES.map((mistake) => mistake.category));

/** Tip skills present in the dataset. */
export const TIP_SKILLS: readonly string[] = sortedUnique(STUDY_TIPS.map((tip) => tip.skill));

export {
  BAND_DESCRIPTORS,
  COMMON_MISTAKES,
  OVERALL_BAND_SCALE,
  SPEAKING_TOPICS,
  STUDY_TIPS,
  WRITING_PROMPTS,
};
