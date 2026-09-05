/**
 * Public type definitions for the IELTS API.
 *
 * Every type exported here is part of the stable, versioned JSON contract:
 * breaking changes are only made across major versions.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/** Grammatical categories used by the vocabulary dataset. */
export type PartOfSpeech =
  'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'other';

/** A single sense of a word, tagged with its part of speech. */
export type Sense = {
  /** Normalised part of speech. */
  pos: PartOfSpeech;
  /** Definition text for this sense. */
  text: string;
};

/** A vocabulary entry from the Cambridge IELTS 1-22 corpus. */
export type VocabularyEntry = {
  /** Stable identifier (`w00001`). */
  id: string;
  /** Headword, as published in the source workbook. */
  word: string;
  /** IPA-style transcription, slash-delimited, or `null` when unavailable. */
  phonetic: string | null;
  /** Part of speech of the primary sense. */
  partOfSpeech: PartOfSpeech;
  /** Definition of the primary sense. */
  definition: string | null;
  /** All senses found in the source workbook. */
  senses: Sense[];
  /** Morpheme hints (e.g. `hydro(water);gen(create)`), when published. */
  morphemes: string | null;
  /** Cambridge IELTS volumes (1-22) in which the word occurs. */
  volumes: number[];
};

/** Dataset-level provenance for the vocabulary dataset. */
export type VocabularyMeta = {
  name: string;
  source: string;
  sourceUrl: string;
  volumes: number;
  occurrences: number;
  words: number;
  license: string;
  attribution: string;
};

/* -------------------------------------------------------------------------- */
/* Bands, scoring and conversion                                              */
/* -------------------------------------------------------------------------- */

/** A band score: any multiple of 0.5 between 0 and 9 inclusive. */
export type BandScore = number;

/** Skills assessed by IELTS. */
export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

/** Assessment criteria sets published for IELTS. */
export type CriteriaSet = 'speaking' | 'writing-task-1' | 'writing-task-2';

/** Names of the analytic criteria. */
export type Criterion =
  | 'fluencyAndCoherence'
  | 'lexicalResource'
  | 'grammaticalRangeAndAccuracy'
  | 'pronunciation'
  | 'taskAchievement'
  | 'taskResponse'
  | 'coherenceAndCohesion';

/** A concise, original-language summary of one band level of one criterion. */
export type BandDescriptor = {
  /** Criteria set this descriptor belongs to. */
  set: CriteriaSet;
  /** Criterion described. */
  criterion: Criterion;
  /** Whole band level (0-9). */
  band: number;
  /** One-sentence description of typical performance at this band. */
  summary: string;
};

/** A row of the IELTS band scale. */
export type BandScaleEntry = {
  /** Band score (0, 0.5, ... 9). */
  band: BandScore;
  /** Indicative CEFR level. */
  cefr: string;
  /** Short proficiency label used by IELTS. */
  label: string;
  /** Plain-language description of the level. */
  description: string;
};

/** A mapping between an IELTS band and another scale. */
export type ConversionEntry = {
  /** IELTS band score. */
  band: BandScore;
  /** Target-scale value (number, string level, or `[min, max]` range). */
  value: string | number | [number, number];
  /** Human-readable rendering of {@link ConversionEntry.value}. */
  display: string;
};

/** Supported IELTS-equivalent scales. */
export type ConversionTarget = 'cefr' | 'toefl-ibt' | 'cambridge-english-scale' | 'pte-academic' | 'duolingo';

/* -------------------------------------------------------------------------- */
/* Tasks, topics and resources                                                */
/* -------------------------------------------------------------------------- */

/** Task 1 question families. */
export type TaskType = {
  /** Stable identifier. */
  id: string;
  /** IELTS module the task belongs to. */
  module: 'academic' | 'general-training';
  /** Task family name. */
  name: string;
  /** What the candidate is asked to do. */
  description: string;
  /** Recommended response structure. */
  structure: string[];
  /** Typical pitfalls. */
  tips: string[];
  /** Recommended time budget in minutes. */
  suggestedMinutes: number;
};

/** Essay question families for Writing Task 2. */
export type EssayQuestionType =
  'opinion' | 'discussion' | 'advantages-disadvantages' | 'problem-solution' | 'two-part';

/** A Writing Task 2 prompt. */
export type WritingTopic = {
  /** Stable identifier. */
  id: string;
  /** Thematic category. */
  category: string;
  /** Question family. */
  questionType: EssayQuestionType;
  /** The prompt itself. */
  prompt: string;
  /** Two contrasting positions a candidate might take. */
  positions: [string, string];
};

/** Speaking test parts. */
export type SpeakingPart = 1 | 2 | 3;

/** A Speaking test item. */
export type SpeakingTopic = {
  /** Stable identifier. */
  id: string;
  /** Test part. */
  part: SpeakingPart;
  /** Topic name. */
  topic: string;
  /** Cue card (parts 2 and 3) or question set (part 1). */
  questions: string[];
};

/** A freely accessible IELTS preparation resource. */
export type Resource = {
  /** Stable identifier. */
  id: string;
  /** Resource name. */
  name: string;
  /** Canonical URL. */
  url: string;
  /** Publishing organisation. */
  provider: string;
  /** Kind of resource. */
  type: 'official' | 'course' | 'practice-material' | 'dataset' | 'tool' | 'community';
  /** Whether the resource is free of charge and requires no authentication. */
  free: boolean;
  /** Licence of the resource content, when known. */
  license: string;
  /** One-line description. */
  description: string;
};

/* -------------------------------------------------------------------------- */
/* Research corpus                                                            */
/* -------------------------------------------------------------------------- */

/** One file of the upstream research corpus. */
export type CorpusItem = {
  /** Slugified identifier. */
  id: string;
  /** Path inside the upstream repository. */
  path: string;
  /** Human-readable title. */
  title: string;
  /** Corpus category. */
  category: string;
  /** IELTS skill the material supports. */
  skill: string;
  /** File extension without the dot. */
  format: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** Git blob SHA-1. */
  sha1: string | null;
  /** Public URL of the file in the upstream repository. */
  sourceUrl: string;
};

/** Aggregated statistics about the upstream corpus. */
export type CorpusStats = {
  filesInRepository: number;
  ieltsRelevantFiles: number;
  ieltsRelevantBytes: number;
  coverageRatio: number;
  byCategory: Record<string, number>;
  bySkill: Record<string, number>;
  byFormat: Record<string, number>;
};

/* -------------------------------------------------------------------------- */
/* Graded reading                                                             */
/* -------------------------------------------------------------------------- */

/** CEFR levels used by the graded reading dataset. */
export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Item formats used by the reading questions. */
export type ReadingQuestionFormat = 'multiple-choice' | 'true-false-notgiven' | 'short-answer';

/** One comprehension question attached to a graded passage. */
export type ReadingQuestion = {
  /** Stable identifier (`rd-a2-cities-01-q1`). */
  id: string;
  /** Item format. */
  format: ReadingQuestionFormat;
  /** The question stem. */
  prompt: string;
  /** Answer options, only present for multiple-choice items. */
  options?: string[];
  /** The correct option text, `True`/`False`/`Not given`, or the expected short answer. */
  answer: string;
  /** Why the answer is correct, referencing the passage. */
  explanation: string;
};

/** An original, CEFR-graded reading passage with exam-style items. */
export type ReadingPassage = {
  /** Stable identifier (`rd-b2-history-01`). */
  id: string;
  /** Passage title. */
  title: string;
  /** Indicative CEFR level of the language in the passage. */
  cefrLevel: CefrLevel;
  /** Thematic category. */
  topic: string;
  /** One-line abstract of the passage. */
  summary: string;
  /** Suggested time on task, in minutes. */
  minutes: number;
  /** The passage text itself. */
  text: string;
  /** Comprehension items that follow the passage. */
  questions: ReadingQuestion[];
};

/** A reading passage without its full text (the collection representation). */
export type ReadingSummary = {
  /** Stable identifier. */
  id: string;
  /** Passage title. */
  title: string;
  /** Indicative CEFR level. */
  cefrLevel: CefrLevel;
  /** Thematic category. */
  topic: string;
  /** One-line abstract. */
  summary: string;
  /** Suggested time on task, in minutes. */
  minutes: number;
  /** Words in the passage text. */
  wordCount: number;
  /** Number of comprehension items. */
  questionCount: number;
};

/** Aggregate statistics for the graded reading dataset. */
export type ReadingStats = {
  /** Number of passages. */
  passages: number;
  /** Number of comprehension questions. */
  questions: number;
  /** Total words across all passage texts. */
  words: number;
  /** Passages per CEFR level. */
  byLevel: Record<string, number>;
};

/* -------------------------------------------------------------------------- */
/* Learning strategies                                                        */
/* -------------------------------------------------------------------------- */

/** An original study-strategy card with a pointer to its evidence base. */
export type StrategyCard = {
  /** Stable identifier (`st-listening-01`). */
  id: string;
  /** IELTS skill the strategy supports. */
  skill: Skill;
  /** Short strategy name. */
  title: string;
  /** Inclusive band range the strategy is calibrated for. */
  bands: [number, number];
  /** What the candidate should actually do. */
  action: string;
  /** Why it helps. */
  rationale: string;
  /** Research pointer supporting the strategy, or an honest `practitioner convention` label. */
  evidence: string;
};

/* -------------------------------------------------------------------------- */
/* Generated quizzes and study plans                                          */
/* -------------------------------------------------------------------------- */

/** Direction of a generated vocabulary quiz item. */
export type QuizDirection = 'word-to-meaning' | 'meaning-to-word';

/** One generated multiple-choice quiz item. */
export type QuizItem = {
  /** Position identifier within the quiz (`q1` … `qN`). */
  id: string;
  /** Identifier of the vocabulary entry the item was built from. */
  wordId: string;
  /** The headword the item tests. */
  word: string;
  /** The question stem. */
  prompt: string;
  /** Shuffled answer options; exactly one is correct. */
  options: string[];
  /** Index of the correct option within `options`. */
  answerIndex: number;
};

/** A deterministic, seeded vocabulary quiz. */
export type VocabularyQuiz = {
  /** Generator kind (`vocabulary-definitions`). */
  kind: string;
  /** Item direction. */
  direction: QuizDirection;
  /** Seed used; the same seed reproduces the same items. */
  seed: string;
  /** Number of items. */
  count: number;
  /** The generated items. */
  items: QuizItem[];
};

/** One week of a generated study plan. */
export type StudyPlanWeek = {
  /** Week number, starting at 1. */
  week: number;
  /** The skill this week concentrates on. */
  focusSkill: Skill;
  /** Practice hours per skill this week (half-hour units, rounded). */
  hours: Record<Skill, number>;
  /** Hours reserved for review, feedback and error logging. */
  reviewHours: number;
  /** New vocabulary words to study this week. */
  vocabularyWords: number;
  /** Concrete dataset items to practise with. */
  materials: {
    /** Writing Task 2 prompt id. */
    writingTopicId: string;
    /** Speaking item id. */
    speakingTopicId: string;
    /** Graded reading passage id. */
    readingPassageId: string;
    /** Strategy card ids for the focus skill. */
    strategyIds: string[];
  };
  /** Milestone description, or `null` for ordinary weeks. */
  milestone: string | null;
};

/** A deterministic, heuristic study plan between two band scores. */
export type StudyPlan = {
  /** Current band score. */
  current: number;
  /** Target band score. */
  target: number;
  /** Band gap the plan addresses. */
  gap: number;
  /** Plan length in weeks. */
  weeks: number;
  /** Total study hours per week. */
  hoursPerWeek: number;
  /** Indicative CEFR level of the target band. */
  targetCefr: string;
  /** Skills the candidate flagged as weak. */
  focus: string[];
  /** One entry per week. */
  weekly: StudyPlanWeek[];
  /** The heuristics behind the allocation, so the plan is auditable. */
  assumptions: string[];
};

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

/** Query-string parameters. */
export type QueryParams = Record<string, string | string[] | undefined>;

/** A serialisable value returned by the API. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | readonly JsonValue[] | { [key: string]: JsonValue };

/** Envelope used for every JSON response. */
export type ApiResponse = {
  /** HTTP status code, repeated in the body for offline consumers. */
  status: number;
  /** Response payload. */
  data: JsonValue;
  /** Provenance and usage metadata. */
  meta: Record<string, JsonValue>;
};

/** Description of an exposed route, used for discovery and OpenAPI. */
export type RouteInfo = {
  /** HTTP method. */
  method: 'GET';
  /** Path template. */
  path: string;
  /** Short summary. */
  summary: string;
  /** Whether the route is part of the versioned `/v1` contract. */
  versioned: boolean;
};
