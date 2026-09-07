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
/* Raw-score to band conversion                                               */
/* -------------------------------------------------------------------------- */

/**
 * The three objectively-marked papers, each of which converts a raw score out
 * of 40 to a band on its own scale.
 *
 * Listening uses one table for both modules; Reading uses two, because a
 * General Training candidate must answer more questions correctly to reach the
 * same band.
 */
export type RawScoreModule = 'listening' | 'reading-academic' | 'reading-general';

/** One contiguous run of raw scores that maps to a single band. */
export type RawBandRow = {
  /** Band awarded for any raw score in this row. */
  band: BandScore;
  /** Lowest raw score that earns {@link RawBandRow.band}. */
  minCorrect: number;
  /** Highest raw score that earns {@link RawBandRow.band}. */
  maxCorrect: number;
};

/**
 * A mark published by IELTS as the *average* raw score seen at a whole band.
 *
 * These are the only figures the test partners publish, and they are averages
 * rather than thresholds; they are used here to validate the consensus table
 * rather than to build it.
 */
export type RawScoreAnchor = {
  /** Whole band the anchor describes. */
  band: BandScore;
  /** Average marks out of 40 reported at that band. */
  marks: number;
};

/** A published raw-score conversion table for one paper. */
export type RawScoreTable = {
  /** Paper the table applies to. */
  module: RawScoreModule;
  /** Human-readable name of the paper. */
  name: string;
  /** Number of questions on the paper (always 40). */
  totalQuestions: number;
  /** Rows, ordered from the highest band down. */
  rows: readonly RawBandRow[];
  /** Average marks published by IELTS for whole bands. */
  anchors: readonly RawScoreAnchor[];
  /** Where the anchor marks are published. */
  anchorSourceUrl: string;
  /** How the table should be interpreted. */
  provenance: 'indicative-consensus';
  /** Caveat surfaced in every response that uses this table. */
  note: string;
};

/**
 * An alternative table published elsewhere, kept so that the API can report
 * exactly where widely-cited sources disagree with the consensus.
 */
export type RawScoreVariant = {
  /** Stable identifier. */
  id: string;
  /** Paper the variant applies to. */
  module: RawScoreModule;
  /** Short description of who publishes it. */
  label: string;
  /** Where the variant is published. */
  sourceUrl: string;
  /** Why the variant differs. */
  note: string;
  /** `[minCorrect, band]` thresholds, ordered from the highest band down. */
  thresholds: readonly (readonly [number, number])[];
};

/** One raw score at which a variant disagrees with the consensus table. */
export type RawScoreDisagreement = {
  /** Raw score out of 40. */
  correct: number;
  /** Band awarded by the consensus table. */
  consensusBand: BandScore;
  /** Band awarded by the variant. */
  variantBand: BandScore;
};

/** How the band would move if the raw score were one mark different. */
export type RawScoreSensitivity = {
  /** Band at one mark fewer, or `null` at a raw score of 0. */
  minusOne: BandScore | null;
  /** Band at one mark more, or `null` at full marks. */
  plusOne: BandScore | null;
  /** `true` when neither neighbouring mark changes the band. */
  stable: boolean;
};

/** Progress towards a band the candidate is aiming for. */
export type RawScoreTarget = {
  /** Band requested by the client. */
  band: BandScore;
  /** Lowest raw score that earns it, or `null` when unreachable. */
  minCorrect: number | null;
  /** Additional marks still required (0 once achieved). */
  marksNeeded: number | null;
  /** Whether the supplied raw score already earns the target. */
  achieved: boolean;
};

/** The result of converting a raw score to a band. */
export type RawScoreConversion = {
  /** Paper the conversion used. */
  module: RawScoreModule;
  /** Human-readable name of the paper. */
  moduleName: string;
  /** Raw score supplied by the client. */
  correct: number;
  /** Number of questions the raw score was out of. */
  outOf: number;
  /** Raw score rescaled to 40 questions (equal to `correct` when `outOf` is 40). */
  scaledCorrect: number;
  /** Percentage of questions answered correctly, to one decimal place. */
  percentage: number;
  /** Band awarded. */
  band: BandScore;
  /** Indicative CEFR level of the band. */
  cefr: string;
  /** IELTS proficiency label for the band. */
  label: string;
  /** Raw-score run that earns this band. */
  bandRange: { minCorrect: number; maxCorrect: number };
  /** The next band up, or `null` at band 9. */
  nextBand: { band: BandScore; minCorrect: number; marksNeeded: number } | null;
  /** How fragile the band is to a single mark. */
  sensitivity: RawScoreSensitivity;
  /** Progress towards a requested target band, when one was supplied. */
  target: RawScoreTarget | null;
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
/* Grey-literature archive                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One indexed file of the grey-literature archive
 * (`https://github.com/msneloy/IELTS`).
 *
 * Fields that only apply to one sub-collection are `null` elsewhere: the
 * Cambridge structure fields (`volume`, `test`, `section`) on audio, the
 * sample fields (`questionType`, `readingPart`, `topic`, `pages`,
 * `hasAnswerKey`) on the official reading samples, and the assignment fields
 * (`learner`, `role`, `taskType`, `date`) on the marked student work.
 */
export type ArchiveItem = {
  /** Slugified identifier. */
  id: string;
  /** Path inside the upstream repository. */
  path: string;
  /** Archive collection (`cambridge-audio`, `reading-samples`, ...). */
  collection: string;
  /** Human-readable title. */
  title: string;
  /** IELTS skill the file supports. */
  skill: string;
  /** File extension without the dot (`none` for extensionless files). */
  format: string;
  /** Coarse media class (`audio`, `document`, `image`, `text`). */
  media: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** Git blob SHA-1. */
  sha1: string | null;
  /** Public URL of the file at the indexed commit. */
  sourceUrl: string;
  /** Cambridge IELTS volume (1-18) for the listening audio. */
  volume: number | null;
  /** Listening test number, when the file name encodes it. */
  test: number | null;
  /** Listening section number, when the file name encodes it. */
  section: number | null;
  /** Canonical question-type id, for the academic reading samples. */
  questionType: QuestionTypeId | null;
  /** Whether the sample PDF ships its answer key. */
  hasAnswerKey: boolean;
  /** Reading part (1-3) a sample was extracted from, when stated. */
  readingPart: number | null;
  /** Topic of the sample passage, as stated in its descriptive note. */
  topic: string | null;
  /** Page count of a sample PDF. */
  pages: number | null;
  /** Passage (samples) or essay (assignments) readability statistics. */
  readability: ReadabilityStats | null;
  /** Learner named in an assignment file name. */
  learner: string | null;
  /** Role of an assignment file (`essay`, `prompt-image`, ...). */
  role: string | null;
  /** Writing task type of an assignment (`line-chart`, `task-2-essay`, ...). */
  taskType: string | null;
  /** ISO date of an assignment, from its folder name. */
  date: string | null;
};

/** The media-archaeology table: one row per Cambridge IELTS volume. */
export type ArchiveVolume = {
  /** Canonical volume number (1-18). */
  volume: number;
  /** Folder name in the upstream repository, verbatim. */
  folder: string;
  /** How the audio files are named (`cassette-side`, `cd-track`, ...). */
  namingScheme: string;
  /** Media era the naming scheme implies (`cassette`, `cd`, `download`, `none`). */
  media: string;
  /** Number of audio files in the volume. */
  audioTracks: number;
  /** Total size of the volume's files in bytes. */
  bytes: number;
  /** Listening tests recoverable from the file names, if any. */
  testsInferred: number | null;
  /** The recovered test numbers, if any. */
  testNumbers: number[] | null;
  /** Whether the volume holds a complete four-test, four-section audio set. */
  complete: boolean;
  /** Whether any file carries a vendor or channel watermark. */
  watermarked: boolean;
};

/** Aggregated statistics about the grey-literature archive. */
export type ArchiveStats = {
  filesInRepository: number;
  excludedFiles: number;
  indexedFiles: number;
  indexedBytes: number;
  audioTracks: number;
  audioBytes: number;
  byCollection: Record<string, number>;
  byFormat: Record<string, number>;
  byMedia: Record<string, number>;
  bySkill: Record<string, number>;
  /** Derived facts about the Cambridge IELTS listening audio. */
  cambridge: {
    volumesIndexed: number;
    volumesWithAudio: number;
    completeVolumes: number;
    volumesWithTestStructure: number;
    audioTracks: number;
    namingSchemes: Record<string, number>;
    watermarkedVolumes: number[];
  };
  /** Derived facts about the official sample tasks. */
  readingSamples: {
    files: number;
    distinctQuestionTypes: number;
    withAnswerKey: number;
  };
  /** Derived facts about the marked student assignments. */
  assignments: {
    files: number;
    essays: number;
    learners: number;
    essaysByLearner: Record<string, number>;
    essaysByTaskType: Record<string, number>;
    essayWords: number;
    promptImages: number;
    firstDate: string | null;
    lastDate: string | null;
  };
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
/* Mock-exam test centre                                                      */
/* -------------------------------------------------------------------------- */

/** The papers the test centre hosts, coarse enough for one filter facet. */
export type TestcenterPaper = 'listening' | 'reading' | 'writing' | 'full-mock' | 'vocabulary' | 'drill';

/** Difficulty judgement used by the test centre's hand-curated taxonomies. */
export type TestcenterDifficulty = 'easy' | 'medium' | 'hard';

/** One self-marking paper in the test centre's catalogue. */
export type TestcenterCatalogItem = {
  /** Slugified identifier (URL-safe form of `upstreamId`). */
  id: string;
  /** The platform's own identifier, verbatim. */
  upstreamId: string;
  /** Original title, as published by the platform. */
  title: string;
  /** Deterministic English title, when the id structure names the paper. */
  titleEn: string | null;
  /** Platform zone (`mock`, `practice`, `study`). */
  zone: string;
  /** Platform subject (`cambridge-listening`, `vocab-cet4`, ...). */
  subject: string;
  /** Canonical paper facet. */
  paper: TestcenterPaper;
  /** The platform's exam-shell time budget in minutes (0 for untimed lists). */
  durationMinutes: number;
  /** Cambridge IELTS volume, when the id encodes one (3-21). */
  volume: number | null;
  /** Cambridge test number, when the id encodes one (1-4). */
  test: number | null;
  /** ISO date the platform added the paper. */
  added: string;
  /** Hand-tagged question groups attached to this paper. */
  taggedGroups: number;
  /** Path inside the upstream repository. */
  sourcePath: string;
  /** Git blob SHA-1 of the paper's HTML file. */
  sha1: string | null;
  /** Size of the paper's HTML file in bytes. */
  sizeBytes: number;
  /** Public URL of the paper at the indexed commit. */
  sourceUrl: string;
};

/** One row of the Cambridge holdings matrix. */
export type TestcenterVolumeRow = {
  /** Cambridge IELTS volume number. */
  volume: number;
  /** Hosted listening papers and their test numbers. */
  listening: { papers: number; tests: number[] };
  /** Hosted reading papers and their test numbers. */
  reading: { papers: number; tests: number[] };
  /** Hosted writing papers and their test numbers. */
  writing: { papers: number; tests: number[] };
  /** Total hosted papers across the three papers. */
  papersTotal: number;
  /** Hand-tagged question groups for the volume's tagged papers. */
  taggedGroups: number;
  /** Questions covered by the volume's tagged groups. */
  taggedQuestions: number;
  /** Whether all three papers host complete four-test sets. */
  complete: boolean;
};

/** One hand-tagged question group of the Cambridge taxonomies. */
export type TestcenterGroup = {
  /** The platform's group identifier, verbatim. */
  id: string;
  /** Identifier of the exam the group belongs to. */
  parentId: string;
  /** Which tagged paper the group belongs to. */
  paper: 'listening' | 'reading';
  /** Cambridge IELTS volume (5-21). */
  volume: number;
  /** Cambridge test number (1-4). */
  test: number;
  /** Listening section (1-4) or reading passage (1-3). */
  part: number;
  /** First question number of the group. */
  qFrom: number;
  /** Last question number of the group. */
  qTo: number;
  /** Number of questions the group covers. */
  questions: number;
  /** Canonical question type from the `/v1/question-types` taxonomy. */
  type: QuestionTypeId;
  /** The platform's original label, verbatim (Chinese). */
  rawType: string;
  /** Teaching scene slug, or `null` when the group carries none. */
  scene: string | null;
  /** English name of the teaching scene. */
  sceneLabel: string | null;
  /** The platform's original scene label, verbatim (Chinese). */
  sceneRaw: string | null;
  /** Difficulty judgement, or `null` when the group carries none. */
  difficulty: TestcenterDifficulty | null;
  /** Public URL of the exam page the group belongs to. */
  sourceUrl: string;
  /** Git blob SHA-1 of the exam page's HTML file. */
  sha1: string | null;
};

/** One teaching scene of the test centre's scene vocabulary. */
export type TestcenterScene = {
  /** Slug identifier. */
  id: string;
  /** Original Chinese label. */
  zh: string;
  /** English gloss. */
  en: string;
  /** Nearest theme group of `/v1/topics/themes`. */
  themeGroup: string;
  /** Tagged groups carrying the scene. */
  groups: number;
  /** Questions covered by those groups. */
  questions: number;
};

/** One row of a production raw-score-to-band calibration table. */
export type TestcenterScoringRow = {
  /** First raw score (inclusive) the row covers. */
  rawFrom: number;
  /** Last raw score (inclusive) the row covers. */
  rawTo: number;
  /** Band awarded for the row's raw-score range. */
  band: number;
  /** The platform's level label for the row's band. */
  level: string;
};

/** One band-level label of a calibration table. */
export type TestcenterLevelRow = {
  /** Lowest band the label applies to. */
  minBand: number;
  /** The platform's level label. */
  label: string;
};

/** One paper's production score calibration. */
export type TestcenterScoringTable = {
  /** Human-readable name. */
  name: string;
  /** Maximum raw score of the table. */
  max: number;
  /** Raw-score ranges in descending band order. */
  rows: TestcenterScoringRow[];
  /** Band-level labels in descending band order. */
  levels: TestcenterLevelRow[];
};

/** Aggregated statistics about the test-centre index. */
export type TestcenterStats = {
  catalog: {
    items: number;
    manifestCount: number;
    byZone: Record<string, number>;
    byPaper: Record<string, number>;
    bySubject: Record<string, number>;
    cambridgePapers: number;
    cambridgeVolumes: { listening: number[]; reading: number[]; writing: number[] };
    vocabBooks: number;
    addedRange: { first: string; last: string } | null;
  };
  taxonomy: Record<
    'listening' | 'reading',
    {
      groups: number;
      parentExams: number;
      sectionsTagged: number;
      questions: number;
      byType: Record<string, number>;
      byScene: Record<string, number>;
      byDifficulty: Record<string, number>;
      noDifficulty: number;
      noScene: number;
      overlappingRanges: number;
      firstVolume: number;
      lastVolume: number;
      upstreamGroups: number;
    }
  >;
  rawTypeLabels: readonly {
    raw: string;
    paper: string;
    canonical: QuestionTypeId;
    occurrences: number;
  }[];
};

/* -------------------------------------------------------------------------- */
/* Spaced repetition, self-testing and mistake review                       */
/* -------------------------------------------------------------------------- */

/** Word-knowledge states of the spaced-repetition scheduler. */
export type SrsStatus = 'new' | 'learning' | 'mastered';

/** One step of the Ebbinghaus review ladder. */
export type SrsStep = {
  /** 1-based review number. */
  review: number;
  /** Minutes between this review and the previous one (or the anchor for review 1). */
  intervalMinutes: number;
  /** Minutes between the anchor and this review. */
  cumulativeMinutes: number;
  /** Due datetime in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`). */
  due: string;
};

/** A spaced-repetition schedule computed from an explicit anchor. */
export type SrsSchedule = {
  /** Anchor the schedule is computed from (`YYYY-MM-DDTHH:mm:ss.sssZ`). */
  anchor: string;
  /** Completed reviews the caller reports. */
  reviews: number;
  /** Mastery score the caller reports (0-100). */
  mastery: number;
  /** Word-knowledge state implied by the inputs. */
  status: SrsStatus;
  /** Minutes until the next review from the anchor. */
  nextReviewInMinutes: number;
  /** Due datetime of the next review in UTC. */
  nextReviewAt: string;
  /** The eight Ebbinghaus intervals in minutes. */
  ladderMinutes: readonly number[];
  /** Forward review schedule from the anchor. */
  upcoming: SrsStep[];
  /** Daily review window around the caller's preferred review time. */
  reviewWindow: { date: string; time: string; start: string; end: string };
  /** Projected mastery after the reported recall, when `correct` was supplied. */
  masteryProjection: {
    correct: boolean;
    confidence: number;
    from: number;
    to: number;
    status: SrsStatus;
  } | null;
};

/** Quiz direction: recognise the definition, or produce the headword. */
export type QuizDirection = 'word-to-definition' | 'definition-to-word';

/** One multiple-choice quiz item. */
export type QuizItem = {
  /** Stable item identifier (`q01`, `q02`, ...). */
  id: string;
  /** Headword tested by this item. */
  word: string;
  /** IPA-style transcription, slash-delimited, or `null` when unavailable. */
  phonetic: string | null;
  /** Part of speech of the tested headword. */
  partOfSpeech: PartOfSpeech;
  /** The question stem: a headword or a definition, depending on the direction. */
  stem: string;
  /** Answer options in presentation order. */
  options: string[];
  /** Index of the correct option in `options`. */
  answerIndex: number;
  /** Cambridge IELTS volumes (1-22) in which the headword occurs. */
  volumes: number[];
};

/** A deterministic vocabulary quiz. */
export type VocabularyQuiz = {
  /** Quiz items in presentation order. */
  items: QuizItem[];
  /** Answer key: item id to the correct option index. */
  key: Record<string, number>;
  /** Headwords the quiz was drawn from. */
  pool: number;
};

/** A mistake type of the self-review taxonomy. */
export type MistakeType = {
  /** Stable identifier. */
  id: 'spelling' | 'recognition' | 'pronunciation' | 'usage' | 'listening';
  /** Display name. */
  name: string;
  /** Skill the mistake surfaces in. */
  skill: Skill;
  /** What this mistake looks like. */
  description: string;
  /** Observable signals that a miss belongs to this type. */
  signals: string[];
  /** Stateless correction protocol: what to do after each miss. */
  protocol: string[];
  /** API endpoints that supply drill material for this type. */
  drills: { name: string; url: string }[];
};

/** One 0-100 criterion subscore of the indicative writing scorer. */
export type WritingCriterionScore = {
  /** Criterion name. */
  criterion: 'task-response' | 'coherence-and-cohesion' | 'lexical-resource' | 'grammatical-range';
  /** Subscore on a 0-100 scale. */
  score: number;
  /** Measurements the subscore was computed from. */
  evidence: Record<string, number | string | boolean>;
};

/** Indicative writing score for a validated text. */
export type WritingScore = {
  /** Task the text was written for. */
  task: 'task1' | 'task2';
  /** Running words. */
  wordCount: number;
  /** Minimum words for the task. */
  minimumWords: number;
  /** Whether the text meets the task minimum. */
  meetsMinimum: boolean;
  /** The four criterion subscores. */
  criteria: WritingCriterionScore[];
  /** Mean of the four subscores, rounded to an integer. */
  overall: number;
  /** Indicative band range the overall maps to. */
  indicativeBand: { min: number | null; max: number | null; label: string };
  /** Criteria at 70+, in band-descriptor order, with a fallback when empty. */
  strengths: string[];
  /** Criteria below 60, in band-descriptor order, with a fallback when empty. */
  improvements: string[];
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
