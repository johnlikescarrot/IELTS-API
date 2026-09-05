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
/* Open practice corpus                                                       */
/* -------------------------------------------------------------------------- */

/** The families of material indexed in the open practice corpus. */
export type PracticeSeries = 'listening-102' | 'listening-204' | 'reading-1232' | 'reading-315';

/** Whether an indexed item is a graded lesson or a complete test. */
export type PracticeKind = 'lesson' | 'full-test';

/** File-availability flags for one indexed upstream item. */
export type PracticeFlags = {
  /** An `audio.mp3` / `audio_N.mp3` file exists next to the item. */
  audio: boolean;
  /** A normalised `*_processed.json` variant exists next to the item. */
  processed: boolean;
  /** A `strategies.json` worked-guide file exists next to the item. */
  strategies: boolean;
};

/** One indexed item of the open practice corpus (metadata only). */
export type PracticeItem = {
  /** Stable, unique identifier (upstream id where one exists). */
  id: string;
  /** Series the item belongs to. */
  series: PracticeSeries;
  /** IELTS skill the item practises. */
  skill: Skill;
  /** Graded lesson or complete test. */
  kind: PracticeKind;
  /** Level lane (`Basic`, `A1-A2`, ...), or `null` when ungraded. */
  level: string | null;
  /** Number within the series (per level for levelled series). */
  number: number;
  /** Word tokens in the reading prompt, or `null` when not applicable. */
  words: number | null;
  /** Number of questions, or `null` when the source does not expose them. */
  questions: number | null;
  /** Normalised item-type labels used by the questions of this item. */
  types: string[];
  /** Upstream file-availability flags. */
  flags: PracticeFlags;
  /** Path of the item's source file inside the upstream repository. */
  upstreamPath: string;
  /** Public URL of that file in the upstream repository. */
  sourceUrl: string;
};

/** Facts about one series of the practice corpus. */
export type PracticeSeriesFacts = {
  /** Series identifier. */
  id: PracticeSeries;
  /** Skill the series practises. */
  skill: Skill;
  /** Item kind. */
  kind: PracticeKind;
  /** Directory of the series inside the upstream repository. */
  upstreamPath: string;
  /** Number of items the upstream project advertises. */
  advertised: number;
  /** Number of machine-readable items actually published. */
  published: number;
  /** Item numbers missing inside the published numbering range. */
  gaps: number[];
  /** `published / advertised`. */
  coverageRatio: number;
  /** Level lanes of the series, empty when ungraded. */
  levels: string[];
  /** Mean questions per item, or `null` when unknown. */
  meanQuestions: number | null;
  /** Mean words per item, or `null` when unknown. */
  meanWords: number | null;
  /** Items with an accompanying audio file. */
  withAudio: number;
  /** Items with a normalised `_processed.json` variant. */
  withProcessed: number;
  /** Items with a `strategies.json` worked guide. */
  withStrategies: number;
};

/** Count/mean/median/min/max summary of an integer-valued measure. */
export type PracticeMeasure = {
  /** Number of items contributing. */
  count: number;
  /** Arithmetic mean, two decimals. */
  mean: number;
  /** Median, two decimals. */
  median: number;
  /** Minimum. */
  min: number;
  /** Maximum. */
  max: number;
};

/** Aggregated statistics over the practice-corpus index. */
export type PracticeStats = {
  /** Indexed items. */
  items: number;
  /** Items per series. */
  bySeries: Record<string, number>;
  /** Items per skill. */
  bySkill: Record<string, number>;
  /** Items per kind. */
  byKind: Record<string, number>;
  /** Items per level lane. */
  levels: Record<string, number>;
  /** Reading-prompt lengths across all graded items. */
  words: PracticeMeasure;
  /** Reading-prompt lengths of the graded reading lessons, per CEFR band. */
  wordsByLevel: Record<string, PracticeMeasure>;
  /** Reading-prompt length histogram in 50-word buckets, keyed by lower edge. */
  wordsHistogram: Record<string, number>;
  /** Question counts. */
  questions: { total: number; bySeries: Record<string, number> };
  /** Item questions per normalised type label, most frequent first. */
  typeFrequency: Record<string, number>;
  /** Number of distinct normalised type labels observed upstream. */
  normalisedTypeLabels: number;
};

/** One family of the curated item-type taxonomy. */
export type PracticeItemType = {
  /** Taxonomy identifier. */
  id: string;
  /** Human-readable task name. */
  label: string;
  /** Skills in which the task type officially occurs. */
  skills: Skill[];
  /** Original one-line description of what the candidate must do. */
  description: string;
  /** Normalised upstream labels folded into this family. */
  aliases: string[];
  /** Questions in the index carrying one of the aliases. */
  occurrences: number;
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

/** HTTP methods the API serves. */
export type HttpMethod = 'GET' | 'POST';

/** Description of an exposed route, used for discovery and OpenAPI. */
export type RouteInfo = {
  /** HTTP method. */
  method: HttpMethod;
  /** Path template. */
  path: string;
  /** Short summary. */
  summary: string;
  /** Whether the route is part of the versioned `/v1` contract. */
  versioned: boolean;
};
