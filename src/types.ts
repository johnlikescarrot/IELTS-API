/** CEFR levels used across the vocabulary dataset. */
export type CefrLevel = "A2" | "B1" | "B2" | "C1" | "C2";

/** A single academic vocabulary entry. */
export interface VocabEntry {
  id: number;
  word: string;
  /** British English IPA transcription. */
  phonetic: string;
  partOfSpeech: string;
  cefr: CefrLevel;
  topics: string[];
  definition: string;
  example: string;
  synonyms: string[];
  collocations: string[];
}

/** An IELTS Speaking test topic with questions for Parts 1, 2 and 3. */
export interface SpeakingTopic {
  /** URL-friendly slug, e.g. "work-and-career". */
  id: string;
  topic: string;
  part1: string[];
  part2: {
    cueCard: string;
    prompts: string[];
    followUp: string[];
  };
  part3: string[];
}

export type WritingModule = "academic" | "general";

/** Question types for Writing Task 1 and Task 2 across both modules. */
export type WritingTaskType =
  | "opinion"
  | "discussion"
  | "advantages-disadvantages"
  | "problem-solution"
  | "double-question"
  | "chart"
  | "table"
  | "process"
  | "map"
  | "letter-formal"
  | "letter-semi-formal"
  | "letter-informal";

/** A practice writing question. */
export interface WritingPrompt {
  /** Stable identifier, e.g. "w001". */
  id: string;
  module: WritingModule;
  task: 1 | 2;
  type: WritingTaskType;
  prompt: string;
  recommendedTimeMinutes: number;
  /** Minimum word target in words. */
  wordTarget: number;
}

export type MistakeCategory = "grammar" | "word-choice" | "punctuation" | "spelling" | "style";

/** A common learner mistake with its correction. */
export interface CommonMistake {
  id: number;
  category: MistakeCategory;
  incorrect: string;
  correct: string;
  explanation: string;
}

export type ProductiveSkill = "writing" | "speaking";

/** An unofficial, paraphrased summary of a band level for a productive skill. */
export interface BandDescriptor {
  skill: ProductiveSkill;
  /** Band from 5 to 9. */
  band: number;
  summary: string;
  keyFeatures: string[];
}

/** A level on the overall IELTS nine-band scale. */
export interface OverallBandLevel {
  band: number;
  label: string;
  meaning: string;
}

export type TipSkill = "listening" | "reading" | "writing" | "speaking" | "general";

/** A practical study tip. */
export interface StudyTip {
  id: number;
  skill: TipSkill;
  title: string;
  detail: string;
}
