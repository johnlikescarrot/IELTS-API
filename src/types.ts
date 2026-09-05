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

/** Raw score to band conversion result. */
export type RawToBandResult = {
  rawScore: number;
  skill: 'listening' | 'reading';
  module: 'academic' | 'general-training';
  band: BandScore;
  range: [number, number];
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
/* Themes                                                                     */
/* -------------------------------------------------------------------------- */

/** A high-frequency IELTS theme derived from the upstream study set. */
export type IeltsTheme = {
  /** Stable identifier (`th-001`). */
  id: string;
  /** Relative frequency rank (1-50). */
  rank: number;
  /** Theme name. */
  name: string;
  /** Thematic category slug. */
  category: string;
  /** Display group. */
  group: string;
  /** Skills supported by this theme. */
  skills: Skill[];
  /** Writing Task 2 question families this theme fits. */
  questionTypes: EssayQuestionType[];
  /** Core vocabulary keywords for this theme. */
  keywords: string[];
  /** Three realistic, original Task 2 essay prompts on this theme. */
  prompts: [string, string, string];
};

/** Dataset-level provenance for the theme bank. */
export type ThemeMeta = {
  name: string;
  source: string;
  sourceUrl: string;
  themes: number;
  categories: number;
  skills: number;
  license: string;
  attribution: string;
  note: string;
};

/** Aggregate statistics about the theme bank. */
export type ThemeStats = {
  themes: number;
  categories: number;
  totalPrompts: number;
  meanPrompts: number;
  bySkill: Record<string, number>;
  byCategory: Record<string, number>;
};

/* -------------------------------------------------------------------------- */
/* Practice Catalogue & Strategies                                            */
/* -------------------------------------------------------------------------- */

/** Collections in the IELTS practice catalogue. */
export type PracticeCollection = 'reading-basic' | 'reading-full' | 'listening-basic' | 'listening-full';

/** Curricular level designation for practice units. */
export type PracticeLevel = 'A1_A2' | 'B1_B2' | 'C1_C2' | 'Basic' | 'Intermediate' | 'Advanced' | 'FullTest';

/** A single practice unit in the curriculum metadata catalogue. */
export type PracticeUnit = {
  /** Stable identifier (e.g. `reading-basic-a1-a2-001`, `reading-full-001`, `listening-full-083`). */
  id: string;
  /** IELTS skill (reading or listening). */
  skill: 'reading' | 'listening';
  /** Practice collection this unit belongs to. */
  collection: PracticeCollection;
  /** Number of the lesson or test within its collection. */
  unitNumber: number;
  /** Curricular level tag. */
  level: PracticeLevel;
  /** Descriptive title for this unit. */
  title: string;
  /** Whether working audio media is available for this unit. */
  hasAudio: boolean;
  /** Whether question-strategy metadata exists for this unit. */
  hasStrategy: boolean;
  /** Path in the upstream repository tree. */
  sourcePath: string;
};

/** Metadata for the practice catalogue. */
export type PracticeMeta = {
  name: string;
  source: string;
  sourceUrl: string;
  totalUnits: number;
  declaredUnits: number;
  missingUnits: number;
  collections: number;
  license: string;
  attribution: string;
  note: string;
};

/** Task family strategy guidance for Reading and Listening. */
export type PracticeStrategy = {
  /** Unique strategy slug (e.g. `true-false-not-given`, `multiple-choice`). */
  id: string;
  /** IELTS skill. */
  skill: 'reading' | 'listening';
  /** Official question type name. */
  name: string;
  /** Cognitive / task category. */
  category: string;
  /** Detailed description of the question type. */
  description: string;
  /** Official IELTS format reference URL. */
  officialUrl: string;
  /** Recommended step-by-step procedure. */
  recommendedSteps: string[];
  /** High-score tips. */
  tips: string[];
  /** Common candidate pitfalls. */
  pitfalls: string[];
  /** Suggested time budget in minutes. */
  suggestedMinutes: number;
};

/** Step in the 6-step IELTS study framework. */
export type StudyStep = {
  /** Step number (1-6). */
  step: number;
  /** Step name. */
  name: string;
  /** Recommended time allocation. */
  targetTime: string;
  /** Core learning objective. */
  objective: string;
  /** Concrete actions. */
  actions: string[];
  /** Expected deliverable or outcome. */
  output: string;
};

/** Aggregate statistics about the practice catalogue. */
export type PracticeStats = {
  totalUnits: number;
  declaredUnits: number;
  missingUnits: number;
  bySkill: Record<string, number>;
  byCollection: Record<string, number>;
  byLevel: Record<string, number>;
  audioAvailability: {
    withAudio: number;
    missingAudio: number;
    notApplicable: number;
  };
  strategiesCount: number;
  studyFrameworkSteps: number;
};

/* -------------------------------------------------------------------------- */
/* Research corpus & Provenance                                               */
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

/** Dataset entry in the research provenance manifest. */
export type ManifestDataset = {
  id: string;
  path: string;
  sha256: string;
  records: number;
  source: {
    url: string;
    snapshot: string;
  };
  license: string;
  note: string;
};

/** Stable machine-readable provenance manifest. */
export type ResearchManifest = {
  manifestVersion: 1;
  api: {
    name: string;
    version: string;
    repository: string;
    license: string;
    docsUrl: string;
  };
  datasets: Record<string, ManifestDataset>;
  review: {
    upstream: string;
    commit: string;
    reviewedDate: string;
    unitsObserved: number;
    unitsDeclared: number;
    notes: string[];
  };
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
