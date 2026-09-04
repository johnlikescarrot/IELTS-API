export type CefrLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type PartOfSpeech =
  'noun' | 'verb' | 'adjective' | 'adverb' | 'phrasal verb' | 'idiom' | 'collocation';

export interface VocabularyEntry {
  id: string;
  word: string;
  partOfSpeech: PartOfSpeech;
  level: CefrLevel;
  category: string;
  definition: string;
  example: string;
  synonyms: string[];
}

export interface WritingPrompt {
  id: string;
  task: 1 | 2;
  category: string;
  prompt: string;
  bulletPoints?: string[];
  minWords: number;
  timeMinutes: number;
}

export interface WritingSample {
  id: string;
  task: 1 | 2;
  title: string;
  promptId: string;
  band: number;
  essay: string;
  cohesionNotes: string;
}

export interface Tip {
  id: string;
  title: string;
  detail: string;
}

export interface CommonMistake {
  id: string;
  title: string;
  incorrect: string;
  correct: string;
  explanation: string;
}

export interface SpeakingTopic {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  questions: string[];
  samplePoints: string[];
}

export interface QuestionType {
  id: string;
  name: string;
  description: string;
  strategy: string;
}

export interface PracticeSet {
  id: string;
  title: string;
  passages: number;
  questions: number;
  timeMinutes: number;
  skills: string[];
  instructions: string;
}

export interface GrammarRule {
  id: string;
  title: string;
  explanation: string;
  correctExample: string;
  incorrectExample: string;
}

export interface PhraseEntry {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  formality: 'neutral' | 'formal' | 'informal';
}

export interface StudyPlan {
  id: string;
  title: string;
  weeks: number;
  hoursPerWeek: number;
  level: string;
  schedule: { week: number; focus: string; tasks: string[] }[];
}

export interface ResourceLink {
  id: string;
  title: string;
  category: 'community-collection' | 'official' | 'open-data' | 'practice';
  format: 'web' | 'api' | 'mixed';
  url: string;
  description: string;
}

export interface Paginated<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}
