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
/* Practice-test index                                                        */
/* -------------------------------------------------------------------------- */

/** Practice collections indexed by `/v1/tests`. */
export type PracticeCollection = 'reading-full-test' | 'listening-full-test' | 'graded-reading';

/** CEFR bands used by the graded reading collection. */
export type CefrBand = 'A1-A2' | 'B1-B2' | 'C1-C2';

/** Canonical IELTS question-type identifiers. */
export type QuestionTypeId =
  | 'multiple-choice'
  | 'multiple-choice-multiple-answer'
  | 'true-false-not-given'
  | 'yes-no-not-given'
  | 'matching'
  | 'matching-information'
  | 'matching-headings'
  | 'matching-features'
  | 'matching-sentence-endings'
  | 'sentence-completion'
  | 'summary-completion'
  | 'diagram-label-completion'
  | 'short-answer';

/** Readability statistics computed from a passage. */
export type ReadabilityStats = {
  /** Running words (alphabetic tokens). */
  words: number;
  /** Sentence count. */
  sentences: number;
  /** Distinct lower-cased word forms. */
  distinctWords: number;
  /** Mean sentence length in words. */
  avgSentenceLength: number;
  /** Mean syllables per word (heuristic count). */
  avgSyllablesPerWord: number;
  /** Mean word length in characters. */
  avgWordLength: number;
  /** Type-token ratio (lexical diversity). */
  typeTokenRatio: number;
  /** Flesch Reading Ease (higher is easier). */
  fleschReadingEase: number;
  /** Flesch-Kincaid grade level. */
  fleschKincaidGrade: number;
};

/** Which companion assets the upstream item ships with. */
export type PracticeAssets = {
  /** Whether an audio recording accompanies the item. */
  audio: boolean;
  /** Number of figures shipped with the item. */
  images: number;
  /** Whether per-question strategy annotations exist upstream. */
  strategies: boolean;
  /** Whether a word-processor version of the item exists upstream. */
  documents: boolean;
};

/** One indexed practice test or graded reading lesson. */
export type PracticeItem = {
  /** Stable identifier (`rft-001`, `lft-014`, `grd-c1c2-320`). */
  id: string;
  /** Collection the item belongs to. */
  collection: PracticeCollection;
  /** Skill assessed. */
  skill: 'reading' | 'listening';
  /** Ordinal of the item inside its upstream collection. */
  number: number;
  /** Item title as published upstream. */
  title: string;
  /** CEFR band for graded lessons; `null` for unrated full tests. */
  level: CefrBand | null;
  /** Number of sections or parts. */
  sections: number;
  /** Number of passages or listening contexts. */
  passages: number;
  /** Total number of questions. */
  questions: number;
  /** Canonical question types present, sorted. */
  questionTypes: QuestionTypeId[];
  /** Question count per canonical type. */
  typeCounts: Partial<Record<QuestionTypeId, number>>;
  /** Number of glossed vocabulary items shipped with the lesson. */
  vocabularyCount: number;
  /** Suggested time budget in seconds, when published. */
  timeLimitSeconds: number | null;
  /** Passage readability, or `null` when not applicable (listening) or too short. */
  readability: ReadabilityStats | null;
  /** Companion assets available upstream. */
  assets: PracticeAssets;
  /** Path of the source file inside the upstream repository. */
  sourcePath: string;
  /** Git blob SHA-1 of the source file. */
  sha1: string | null;
  /** Size of the source file in bytes. */
  sizeBytes: number;
  /** Public URL of the source file. */
  sourceUrl: string;
};

/** Five-number summary of a numeric sample. */
export type NumericSummary = {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
};

/** Readability summaries for one group of items. */
export type ReadabilitySummary = {
  fleschReadingEase: NumericSummary | null;
  fleschKincaidGrade: NumericSummary | null;
  words: NumericSummary | null;
};

/** How one upstream free-text label was normalised. */
export type RawLabelMapping = {
  /** Canonical question type the label maps onto. */
  canonical: QuestionTypeId;
  /** Number of upstream questions carrying the label. */
  occurrences: number;
};

/** Aggregate statistics over the practice-test index. */
export type PracticeStats = {
  /** Items published upstream (including those without machine-readable structure). */
  upstreamItems: number;
  /** Items indexed here. */
  indexedItems: number;
  /** `indexedItems / upstreamItems`. */
  coverageRatio: number;
  /** Upstream files that could not be parsed. */
  unreadableSources: number;
  /** Total number of indexed questions. */
  questions: number;
  /** Distribution of questions per item. */
  questionsPerItem: NumericSummary | null;
  /** Item count per collection. */
  byCollection: Record<string, number>;
  /** Item count per skill. */
  bySkill: Record<string, number>;
  /** Item count per CEFR band (`unrated` for full tests). */
  byLevel: Record<string, number>;
  /** Question count per canonical type. */
  questionTypes: Partial<Record<QuestionTypeId, number>>;
  /** Question count per canonical type, split by skill. */
  questionTypesBySkill: Record<string, Partial<Record<QuestionTypeId, number>>>;
  /** Readability summaries per CEFR band and per full-test collection. */
  readabilityByGroup: Record<string, ReadabilitySummary>;
  /** The upstream label to canonical type normalisation, with frequencies. */
  rawLabels: Record<string, RawLabelMapping>;
};

/* -------------------------------------------------------------------------- */
/* Question-type taxonomy and exam themes                                     */
/* -------------------------------------------------------------------------- */

/** A canonical IELTS question type, with pedagogy and observed frequency. */
export type QuestionType = {
  /** Canonical identifier. */
  id: QuestionTypeId;
  /** Name used by the IELTS partners' public task descriptions. */
  name: string;
  /** Skills in which the task family occurs. */
  skills: ('reading' | 'listening')[];
  /** Task family the type belongs to. */
  family: 'selection' | 'identification' | 'matching' | 'completion' | 'labelling';
  /** What the candidate is asked to do. */
  description: string;
  /** The sub-skill the task family assesses. */
  assesses: string;
  /** Recommended procedure, as ordered steps. */
  strategy: string[];
  /** Recurring traps and how they are set. */
  traps: string[];
  /** Constraints on the expected answer. */
  answerFormat: string;
  /** Whether answers usually follow the order of the text. */
  followsTextOrder: boolean;
};

/** A recurring IELTS exam theme. */
export type ExamTheme = {
  /** Stable identifier (`th-01`). */
  id: string;
  /** Thematic group. */
  group: string;
  /** Theme name. */
  name: string;
  /** Sub-topics and collocations that recur with the theme. */
  keywords: string[];
  /** Papers in which the theme is commonly set. */
  skills: Skill[];
};

/* -------------------------------------------------------------------------- */
/* Study plans and quizzes                                                    */
/* -------------------------------------------------------------------------- */

/** Phases of the four-phase study plan. */
export type PlanPhase = 'foundation' | 'skill-build' | 'exam-practice' | 'assessment-taper';

/** How an activity contributes to preparation. */
export type ActivityCategory = 'technique' | 'drill' | 'experience';

/** One entry of the study-activity catalogue. */
export type StudyActivity = {
  /** Stable identifier (`listening-dictation`). */
  id: string;
  /** Skill trained; `general` covers exam-experience activities. */
  skill: Skill | 'general';
  /** Technique, timed drill or exam-experience habit. */
  category: ActivityCategory;
  /** Short human-readable title. */
  title: string;
  /** One-paragraph description of the method and why it works. */
  summary: string;
  /** Recommended session length in minutes. */
  minutes: number;
  /** Lowest band score the activity is designed for. */
  minBand: number;
  /** Highest band score the activity is designed for. */
  maxBand: number;
  /** Plan phases during which the activity may be scheduled. */
  phases: PlanPhase[];
  /** Numbered instructions, in order. */
  steps: string[];
  /**
   * API path template that materialises the session's material, with
   * `{seed}` and `{date}` placeholders; `null` when the session needs none.
   */
  endpoint: string | null;
};

/** Weekly minutes assigned to one skill. */
export type SkillAllocation = {
  /** Skill allocated. */
  skill: Skill;
  /** Current band in that skill. */
  current: number;
  /** Target minus current, floored at zero. */
  gap: number;
  /** Unnormalised weight used for the allocation. */
  weight: number;
  /** Minutes per week scheduled for the skill (multiples of five). */
  minutesPerWeek: number;
};

/** Feasibility estimate produced by the study-time model. */
export type PlanFeasibility = {
  /** Mean of the current component bands. */
  currentMean: number;
  /** Target overall band. */
  target: number;
  /** Bands to gain (never negative). */
  gap: number;
  /** Indicative guided-study hours per 0.5-band increase at the current level. */
  hoursPerHalfBand: number;
  /** Hours implied by the gap at this rate. */
  requiredHours: number;
  /** Weeks needed when studying `hoursPerWeek` per week. */
  weeksRequired: number;
  /** Hours the candidate proposes to spend in total. */
  availableHours: number;
  /** Band gain achievable in the proposed time at the model rate. */
  projectedGain: number;
  /** Model verdict for the proposed schedule. */
  verdict: 'at-target' | 'achievable' | 'ambitious' | 'insufficient-time';
};

/** One scheduled study session inside a plan week. */
export type PlanSession = {
  /** Day of the study week (1-7). */
  day: number;
  /** Calendar date of the session (ISO). */
  date: string;
  /** Skill trained, or `general` for experience anchors. */
  skill: Skill | 'general';
  /** Catalogue activity performed. */
  activityId: string;
  /** Activity title, copied for readability. */
  title: string;
  /** Minutes budgeted for this session. */
  minutes: number;
  /** Material endpoint for this exact session, or `null`. */
  endpoint: string | null;
};

/** One week of a study plan. */
export type PlanWeek = {
  /** One-based week number. */
  week: number;
  /** Phase of the plan this week sits in. */
  phase: PlanPhase;
  /** Skills with an unresolved gap (all four when the target is already met). */
  focus: Skill[];
  /** Scheduled minutes, equal to the weekly budget. */
  totalMinutes: number;
  /** Sessions in day order. */
  sessions: PlanSession[];
};

/** A generated study plan. */
export type StudyPlan = {
  /** Seed that made this plan deterministic. */
  seed: string;
  /** First Monday-style start date (ISO). */
  startDate: string;
  /** Rest days dropped from each week. */
  restDays: number;
  /** Study days per week. */
  studyDays: number;
  /** Current component bands. */
  current: Record<Skill, number>;
  /** Mean of the current component bands. */
  currentMean: number;
  /** Target overall band. */
  target: number;
  /** Length of the plan in weeks. */
  durationWeeks: number;
  /** Nominal weekly study time. */
  hoursPerWeek: number;
  /** Feasibility assessment for the proposed schedule. */
  feasibility: PlanFeasibility;
  /** Per-skill weekly minute shares. */
  allocations: SkillAllocation[];
  /** The schedule, one entry per week. */
  schedule: PlanWeek[];
  /** Aggregates over every session. */
  totals: {
    sessions: number;
    minutes: number;
    bySkill: Record<string, number>;
  };
  /** Methodology notes explaining every modelling choice. */
  methodology: string[];
};

/** Drill format for the seeded vocabulary quiz. */
export type QuizMode = 'word-to-definition' | 'definition-to-word' | 'spelling';

/** A generated quiz item; answer-bearing fields are `null` when withheld. */
export type QuizItem = {
  /** Stable identifier (`seed:position:entryId`). */
  id: string;
  /** Vocabulary entry the item was generated from. */
  wordId: string;
  /** Drill format. */
  mode: QuizMode;
  /** Question text shown to the candidate. */
  prompt: string;
  /** Answer options; empty in spelling mode. */
  options: string[];
  /** Correct option text, or the headword in spelling mode. */
  answer: string | null;
  /** Index of the correct option; `null` in spelling mode or when withheld. */
  answerIndex: number | null;
  /** Definition of the tested headword, withheld together with the key. */
  explanation: string | null;
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
