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
/* Raw-score conversion                                                       */
/* -------------------------------------------------------------------------- */

/** The objectively marked components, each with its own conversion table. */
export type RawScoreComponent = 'listening' | 'reading-academic' | 'reading-general-training';

/** One row of a raw-score to band-score conversion table. */
export type RawBandRow = {
  /** Band awarded for a raw score inside this row. */
  band: BandScore;
  /** Lowest raw score mapping to this band, inclusive. */
  min: number;
  /** Highest raw score mapping to this band, inclusive. */
  max: number;
  /**
   * Whether the boundary is reproduced from widely agreeing public tables
   * (`published`) or inferred by this project to make the table exhaustive
   * (`extrapolated`).
   */
  basis: 'published' | 'extrapolated';
  /** Competing boundary published elsewhere, or `null` where sources agree. */
  disagreement: string | null;
};

/** A complete raw-score to band-score conversion table. */
export type RawScoreTable = {
  /** Component this table converts. */
  component: RawScoreComponent;
  /** Human-readable name. */
  name: string;
  /** Skill assessed. */
  skill: 'listening' | 'reading';
  /** Module the table applies to. */
  module: 'both' | 'academic' | 'general-training';
  /** Number of scored questions. */
  questions: number;
  /** How the table should be interpreted. */
  provenance: 'indicative';
  /** Caveat surfaced in every response that uses this table. */
  note: string;
  /** Rows, ordered from band 9 downwards and exhaustive over 0-40. */
  rows: readonly RawBandRow[];
};

/* -------------------------------------------------------------------------- */
/* Question types and test format                                             */
/* -------------------------------------------------------------------------- */

/** Skills whose papers are built from a closed question-type taxonomy. */
export type QuestionTypeSkill = 'listening' | 'reading';

/** How an answer to a question type is recorded. */
export type AnswerFormat =
  'letter' | 'letters' | 'words-from-text' | 'number' | 'true-false-not-given' | 'yes-no-not-given';

/** One question type of the Listening or Reading paper. */
export type QuestionType = {
  /** Stable identifier, e.g. `reading-matching-headings`. */
  id: string;
  /** Skill the type belongs to. */
  skill: QuestionTypeSkill;
  /** Published name of the question type. */
  name: string;
  /** What the candidate is asked to do. */
  description: string;
  /** The construct the type is designed to measure. */
  tests: string;
  /** How the answer is recorded. */
  answerFormat: AnswerFormat;
  /** Whether the answers follow the order of the text or recording. */
  ordered: boolean;
  /** Listening parts or Reading passages in which the type typically appears. */
  appearsIn: readonly number[];
  /** Original strategy notes. */
  strategy: readonly string[];
  /** Original notes on the errors this type provokes. */
  pitfalls: readonly string[];
};

/** The papers a candidate can sit. */
export type TestModule =
  | 'listening'
  | 'reading-academic'
  | 'reading-general-training'
  | 'writing-academic'
  | 'writing-general-training'
  | 'speaking';

/** One part, section or passage of a paper. */
export type TestPart = {
  /** Part number, counting from 1. */
  number: number;
  /** Part name. */
  name: string;
  /** Number of scored items in the part. */
  items: number;
  /** What the part contains. */
  description: string;
  /** Register of the language used. */
  register: 'social' | 'academic' | 'workplace' | 'everyday' | 'general';
  /** What the part is really testing. */
  focus: string;
};

/** The fixed structure of one paper. */
export type TestBlueprint = {
  /** Module identifier. */
  module: TestModule;
  /** Human-readable name. */
  name: string;
  /** Skill assessed. */
  skill: Skill;
  /** Whether Academic and General Training candidates sit the same paper. */
  sharedAcrossModules: boolean;
  /** Working time in minutes. */
  durationMinutes: number;
  /** Extra answer-transfer time in minutes (paper-based test). */
  transferMinutes: number;
  /** Number of scored items or tasks. */
  items: number;
  /** Whether the paper is objectively marked or examiner-rated. */
  scoring: 'raw' | 'analytic';
  /** Conversion table used, or `null` for examiner-rated papers. */
  rawScoreTable: RawScoreComponent | null;
  /** Original commentary on how the paper behaves. */
  summary: string;
  /** The parts of the paper, in order. */
  parts: readonly TestPart[];
};

/* -------------------------------------------------------------------------- */
/* Citation                                                                   */
/* -------------------------------------------------------------------------- */

/** One author of a cited work. */
export type CitationAuthor = {
  /** Family name, or the full name of a collective author. */
  family: string;
  /** Given names, empty for collective authors. */
  given: string;
  /** Non-empty when the author is an organisation or collective. */
  literal: string;
};

/** A bibliographic record. */
export type CitationRecord = {
  /** Kind of work. */
  type: 'software' | 'dataset';
  /** Full title. */
  title: string;
  /** Short title used in narrative citations. */
  shortTitle: string;
  /** Authors, in citation order. */
  authors: readonly CitationAuthor[];
  /** Year of publication. */
  year: number;
  /** Month of publication, 1-12. */
  month: number;
  /** Day of publication, 1-31. */
  day: number;
  /** Publisher or archive. */
  publisher: string;
  /** Version cited. */
  version: string;
  /** DOI without the resolver prefix, or `null` when none has been minted. */
  doi: string | null;
  /** Canonical URL. */
  url: string;
  /** Source repository. */
  repository: string;
  /** Licence statement. */
  license: string;
  /** BCP-47 language tag of the work. */
  language: string;
  /** Subject keywords. */
  keywords: readonly string[];
  /** Author-written abstract. */
  abstract: string;
};

/** Serialisations offered by `/v1/citation`. */
export type CitationFormat =
  'bibtex' | 'ris' | 'csl-json' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'endnote' | 'text';

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
