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
/* Mock exam centre                                                             */
/* -------------------------------------------------------------------------- */

/** The examination paper a candidate takes. */
export type ExamModule = 'academic' | 'general-training';

/** How the centre administers the paper. */
export type ExamDelivery = 'paper' | 'computer';

/** Sections of the test day, in sitting order. */
export type ExamSectionId = 'listening' | 'reading' | 'writing' | 'speaking';

/** One section of the test day, as the rulebook prints it. */
export type ExamSectionInfo = {
  /** Section identifier. */
  id: ExamSectionId;
  /** Human-readable section name. */
  name: string;
  /** Skill the section assesses. */
  skill: Skill;
  /** Fixed duration in minutes (the maximum, for the range-timed Speaking test). */
  durationMinutes: number;
  /** How the centre announces the timing, e.g. `11-14 minutes`. */
  timingLabel: string;
  /** Number of questions, when the section is marked by question count. */
  questions: number | null;
  /** What the section contains, one line per part or passage group. */
  format: string[];
  /** Rules that apply while the section runs. */
  rules: string[];
  /** Extra minutes granted after the section (transfer or check time); `0` when none. */
  afterMinutes: number;
  /** Name of the extra time (`transfer`, `check`), or `null` when there is none. */
  afterLabel: string | null;
};

/** The rulebook row for one module and delivery mode. */
export type ExamTestDayConfig = {
  /** Examination paper. */
  module: ExamModule;
  /** Delivery mode. */
  delivery: ExamDelivery;
  /** Human-readable combination, e.g. `Academic — paper-based`. */
  label: string;
  /** Scheduled minutes from the start of Listening to the end of Writing, including transfer or check time. */
  sittingMinutes: number;
  /** Sections in sitting order. */
  sections: ExamSectionInfo[];
  /** Rules that govern the test day around the sections. */
  testDayRules: string[];
  /** Provenance and caveats for the timings in this row. */
  provenance: string;
};

/** The scale whose raw-score table converts a mark to a band. */
export type RawScoreScale = 'listening' | 'academic-reading' | 'general-training-reading';

/** One row of a raw-score conversion table. */
export type RawScoreRow = {
  /** Band reported for marks in this range. */
  band: number;
  /** Fewest correct answers that reach the band. */
  minRaw: number;
  /** Most correct answers that still map to the band. */
  maxRaw: number;
};

/** Response of `/v1/exam/score`. */
export type RawScoreResult = {
  /** Scale the mark was read against. */
  scale: RawScoreScale;
  /** Mark supplied by the caller. */
  raw: number;
  /** Estimated band score, or `null` below the published table. */
  band: number | null;
  /** Raw range behind the band, when one was found. */
  range: { minRaw: number; maxRaw: number } | null;
  /** The next publishable band and how far away it is; `null` at the ceiling. */
  next: { band: number; minRaw: number; itemsNeeded: number } | null;
  /** How to read the result. */
  note: string;
};

/** One segment of a test-day timeline. */
export type ExamScheduleSegment = {
  /** Section identifier, or `transfer`, `check`, `break` for the phases between them. */
  id: string;
  /** Segment name. */
  name: string;
  /** Minutes elapsed since the sitting began when the segment starts. */
  startMinutes: number;
  /** Minutes elapsed when the segment ends. */
  endMinutes: number;
  /** Wall-clock start, `HH:MM`. */
  start: string;
  /** Wall-clock end, `HH:MM`. */
  end: string;
  /** Whole days between the requested start date and the segment's end. */
  day: number;
  /** Segment length in minutes. */
  minutes: number;
};

/** Response of `/v1/exam/schedule`: the invigilated timeline for a countdown clock. */
export type ExamSchedule = {
  /** Start label echoed back. */
  start: string;
  /** ISO date anchor, when the caller supplied one. */
  date: string | null;
  /** Examination paper. */
  module: ExamModule;
  /** Delivery mode. */
  delivery: ExamDelivery;
  /** Break minutes inserted between sections. */
  breakMinutes: number;
  /** Timeline rows in order. */
  segments: ExamScheduleSegment[];
  /** Minutes from the first segment to the last. */
  totalMinutes: number;
  /** Total minutes as seconds — the duration a countdown timer should use. */
  countdownSeconds: number;
  /** Wall-clock end of the sitting. */
  end: { time: string; day: number };
};

/** One component row of `/v1/exam/report`. */
export type ExamReportComponent = {
  /** Component. */
  skill: Skill;
  /** How the score entered the report. */
  source: 'raw' | 'band' | 'missing';
  /** Raw mark, when the component was scored from answers. */
  raw: number | null;
  /** Estimated or examiner-assigned band. */
  band: number | null;
  /** Raw range the band came from, when derived from a mark. */
  range: { minRaw: number; maxRaw: number } | null;
  /** Next band and the marks it takes (raw components only). */
  next: { band: number; minRaw: number; itemsNeeded: number } | null;
};

/** One target-gap row of `/v1/exam/report`. */
export type ExamReportTargetRow = {
  /** Component. */
  skill: Skill;
  /** 'met' when the supplied score reaches the target, 'behind' when it does not, 'unknown' when the component is absent. */
  status: 'met' | 'behind' | 'unknown';
  /** Marks still required on the raw scale, when the component was marked from answers. */
  itemsNeeded: number | null;
  /** Band distance to the target, when a band is known. */
  bandGap: number | null;
};

/** Response of `/v1/exam/report`: a mock score report in test-report-form shape. */
export type ExamReport = {
  /** Examination paper the marks were read against. */
  module: ExamModule;
  /** Component rows in report order. */
  components: ExamReportComponent[];
  /** Overall band, computed when all four components are known. */
  overall: {
    components: Record<Skill, number>;
    mean: number;
    overall: number;
    cefr: string;
    spread: number;
    explanation: string;
  } | null;
  /** Gap analysis against a stated target, when one was requested. */
  target: { band: number; overallStatus: 'met' | 'behind' | 'unknown'; rows: ExamReportTargetRow[] } | null;
  /** The reporting convention the layout follows. */
  convention: string;
};

/** A pointer to one dataset item used by a mock paper. */
export type MockPaperItem = {
  /** Dataset the item comes from (`tests`, `tasks/writing`, `topics/writing`, `topics/speaking`, `frameworks`, `vocabulary`). */
  dataset: string;
  /** Item identifier within that dataset. */
  id: string;
  /** Display title. */
  title: string;
  /** API path serving the full item. */
  link: string;
  /** Section-specific guidance for this item, when useful. */
  note: string | null;
};

/** One section of a generated mock paper. */
export type MockPaperSection = {
  /** Section identifier (`listening`, `reading`, `writing`, `speaking`, `vocabulary`). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Skill the section practises; `null` for the vocabulary warm-up. */
  skill: Skill | null;
  /** Time budget for the section, in minutes. */
  minutes: number;
  /** Invigilation-style instructions for the section. */
  instructions: string[];
  /** Chosen items, in the order they should be attempted. */
  items: MockPaperItem[];
};

/** Response of `/v1/exam/mock`: a deterministic mock-paper manifest composed from the API's own datasets. */
export type MockPaper = {
  /** Stable identifier derived from the canonical inputs. */
  id: string;
  /** Seed the composition used. */
  seed: string;
  /** Examination paper. */
  module: ExamModule;
  /** Delivery mode, which sets the time budgets. */
  delivery: ExamDelivery;
  /** CEFR level applied to the reading selection, when requested. */
  level: CefrBand | null;
  /** Sections in sitting order. */
  sections: MockPaperSection[];
  /** Scheduled minutes across Listening, Reading and Writing (Speaking is held separately). */
  totalMinutes: number;
  /** Answer sheet the candidate marks themselves against. */
  answerSheet: {
    listening: { questions: number };
    reading: { questions: number };
    writing: { task1Words: number; task2Words: number };
    speaking: { parts: number };
  };
  /** Where to take the marks and the timeline next. */
  next: { schedule: string; report: string; tables: string };
  /** Provenance of the manifest. */
  provenance: string;
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
