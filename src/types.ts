/**
 * Shared domain types for the IELTS API.
 *
 * These types describe the shape of every resource the API exposes. Keeping
 * them in one place lets the data layer, routes, OpenAPI generation and tests
 * stay in sync.
 */

/** The four IELTS skills. */
export type IeltsSkill = "listening" | "reading" | "writing" | "speaking";

/** The aligned CEFR levels used when tagging vocabulary. */
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** A closed set of topic identifiers used throughout vocabulary data. */
export type TopicId =
  | "education"
  | "environment"
  | "technology"
  | "health"
  | "work"
  | "society"
  | "travel"
  | "culture"
  | "family"
  | "crime";

interface BaseResource {
  id: string;
  topicId?: TopicId;
}

export interface Topic extends BaseResource {
  name: string;
  category: IeltsSkill | "general";
  description: string;
  keywords: string[];
}

export interface VocabularyEntry extends BaseResource {
  word: string;
  partOfSpeech: string;
  phonetic?: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
  cefr: CefrLevel;
  ieltsBand: number;
}

export interface SynonymGroup extends BaseResource {
  headword: string;
  wordClass: string;
  meanings: SynonymousMeaning[];
}

export interface SynonymousMeaning {
  definition: string;
  words: string[];
  register: "formal" | "neutral" | "informal";
}

export interface BandDescriptor extends BaseResource {
  skill: IeltsSkill;
  band: number;
  levelLabel: string;
  criteria: string[];
}

export interface WritingTask {
  id: string;
  task: 1 | 2;
  topicId?: TopicId;
  question: string;
  prompt?: string;
  type: string;
  sampleBand: number;
  modelAnswer: string;
  bandDescriptors: string[];
}

export interface SpeakingPart {
  id: string;
  topicId: TopicId;
  question: string;
  followUp: string[];
}

export interface SpeakingCueCard {
  id: string;
  topicId: TopicId;
  title: string;
  instructions: string[];
  points: string[];
  part: 2 | 3;
}

export interface ReadingQuestionType {
  id: string;
  name: string;
  description: string;
  strategy: string[];
  skills: string[];
}

export interface CommonMistake {
  id: string;
  category: string;
  incorrect: string;
  correct: string;
  explanation: string;
}

export interface Idiom {
  id: string;
  expression: string;
  meaning: string;
  example: string;
  register: "formal" | "neutral" | "informal";
  topicId: TopicId;
}

export interface ExamTip {
  id: string;
  skill: IeltsSkill;
  title: string;
  tip: string;
}

/** A generic envelope used by list endpoints so pagination is predictable. */
export interface Paginated<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

/** A search type selector, mapped to a specific collection by routes. */
export type Searchable =
  | VocabularyEntry
  | SynonymGroup
  | WritingTask
  | SpeakingPart
  | SpeakingCueCard
  | Idiom
  | ExamTip
  | CommonMistake;
