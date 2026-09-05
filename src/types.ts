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
/* Skills, question types and strategies                                      */
/* -------------------------------------------------------------------------- */

/** One part of a skill's test (section, passage, task or speaking part). */
export type SkillPartFormat = {
  /** Human-readable part name. */
  name: string;
  /** What candidates are asked to do in this part. */
  focus: string;
  /** Approximate minutes spent on the part, when fixed. */
  minutes: number | null;
  /** Number of questions in the part, when the part is question-based. */
  questionCount: number | null;
};

/** The published format of one IELTS skill. */
export type SkillFormat = {
  /** Skill identifier. */
  id: Skill;
  /** Display name. */
  name: string;
  /** One-sentence overview. */
  summary: string;
  /** IELTS modules the format applies to. */
  modules: Array<'academic' | 'general-training'>;
  /** Approximate total time in minutes (audio time, not transfer time). */
  minutes: number;
  /** Number of questions, or `null` for non-standardised skills. */
  questionCount: number | null;
  /** Constituent parts. */
  parts: SkillPartFormat[];
  /** Additional facts about timing, delivery and marking. */
  notes: string[];
  /** How the skill is scored. */
  scoringNote: string;
};

/** How a question is answered. */
export type QuestionResponseFormat = 'selection' | 'written';

/** The three-phase playbook attached to every question type. */
export type QuestionTypePlaybook = {
  /** What to do in the reading/preview time before the text or recording. */
  anticipate: string[];
  /** What to do while listening or reading. */
  during: string[];
  /** What to do in the checking time afterwards. */
  check: string[];
};

/** A machine-readable IELTS Listening/Reading question type. */
export type QuestionTypeData = {
  /** Stable slug identifier. */
  id: string;
  /** Official-style name. */
  name: string;
  /** Alternative names printed in past papers. */
  alsoCalledAs: string[];
  /** Skills in which the type appears. */
  skills: Array<'listening' | 'reading'>;
  /** Selection (choose from given options) versus written response. */
  responseFormat: QuestionResponseFormat;
  /** Rules governing the answer sheet response. */
  answerRules: string[];
  /** Phase-by-phase strategy playbook. */
  playbook: QuestionTypePlaybook;
  /** Typical distractor mechanisms for this type. */
  distractorPatterns: string[];
  /** Frequent candidate errors. */
  pitfalls: string[];
};

/* -------------------------------------------------------------------------- */
/* Reading topics                                                             */
/* -------------------------------------------------------------------------- */

/** Skills and tasks a recurring IELTS topic is commonly tested in. */
export type TopicSurface = 'reading' | 'listening' | 'writing-task-2' | 'speaking-part-2' | 'speaking-part-3';

/** A high-frequency IELTS topic with an original collocation bank. */
export type ReadingTopic = {
  /** Stable slug identifier. */
  id: string;
  /** Position in the frequency ranking (1 is most frequent). */
  rank: number;
  /** Thematic group. */
  group: string;
  /** Topic title. */
  title: string;
  /** Lexical chunks with short glosses. */
  collocations: string[];
  /** A discussion or cue-card prompt built around the topic. */
  studyPrompt: string;
  /** Where the topic is commonly encountered. */
  commonIn: TopicSurface[];
};

/* -------------------------------------------------------------------------- */
/* Raw-score conversion                                                       */
/* -------------------------------------------------------------------------- */

/** Identifiers of the raw-mark tables. */
export type RawScoreTableId = 'listening' | 'reading-academic' | 'reading-general-training';

/** One row of a raw-mark to band table. */
export type RawBandRow = {
  /** Lowest raw mark in the row. */
  min: number;
  /** Highest raw mark in the row. */
  max: number;
  /** Indicative band score. */
  band: number;
};

/* -------------------------------------------------------------------------- */
/* Open practice content catalog                                              */
/* -------------------------------------------------------------------------- */

/** Whether a collection contains graded lessons or whole tests. */
export type CatalogTier = 'basic' | 'full-test';

/** Kind of upstream file an artifact points at. */
export type CatalogArtifactKind =
  | 'questions-json'
  | 'strategies-json'
  | 'processed-json'
  | 'player-html'
  | 'player-index'
  | 'audio'
  | 'lesson-data-js'
  | 'lesson-data-json'
  | 'source-docx';

/** One artifact (file) that may exist for a catalog entry. */
export type CatalogArtifactSpec = {
  /** Stable name, e.g. `questionsJson`. */
  name: string;
  /** File kind. */
  kind: CatalogArtifactKind;
  /** Repository-relative path with `{level}`, `{lesson}`, `{pad}` or `{test}` placeholders. */
  pathTemplate: string;
  /** Human-readable description of the artifact. */
  description: string;
  /** Short `[min, max]` global-entry ranges in which the artifact exists upstream. */
  present: Array<[number, number]>;
};

/** Size of one level of a basic collection. */
export type CatalogLevel = {
  /** Level name as used upstream (e.g. `A1-A2`). */
  name: string;
  /** Number of lessons at this level. */
  count: number;
};

/** One indexed collection of the upstream open practice repository. */
export type CatalogCollection = {
  /** Stable identifier. */
  id: string;
  /** Skill the collection practises. */
  skill: 'listening' | 'reading';
  /** Lessons or whole tests. */
  tier: CatalogTier;
  /** Display title. */
  title: string;
  /** What the collection contains. */
  description: string;
  /** Repository-relative root directory. */
  basePath: string;
  /** Directory per entry, or `null` when entries are plain files. */
  entryDirectory: string | null;
  /** Levels of a basic collection; empty for full tests. */
  levels: CatalogLevel[];
  /** Total entries in the collection (lessons or test numbers). */
  totalEntries: number;
  /** Files that may exist per entry. */
  artifacts: CatalogArtifactSpec[];
};

/** A resolved artifact with concrete upstream URLs. */
export type CatalogEntryArtifact = {
  /** Stable artifact name. */
  name: string;
  /** File kind. */
  kind: CatalogArtifactKind;
  /** Whether the file exists for this entry. */
  available: boolean;
  /** Repository-relative path, or `null` when unavailable. */
  path: string | null;
  /** Raw download URL, or `null` when unavailable. */
  rawUrl: string | null;
  /** GitHub blob URL, or `null` when unavailable. */
  blobUrl: string | null;
};

/** One fully resolved lesson or test of a catalog collection. */
export type CatalogEntry = {
  /** Stable identifier, e.g. `listening-204-full-test-0057`. */
  id: string;
  /** Owning collection identifier. */
  collection: string;
  /** Global position within the collection (1-based). */
  index: number;
  /** Level name for basic collections, `null` for full tests. */
  level: string | null;
  /** Position within the level, `null` for full tests. */
  indexWithinLevel: number | null;
  /** Upstream test number or lesson number. */
  number: number;
  /** Repository-relative directory of the entry. */
  directory: string;
  /** GitHub tree URL for the entry directory (repository root when flat). */
  treeUrl: string;
  /** Files that may exist for this entry. */
  artifacts: CatalogEntryArtifact[];
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
