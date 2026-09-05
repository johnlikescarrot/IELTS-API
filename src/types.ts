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
/* Raw-score conversion                                                       */
/* -------------------------------------------------------------------------- */

/** Objective papers that publish a raw-score conversion table. */
export type RawScoreModuleId = 'listening' | 'reading-academic' | 'reading-general-training';

/** One row of a raw-score conversion table: a range of correct answers maps to one band. */
export type RawScoreBand = {
  /** Inclusive lower bound of correct answers. */
  min: number;
  /** Inclusive upper bound of correct answers. */
  max: number;
  /** Band the range converts to. */
  band: BandScore;
};

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
/* Text analysis and study planning                                           */
/* -------------------------------------------------------------------------- */

/** Band-descriptor criteria a heuristic hint can relate to. */
export type DescriptorCriterion =
  'task-response' | 'coherence-and-cohesion' | 'lexical-resource' | 'grammatical-range-and-accuracy';

/** How urgently a heuristic hint applies. */
export type HintLevel = 'strength' | 'watch';

/** A descriptor-aligned heuristic observation about a candidate text. */
export type ProfileHint = {
  /** Descriptor criterion the observation relates to. */
  criterion: DescriptorCriterion;
  /** `strength` when the text clears the threshold, `watch` when it falls short. */
  level: HintLevel;
  /** Original, self-contained guidance. */
  message: string;
};

/** Base counts and averages computed for any analysable text. */
export type TextProfile = {
  /** Characters received (before analysis). */
  characters: number;
  /** Running words (alphabetic tokens, numerals excluded). */
  words: number;
  /** Sentence count. */
  sentences: number;
  /** Non-empty paragraphs (separated by blank lines). */
  paragraphs: number;
  /** Mean sentence length in words. */
  avgWordsPerSentence: number;
  /** Mean word length in characters. */
  avgWordLength: number;
  /** Population standard deviation of sentence lengths in words. */
  sentenceLengthStdDev: number;
  /** Share of words with three or more syllables. */
  longWordShare: number;
  /** Mean syllables per word (heuristic count). */
  syllablesPerWord: number;
};

/** Comparison of a text against the corpus groups indexed by `/v1/tests`. */
export type CorpusContext = {
  /** Corpus group with the mean reading ease closest to the text. */
  group: string;
  /** Mean Flesch Reading Ease of that group. */
  meanReadingEase: number;
  /** Absolute distance between the text and the group mean. */
  distance: number;
  /** Mean Flesch-Kincaid grade of that group. */
  meanGrade: number;
};

/** Response of `/v1/tools/readability`. */
export type ReadabilityReport = {
  /** Text statistics. */
  profile: TextProfile;
  /** Flesch Reading Ease (higher is easier), rounded to 2 decimals. */
  fleschReadingEase: number;
  /** Flesch-Kincaid grade level, rounded to 2 decimals. */
  fleschKincaidGrade: number;
  /** Interpretive label for the reading-ease score. */
  level: { label: string; description: string };
  /** Nearest corpus group from the practice-test index. */
  corpusContext: CorpusContext;
};

/** Lexical measures for one candidate text. */
export type LexicalProfile = {
  /** Running words. */
  tokens: number;
  /** Distinct lower-cased word forms. */
  types: number;
  /** Type-token ratio. */
  typeTokenRatio: number;
  /** Guiraud's root type-token ratio: `types / sqrt(tokens)`. */
  rootTtr: number;
  /** Share of tokens with three or more syllables. */
  longWordShare: number;
  /** Tokens found in the Cambridge IELTS headword list. */
  headwordTokens: number;
  /** `headwordTokens / tokens`. */
  headwordCoverage: number;
};

/** Length measures for one candidate text. */
export type LengthProfile = {
  /** Words, sentences and paragraphs. */
  words: number;
  sentences: number;
  paragraphs: number;
  /** Minimum words the chosen task demands. */
  minimumWords: number;
  /** Whether the text meets the minimum. */
  meetsMinimum: boolean;
};

/** A recurring theme detected in a candidate text. */
export type ThemeMatch = {
  /** Theme identifier (`th-01`). */
  id: string;
  /** Thematic group. */
  group: string;
  /** Theme name. */
  name: string;
  /** Keywords of the theme found in the text. */
  matchedKeywords: string[];
  /** Total occurrences of matched keywords. */
  occurrences: number;
};

/** Response of `/v1/tools/essay-profile`. */
export type EssayProfile = {
  /** Task the text was written for. */
  task: 'task1' | 'task2';
  /** Length measures and the task minimum. */
  length: LengthProfile;
  /** Lexical diversity and headword coverage. */
  lexical: LexicalProfile;
  /** Sentence-length measures. */
  sentences: { count: number; avgLength: number; stdDev: number; shortest: number; longest: number };
  /** Recurring themes detected, strongest first. */
  themes: ThemeMatch[];
  /** Descriptor-aligned heuristic hints, strongest observations first. */
  hints: ProfileHint[];
  /** Number of `strength` hints. */
  strengths: number;
  /** Number of `watch` hints. */
  watches: number;
};

/** Gap between a current component score and the target, with study hours. */
export type StudyGap = {
  /** Component. */
  skill: Skill;
  /** Current (or defaulted) band. */
  from: number;
  /** Target band. */
  to: number;
  /** `to - from`, clipped at 0. */
  gap: number;
  /** Share of weekly hours assigned to the component. */
  share: number;
  /** Weekly hours assigned to the component. */
  hoursPerWeek: number;
};

/** One checkpoint inside the study plan. */
export type StudyCheckpoint = {
  /** `full-mock` or `final-review`. */
  type: 'full-mock' | 'final-review';
  /** What to sit and how to use the result. */
  detail: string;
};

/** One study activity for a week. */
export type StudyActivity = {
  /** What kind of activity it is. */
  kind: 'question-type' | 'practice-index' | 'writing-task' | 'speaking-part';
  /** Display name. */
  name: string;
  /** Related API endpoint for the activity. */
  url: string;
};

/** One week of the study plan. */
export type StudyWeek = {
  /** 1-based week number. */
  week: number;
  /** Phase the week belongs to. */
  phase: 'foundation' | 'practice' | 'polish';
  /** Component receiving the largest single block of practice this week. */
  focus: Skill;
  /** Weekly hours per component. */
  hours: Record<Skill, number>;
  /** Recurring themes to study this week. */
  themes: { id: string; group: string; name: string }[];
  /** Concrete activities, each linked to an endpoint. */
  practice: StudyActivity[];
  /** Vocabulary workload. */
  vocabulary: { newWords: number; reviewWords: number };
  /** Scheduled checkpoint, or `null`. */
  checkpoint: StudyCheckpoint | null;
};

/** One phase of the study plan. */
export type StudyPhase = {
  /** Phase name. */
  name: 'foundation' | 'practice' | 'polish';
  /** First week of the phase (inclusive). */
  fromWeek: number;
  /** Last week of the phase (inclusive). */
  toWeek: number;
  /** What the phase emphasises. */
  emphasis: string;
};

/** Response of `/v1/study/plan`. */
export type StudyPlan = {
  /** Validated and defaulted inputs. */
  inputs: {
    target: number;
    weeks: number;
    hoursPerWeek: number;
    wordsPerDay: number;
    /** Components supplied in the query string. */
    providedComponents: Skill[];
    /** Components filled with the default baseline. */
    defaultedComponents: Skill[];
  };
  /** Current standing. */
  current: { components: Record<Skill, number>; overall: number; cefr: string };
  /** The target band and its CEFR level. */
  target: { band: number; cefr: string };
  /** Per-component gaps and weekly hours. */
  gaps: StudyGap[];
  /** Phase structure of the plan. */
  phases: StudyPhase[];
  /** Week-by-week schedule. */
  weekly: StudyWeek[];
  /** Vocabulary workload over the whole plan. */
  vocabulary: {
    headwordsAvailable: number;
    wordsPerDay: number;
    wordsPerWeek: number;
    headwordsOverPlan: number;
  };
  /** Method notes. */
  notes: string[];
};

/* -------------------------------------------------------------------------- */
/* Study-materials index                                                      */
/* -------------------------------------------------------------------------- */

/** One file in the indexed study-materials collection. */
export type MaterialsItem = {
  /** Slugified identifier. */
  id: string;
  /** Path inside the upstream repository. */
  path: string;
  /** Human-readable title. */
  title: string;
  /** Material category assigned by the classification rules. */
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

/** Aggregated statistics about the study-materials collection. */
export type MaterialsStats = {
  filesInRepository: number;
  excludedFiles: number;
  indexedFiles: number;
  indexedBytes: number;
  byCategory: Record<string, number>;
  bySkill: Record<string, number>;
  byFormat: Record<string, number>;
};

/* -------------------------------------------------------------------------- */
/* Response frameworks                                                        */
/* -------------------------------------------------------------------------- */

/** The response formats covered by the framework taxonomy. */
export type FrameworkSection = 'writing-task-2' | 'speaking-part-2' | 'speaking-part-3';

/** One stage of a response framework. */
export type FrameworkStage = {
  /** Where the stage sits in the response (e.g. `Introduction`). */
  position: string;
  /** What the stage must achieve. */
  purpose: string;
  /** Concrete moves the candidate makes, in order. */
  moves: string[];
  /** Exemplar cue language for the stage (original to this project). */
  language: string[];
};

/** A reusable response framework for a productive task. */
export type ResponseFramework = {
  /** Stable identifier (`w2-concession-rebuttal`). */
  id: string;
  /** Response format the framework addresses. */
  section: FrameworkSection;
  /** Skill the framework belongs to. */
  skill: 'writing' | 'speaking';
  /** Short name. */
  name: string;
  /** One-paragraph description of the framework's logic. */
  summary: string;
  /** Essay question families the framework fits (`type` in `/v1/topics/writing`). */
  questionTypes: EssayQuestionType[];
  /** Speaking parts the framework fits (1-3). */
  speakingParts: number[];
  /** Ordered stages of the response. */
  stages: FrameworkStage[];
  /** Recurring ways candidates lose marks when applying the framework. */
  pitfalls: string[];
  /** Suggested time budget in minutes, when the format fixes one. */
  suggestedMinutes: number | null;
  /** Suggested length in words, when the format fixes one. */
  suggestedWords: number | null;
};

/* -------------------------------------------------------------------------- */
/* Cross-dataset search                                                       */
/* -------------------------------------------------------------------------- */

/** Datasets participating in the cross-dataset search. */
export type SearchDatasetId =
  | 'vocabulary'
  | 'writing-topics'
  | 'speaking-topics'
  | 'task-types'
  | 'question-types'
  | 'frameworks'
  | 'themes'
  | 'resources'
  | 'corpus'
  | 'materials'
  | 'tests';

/** One cross-dataset search hit. */
export type SearchHit = {
  /** Stable identifier of the item inside its dataset (word, id or slug). */
  ref: string;
  /** Dataset the item belongs to. */
  dataset: SearchDatasetId;
  /** Primary display text of the item. */
  title: string;
  /** Secondary context (definition, category, path), clipped to one line, or `null`. */
  snippet: string | null;
  /** Most specific API URL that returns the item (item-level when one exists). */
  url: string;
  /** Deterministic rank score: 4 exact, 3 prefix, 2 substring, 1 secondary field. */
  score: number;
  /** Whether the query matched the primary or a secondary field. */
  field: 'primary' | 'secondary';
};

/** Search outcome for one dataset. */
export type DatasetSearch = {
  /** Human-readable dataset name. */
  label: string;
  /** Browse endpoint of the dataset. */
  endpoint: string;
  /** Total matching items (before truncation). */
  total: number;
  /** Highest-ranked hits, truncated to the requested limit. */
  items: SearchHit[];
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
