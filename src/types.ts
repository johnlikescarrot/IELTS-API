/**
 * Shared domain types and runtime vocabularies for IELTS-API.
 *
 * The `const` arrays double as runtime validators (see handlers) and as the
 * single source of truth for derived union types, so the API can never
 * advertise a category that its validation layer rejects.
 */

/** The four IELTS test skills. */
export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];

/** Tip categories: the four skills plus cross-cutting `general` advice. */
export const TIP_SKILLS = [
  "listening",
  "reading",
  "writing",
  "speaking",
  "general",
] as const;
export type TipSkill = (typeof TIP_SKILLS)[number];

/** Skills with practice tests in the dataset. */
export const TEST_SKILLS = ["reading", "listening"] as const;
export type TestSkill = (typeof TEST_SKILLS)[number];

/** Skills that expose a raw-score (0-40) to band-score conversion table. */
export const RAW_SCORE_SKILLS = [
  "listening",
  "academic_reading",
  "general_training_reading",
] as const;
export type RawScoreSkill = (typeof RAW_SCORE_SKILLS)[number];

/** Question formats used across the reading and listening practice tests. */
export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false_not_given",
  "sentence_completion",
  "short_answer",
  "matching_headings",
  "note_completion",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Possible answers for TRUE / FALSE / NOT GIVEN questions. */
export const TFNG_ANSWERS = ["true", "false", "not_given"] as const;
export type TfngAnswer = (typeof TFNG_ANSWERS)[number];

/** Parts of speech used by the vocabulary dataset. */
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** IELTS Writing Task 1 output formats. */
export const WRITING_FORMATS = ["report", "letter"] as const;
export type WritingFormat = (typeof WRITING_FORMATS)[number];

/** Categories used to classify common writing mistakes. */
export const MISTAKE_CATEGORIES = [
  "grammar",
  "word_choice",
  "spelling",
  "punctuation",
  "style",
  "cohesion",
] as const;
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

/** IELTS test modules. */
export const MODULES = ["academic", "general_training"] as const;
export type Module = (typeof MODULES)[number];

/** A band-scored vocabulary entry. */
export interface Word {
  readonly id: string;
  readonly word: string;
  /** International Phonetic Alphabet transcription. */
  readonly ipa: string;
  readonly partOfSpeech: PartOfSpeech;
  /** Indicative CEFR-style band (5-9) at which the word is most useful. */
  readonly band: number;
  readonly topic: string;
  readonly meaning: string;
  readonly example: string;
  readonly synonyms: readonly string[];
  readonly collocations: readonly string[];
}

/** Discriminated union of every question format. */
interface QuestionBase {
  readonly id: string;
  readonly type: QuestionType;
  readonly prompt: string;
  /** Estimated band difficulty of the question. */
  readonly band: number;
  /** Why the answer is correct, citing the passage or transcript where useful. */
  readonly explanation: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  readonly type: "multiple_choice";
  readonly options: readonly string[];
  /** The correct option, verbatim. */
  readonly answer: string;
}

export interface TrueFalseNotGivenQuestion extends QuestionBase {
  readonly type: "true_false_not_given";
  readonly answer: TfngAnswer;
}

export interface SentenceCompletionQuestion extends QuestionBase {
  readonly type: "sentence_completion";
  readonly answer: string;
  /** Maximum number of words, as printed in IELTS instructions. */
  readonly wordLimit: number;
}

export interface ShortAnswerQuestion extends QuestionBase {
  readonly type: "short_answer";
  readonly answer: string;
  readonly wordLimit: number;
}

export interface MatchingHeadingsQuestion extends QuestionBase {
  readonly type: "matching_headings";
  /** The correct heading, verbatim from the section's headings bank. */
  readonly answer: string;
}

export interface NoteCompletionQuestion extends QuestionBase {
  readonly type: "note_completion";
  readonly answer: string;
  readonly wordLimit: number;
}

export type Question =
  | MultipleChoiceQuestion
  | TrueFalseNotGivenQuestion
  | SentenceCompletionQuestion
  | ShortAnswerQuestion
  | MatchingHeadingsQuestion
  | NoteCompletionQuestion;

/** One section of a reading test: a long passage plus its question set. */
export interface ReadingSection {
  readonly id: string;
  readonly title: string;
  readonly passage: string;
  /** Heading bank for `matching_headings` questions, if any. */
  readonly headings: readonly string[];
  readonly questions: readonly Question[];
}

/** One section of a listening test: an audio transcript plus questions. */
export interface ListeningSection {
  readonly id: string;
  readonly title: string;
  /** The situation described by the audio (e.g. "a conversation in a library"). */
  readonly scenario: string;
  readonly transcript: string;
  readonly questions: readonly Question[];
}

export interface ReadingTest {
  readonly id: string;
  readonly skill: "reading";
  readonly module: Module;
  readonly title: string;
  /** Recommended completion time in minutes. */
  readonly minutes: number;
  readonly sections: readonly ReadingSection[];
}

export interface ListeningTest {
  readonly id: string;
  readonly skill: "listening";
  /** Listening is identical in both modules, so it is labelled `both`. */
  readonly module: "both";
  readonly title: string;
  readonly minutes: number;
  readonly sections: readonly ListeningSection[];
}

export type PracticeTest = ReadingTest | ListeningTest;

/** A question flattened with references back to its test and section. */
export type QuestionRef = Question & {
  readonly testId: string;
  readonly sectionId: string;
  readonly skill: "reading" | "listening";
};

/** An IELTS Writing task with a model answer. */
export interface WritingTask {
  readonly id: string;
  readonly task: 1 | 2;
  /** `report` for Academic Task 1, `letter` for General Training Task 1, `essay` for Task 2. */
  readonly format: WritingFormat | "essay";
  readonly module: Module;
  readonly topic: string;
  readonly prompt: string;
  readonly minutes: number;
  /** Band score of the model answer. */
  readonly modelBand: number;
  readonly keyPoints: readonly string[];
  readonly modelAnswer: string;
  readonly usefulVocabulary: readonly string[];
}

/** A frequently-seen learner error with its correction and explanation. */
export interface WritingMistake {
  readonly id: string;
  readonly category: MistakeCategory;
  readonly incorrect: string;
  readonly corrected: string;
  readonly explanation: string;
}

/** Speaking Part 1: a topic and its short questions. */
export interface SpeakingPart1 {
  readonly id: string;
  readonly part: 1;
  readonly topic: string;
  readonly questions: readonly string[];
}

/** Speaking Part 2: a cue card with a model response. */
export interface SpeakingCueCard {
  readonly id: string;
  readonly part: 2;
  readonly topic: string;
  readonly prompt: string;
  readonly points: readonly string[];
  readonly sampleAnswer: string;
  readonly keyVocabulary: readonly { term: string; meaning: string }[];
}

/** Speaking Part 3: an abstract discussion topic. */
export interface SpeakingPart3 {
  readonly id: string;
  readonly part: 3;
  readonly topic: string;
  readonly questions: readonly string[];
  readonly strategy: string;
}

export type SpeakingItem = SpeakingPart1 | SpeakingCueCard | SpeakingPart3;

/** A study or exam tip for one skill (or `general`). */
export interface Tip {
  readonly id: string;
  readonly skill: Skill | "general";
  readonly title: string;
  readonly detail: string;
}

/** One bracket of a raw-score to band-score conversion table. */
export interface BandBracket {
  /** Lowest raw score (out of 40) that still maps to `band`. */
  readonly minRaw: number;
  readonly band: number;
}

/** Standard JSON list envelope used by every collection endpoint. */
export interface ListMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pages: number;
}

export interface PaginatedList<T> {
  readonly meta: ListMeta;
  readonly data: readonly T[];
}
