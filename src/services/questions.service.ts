/**
 * Question bank service: filtering, pagination, lookup and seeded mock-test
 * assembly.
 */

import { QUESTIONS, type Question, type Skill } from '../data/questions.js';
import { NotFoundError } from '../lib/errors.js';
import { createRng, sample } from '../lib/random.js';

export interface QuestionFilters {
  readonly skill?: Skill | undefined;
  readonly part?: number | undefined;
  readonly topic?: string | undefined;
}

function matchesFilters(question: Question, filters: QuestionFilters): boolean {
  if (filters.skill !== undefined && question.skill !== filters.skill) {
    return false;
  }
  if (filters.part !== undefined && question.part !== filters.part) {
    return false;
  }
  if (
    filters.topic !== undefined &&
    !question.topic.toLowerCase().includes(filters.topic.toLowerCase())
  ) {
    return false;
  }
  return true;
}

export function listQuestions(filters: QuestionFilters): readonly Question[] {
  return QUESTIONS.filter((question) => matchesFilters(question, filters));
}

export function getQuestion(id: string): Question {
  const question = QUESTIONS.find((item) => item.id === id);
  if (question === undefined) {
    throw new NotFoundError('Question', id);
  }
  return question;
}

export function randomQuestion(filters: QuestionFilters, seed?: string): Question {
  const pool = listQuestions(filters);
  if (pool.length === 0) {
    throw new NotFoundError('Question', JSON.stringify(filters));
  }
  const rng = createRng(seed);
  return sample(pool, 1, rng)[0] as Question;
}

export interface MockSpeakingPart1 {
  readonly topic: string;
  readonly questions: readonly string[];
}

export interface MockSpeaking {
  readonly part1: MockSpeakingPart1;
  readonly part2: Question;
  readonly part3: Question;
}

export interface MockWriting {
  readonly task1: Question;
  readonly task2: Question;
}

export interface MockTest {
  readonly seed: string | null;
  readonly speaking: MockSpeaking;
  readonly writing: MockWriting;
  readonly timing: {
    readonly listeningMinutes: number;
    readonly readingMinutes: number;
    readonly writingMinutes: number;
    readonly speakingMinutes: number;
  };
  readonly instructions: readonly string[];
}

const MOCK_INSTRUCTIONS: readonly string[] = [
  'Listening: 4 sections, 40 questions, approximately 30 minutes plus 10 minutes to transfer answers.',
  'Reading: 3 passages, 40 questions, 60 minutes.',
  'Writing: Task 1 in 20 minutes (at least 150 words) and Task 2 in 40 minutes (at least 250 words).',
  'Speaking: Part 1 (4-5 minutes), Part 2 (1 minute preparation, 2 minutes speaking), Part 3 (4-5 minutes).',
  'Sit the papers in one sitting and convert your raw scores afterwards via /v1/scoring/conversion.'
];

export function buildMockTest(seed?: string): MockTest {
  const rng = createRng(seed);
  const part1 = sample(
    QUESTIONS.filter((q) => q.skill === 'speaking' && q.part === 1),
    1,
    rng
  )[0] as Extract<Question, { part: 1; skill: 'speaking' }>;
  const part2 = sample(
    QUESTIONS.filter((q) => q.skill === 'speaking' && q.part === 2),
    1,
    rng
  )[0] as Extract<Question, { part: 2; skill: 'speaking' }>;
  const part3 = sample(
    QUESTIONS.filter((q) => q.skill === 'speaking' && q.part === 3),
    1,
    rng
  )[0] as Extract<Question, { part: 3; skill: 'speaking' }>;
  const academicTask1 = sample(
    QUESTIONS.filter((q) => q.skill === 'writing' && q.part === 1 && q.variant === 'academic'),
    1,
    rng
  )[0] as Extract<Question, { part: 1; skill: 'writing'; variant: 'academic' }>;
  const task2 = sample(
    QUESTIONS.filter((q) => q.skill === 'writing' && q.part === 2),
    1,
    rng
  )[0] as Extract<Question, { part: 2; skill: 'writing' }>;

  return {
    seed: seed === undefined ? null : seed,
    speaking: { part1: { topic: part1.topic, questions: part1.questions }, part2, part3 },
    writing: { task1: academicTask1, task2 },
    timing: {
      listeningMinutes: 30,
      readingMinutes: 60,
      writingMinutes: 60,
      speakingMinutes: 15
    },
    instructions: MOCK_INSTRUCTIONS
  };
}
