export interface VocabularyItem {
  id: number;
  chapter: number;
  chapterName: string;
  category: string;
  word: string;
  phonetic: string;
  explanation: string;
  notes: string;
}

export interface VocabularyChapterStats {
  chapter: number;
  chapterName: string;
  category: string;
  wordCount: number;
  sampleWords: string[];
}

export interface QuizQuestion {
  id: number;
  word: string;
  phonetic: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  notes?: string;
}

export interface Flashcard {
  id: number;
  chapter: number;
  word: string;
  phonetic: string;
  explanation: string;
  notes: string;
  hint: string;
}

export interface WritingBandDescriptor {
  taskAchievement?: string;
  taskResponse?: string;
  coherenceAndCohesion: string;
  lexicalResource: string;
  grammaticalRangeAndAccuracy: string;
}

export interface WritingPromptAndSample {
  id: string;
  taskType: 'task1' | 'task2';
  title: string;
  category: string;
  questionType: string;
  prompt: string;
  sampleEssay: string;
  bandScore: number;
  wordCount: number;
  examinerFeedback: {
    taskAchievement?: string;
    taskResponse?: string;
    coherenceAndCohesion: string;
    lexicalResource: string;
    grammaticalRangeAndAccuracy: string;
  };
}

export interface EssayAnalysisResult {
  metrics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    averageSentenceLength: number;
    averageWordLength: number;
    readingTimeMinutes: number;
  };
  cohesionAndTransitions: {
    totalCohesiveDevicesFound: number;
    cohesiveDensityPercentage: number;
    detectedDevicesByCategory: Record<string, string[]>;
  };
  lexicalResource: {
    lexicalRichnessRatio: number;
    uniqueWordsCount: number;
    band6WordsFound: string[];
    band7WordsFound: string[];
    band8PlusWordsFound: string[];
  };
  readability: {
    fleschReadingEase: number;
    fleschKincaidGradeLevel: number;
    readabilityLevel: string;
  };
  bandEstimation: {
    estimatedBandRange: string;
    taskTypeAssumed: 'task1' | 'task2';
    wordCountStatus: 'insufficient' | 'adequate' | 'optimal' | 'excessive';
    feedback: string[];
  };
}

export interface SpeakingBandDescriptor {
  fluencyAndCoherence: string;
  lexicalResource: string;
  grammaticalRangeAndAccuracy: string;
  pronunciation: string;
}

export interface SpeakingPart1Topic {
  id: string;
  topic: string;
  questions: string[];
  modelTips: string;
}

export interface SpeakingCueCard {
  id: string;
  topic: string;
  category: string;
  bulletPoints: string[];
  preparationGuide: string;
  usefulVocabulary: string[];
  part3FollowUps: string[];
}

export interface SpeakingFormula {
  id: string;
  formulaName: string;
  structure: string;
  example: string;
  bandTarget: number;
  criterionTarget: string;
}

export interface AuthenticTranscript {
  act: string;
  title: string;
  speakers: string[];
  theme: string;
  keyCollocations: string[];
  excerpt: string;
}

export interface RawScoreBandItem {
  rawScoreMin: number;
  rawScoreMax: number;
  bandScore: number;
}

export interface CefrMappingItem {
  bandScoreMin: number;
  bandScoreMax: number;
  cefrLevel: string;
  description: string;
}

export interface ClbMappingItem {
  clb: number;
  minScore: number;
}

export interface CollegeIeltsRequirements {
  diploma: { overall: number; minSubscore: number };
  postGraduate: { overall: number; minSubscore: number };
  degree: { overall: number; minSubscore: number };
}

export interface CollegeItem {
  id: number;
  name: string;
  chineseName: string;
  type: string;
  province: string;
  provinceCode: string;
  city: string;
  address: string;
  ieltsRequirements: CollegeIeltsRequirements;
  popularPrograms: string[];
  website: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  filename: string;
  author: string;
  skill: string;
  category: string;
  format: string;
  fileSizeBytes: number;
  description: string;
  sourceUrl: string;
}

export interface PracticeQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PracticeReadingTest {
  id: string;
  title: string;
  module: string;
  passage: string;
  questions: PracticeQuestion[];
}

export interface PracticeListeningTest {
  id: string;
  section: number;
  context: string;
  transcript: string;
  questions: PracticeQuestion[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
