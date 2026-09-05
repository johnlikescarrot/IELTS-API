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
/* Exam-season recall index                                                   */
/* -------------------------------------------------------------------------- */

/** Kinds of entries in the exam-season recall index. */
export type RecallKind = 'speaking-topic' | 'speaking-cue-card' | 'reading-article' | 'listening-test';

/** Skills covered by the exam-season recall index. */
export type RecallSkill = 'speaking' | 'reading' | 'listening';

/** How often a recalled reading passage recurs across exam sessions. */
export type RecallTier = 'high' | 'next' | 'background';

/** Seasonal status of a Speaking Part 2 cue card. */
export type RecallStatus = 'new' | 'retained';

/** One indexed entry of the exam-season recall collection. */
export type RecallItem = {
  /** Stable identifier (`sp1-01-machine`, `sp2-001`, `rd-sept2025-p1-001`, `ls-te2-2`). */
  id: string;
  /** Kind of entry. */
  kind: RecallKind;
  /** Skill the entry belongs to. */
  skill: RecallSkill;
  /** Human-readable title (Chinese as published when no English title exists). */
  title: string;
  /** English title, when one is published upstream. */
  titleEn: string | null;
  /** Chinese title, when one is published upstream. */
  titleZh: string | null;
  /** Speaking part or reading passage part, when applicable. */
  part: 1 | 2 | 3 | null;
  /** Recurrence tier for reading articles; `null` otherwise. */
  tier: RecallTier | null;
  /** Cue-card category (people, objects, events, places); `null` otherwise. */
  category: string | null;
  /** Seasonal cue-card status; `null` otherwise. */
  status: RecallStatus | null;
  /** Upstream collection the entry was indexed from. */
  collection: string;
  /** Exam-season label (e.g. `2025-09`), when known. */
  season: string | null;
  /** Attached question count (Part 1 topics) or answer count (listening tests). */
  questions: number | null;
  /** Path of the source file inside the upstream repository. */
  sourcePath: string;
  /** Git blob SHA-1 of the source file. */
  sha1: string | null;
  /** Size of the source file in bytes. */
  sizeBytes: number | null;
  /** Public URL of the source file. */
  sourceUrl: string;
};

/** Repository-level structure of the upstream recall collection. */
export type RecallRepositoryStats = {
  /** Total number of files in the upstream repository. */
  filesInRepository: number;
  /** Total size of the upstream repository in bytes. */
  totalBytes: number;
  /** File count per top-level skill directory. */
  bySkill: Record<string, number>;
  /** File count per format. */
  byFormat: Record<string, number>;
};

/** Speaking structure observed in the recall collection. */
export type RecallSpeakingStats = {
  /** Part 1 topics published in the seasonal speaking bank. */
  part1Topics: number;
  /** Part 1 questions across those topics. */
  part1Questions: number;
  /** Part 2 cue cards of the season. */
  cueCards: number;
  /** Cue cards new in the season. */
  cueCardsNew: number;
  /** Cue cards retained from earlier seasons. */
  cueCardsRetained: number;
  /** Cue-card count per category. */
  cueCardsByCategory: Record<string, number>;
  /** Cue cards carried by the question bank file itself. */
  bankCueCards: number;
  /** Part 3 follow-up questions carried by the question bank file. */
  bankPart3Questions: number;
};

/** Reading structure observed in the recall collection. */
export type RecallReadingStats = {
  /** Recalled reading passages indexed. */
  articles: number;
  /** Duplicate backup files excluded from the index. */
  backupFilesExcluded: number;
  /** Web-application files excluded from the index. */
  nonArticleFilesExcluded: number;
  /** Article count per passage part. */
  byPart: Record<string, number>;
  /** Article count per recurrence tier (`unrated` when none is recorded). */
  byTier: Record<string, number>;
  /** Article count per upstream snapshot collection. */
  byCollection: Record<string, number>;
};

/** Listening structure observed in the recall collection. */
export type RecallListeningStats = {
  /** Recalled listening test sets with a machine-readable answer key. */
  testSets: number;
  /** Answers across those sets. */
  answers: number;
  /** Audio tracks shipped with those sets. */
  audioTracks: number;
};

/** Aggregate statistics over the exam-season recall index. */
export type RecallStats = {
  /** Entries indexed. */
  indexedItems: number;
  /** Entry count per skill. */
  bySkill: Record<string, number>;
  /** Whole-repository structure. */
  repository: RecallRepositoryStats;
  /** Speaking structure. */
  speaking: RecallSpeakingStats;
  /** Reading structure. */
  reading: RecallReadingStats;
  /** Listening structure. */
  listening: RecallListeningStats;
};

/* -------------------------------------------------------------------------- */
/* Text analysis                                                              */
/* -------------------------------------------------------------------------- */

/** Vocabulary-coverage tiers used by the analysis engine. */
export type VocabularyTierName = 'cross-volume' | 'single-volume' | 'out-of-list';

/** One band of the coverage profile. */
export type VocabularyTierExport = {
  /** Tier identifier. */
  tier: VocabularyTierName;
  /** Human-readable tier definition. */
  description: string;
};

/** One band of a computed coverage profile, with its measurements. */
export type VocabularyTierStats = VocabularyTierExport & {
  /** Tokens on this tier. */
  words: number;
  /** Distinct tokens on this tier. */
  unique: number;
  /** Share of all tokens (0-1, four decimals). */
  share: number;
};

/** A word with its occurrence count. */
export type WordFrequency = {
  word: string;
  count: number;
};

/** How a text's vocabulary maps onto the Cambridge IELTS 1-22 headwords. */
export type VocabularyCoverage = {
  /** Word tokens analysed. */
  totalWords: number;
  /** Distinct word tokens analysed. */
  uniqueWords: number;
  /** Share of tokens matched by a Cambridge headword (0-1, four decimals). */
  coverage: number;
  /** Per-tier measurements, in `VOCABULARY_TIERS` order. */
  tiers: VocabularyTierStats[];
  /** Most frequent out-of-list words (ties broken alphabetically). */
  topOutOfList: WordFrequency[];
};

/** Grade-heuristic band indication for an analysed text. */
export type BandEstimate = {
  /** CEFR level suggested by the consensus grade. */
  cefr: string;
  /** Lowest IELTS band that carries this CEFR level in `/v1/bands`. */
  bandMin: number;
  /** Highest IELTS band that carries this CEFR level in `/v1/bands`. */
  bandMax: number;
  /** Midpoint of the range, rounded to a half band. */
  pointEstimate: number;
  /** Provenance: always `readability-grade heuristic`. */
  basis: string;
  /** Why this indication must not be read as a score prediction. */
  caveat: string;
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
  method: 'GET' | 'POST';
  /** Path template. */
  path: string;
  /** Short summary. */
  summary: string;
  /** Whether the route is part of the versioned `/v1` contract. */
  versioned: boolean;
};
