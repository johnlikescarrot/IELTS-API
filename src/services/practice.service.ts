/**
 * Practice service: complete mock tests, vocabulary quizzes and generated
 * study plans. Everything is deterministic for a given seed.
 */

import { ValidationError } from '../lib/errors.js';
import { createRng, sample, shuffled } from '../lib/random.js';
import { buildMockTest, type MockTest } from './questions.service.js';
import { randomVocab, type RandomVocabEntry } from './vocab.service.js';

export { buildMockTest };
export type { MockTest };

export interface QuizCard {
  readonly questionId: string;
  readonly topicId: string;
  readonly topic: string;
  readonly term: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  readonly meaning: string;
  readonly example: string;
}

export interface VocabQuizOptions {
  readonly count: number;
  readonly topicId?: string | undefined;
  readonly seed?: string | undefined;
}

export function buildVocabQuiz(options: VocabQuizOptions): readonly QuizCard[] {
  const entries = randomVocab({
    count: options.count,
    topicId: options.topicId,
    seed: options.seed
  });
  const rng = createRng(options.seed);
  const distractorPool = randomVocab({ count: Number.MAX_SAFE_INTEGER, seed: options.seed });
  return entries.map((hit: RandomVocabEntry) => {
    const distractors = sample(
      distractorPool.filter((other) => other.entry.term !== hit.entry.term),
      3,
      rng
    ).map((other) => other.entry.meaning);
    const optionsForCard = shuffled([hit.entry.meaning, ...distractors], rng);
    const answerIndex = optionsForCard.indexOf(hit.entry.meaning);
    return {
      questionId: `quiz-${hit.topicId}-${hit.entry.term.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      topicId: hit.topicId,
      topic: hit.topic,
      term: hit.entry.term,
      options: optionsForCard,
      answerIndex,
      meaning: hit.entry.meaning,
      example: hit.entry.example
    };
  });
}

export interface StudyPlanRequest {
  readonly currentBand: number;
  readonly targetBand: number;
  readonly weeks: number;
  readonly seed?: string | undefined;
}

export interface StudyWeek {
  readonly week: number;
  readonly focus: readonly string[];
  readonly dailyMinutes: number;
  readonly tasks: readonly string[];
  readonly checkpoint: string;
}

export interface StudyPlan {
  readonly currentBand: number;
  readonly targetBand: number;
  readonly weeks: number;
  readonly estimatedDailyMinutes: number;
  readonly mode: 'improvement' | 'maintenance';
  readonly schedule: readonly StudyWeek[];
  readonly resources: readonly string[];
}

const FOCUS_ROTATION: readonly string[] = [
  'Vocabulary (Academic Word List)',
  'Listening practice',
  'Reading practice',
  'Writing Task 1',
  'Writing Task 2',
  'Speaking Part 1 and Part 2',
  'Speaking Part 3 and fluency',
  'Grammar and error correction'
];

const TASK_TEMPLATES: readonly ((week: number) => string)[] = [
  (week) => `Learn 20 new AWL words from a sublist and write one sentence per word (week ${week}).`,
  (week) => `Complete one full listening paper and review every incorrect answer (week ${week}).`,
  (week) => `Complete one reading paper under 60-minute timed conditions (week ${week}).`,
  (week) => `Write two Task 1 responses and compare them with the band descriptors (week ${week}).`,
  (week) => `Write two Task 2 essays and check them against /v1/bands/writing/2 (week ${week}).`,
  (week) =>
    `Record yourself answering a Part 2 cue card, then listen back for errors (week ${week}).`,
  (week) => `Drill error correction with /v1/mistakes/random?seed=week-${week} (week ${week}).`,
  (week) =>
    `Review every mistake log entry from this week and re-test the weak items (week ${week}).`
];

function buildSchedule(request: StudyPlanRequest): readonly StudyWeek[] {
  const rng = createRng(request.seed);
  const rotation = shuffled(FOCUS_ROTATION, rng);
  const dailyMinutes = Math.min(
    180,
    60 + Math.round((request.targetBand - request.currentBand) * 30)
  );
  const schedule: StudyWeek[] = [];
  for (let week = 1; week <= request.weeks; week++) {
    const primaryFocus = rotation[(week - 1) % rotation.length] as string;
    const secondaryFocus = rotation[week % rotation.length] as string;
    const templateAt = (index: number): string =>
      (TASK_TEMPLATES[index % TASK_TEMPLATES.length] as (week: number) => string)(week);
    schedule.push({
      week,
      focus: [primaryFocus, secondaryFocus],
      dailyMinutes,
      tasks: [templateAt(week - 1), templateAt(week + 3), templateAt(week + 6)],
      checkpoint: `End of week ${week}: take a mock test via /v1/practice/mock-test?seed=week-${week} and re-score with /v1/scoring/overall.`
    });
  }
  return schedule;
}

export function buildStudyPlan(request: StudyPlanRequest): StudyPlan {
  if (!Number.isFinite(request.currentBand) || request.currentBand < 1 || request.currentBand > 9) {
    throw new ValidationError('Current band must be between 1 and 9', {
      currentBand: request.currentBand
    });
  }
  if (!Number.isFinite(request.targetBand) || request.targetBand < 1 || request.targetBand > 9) {
    throw new ValidationError('Target band must be between 1 and 9', {
      targetBand: request.targetBand
    });
  }
  if (request.targetBand < request.currentBand) {
    throw new ValidationError('Target band must be greater than or equal to the current band', {
      currentBand: request.currentBand,
      targetBand: request.targetBand
    });
  }
  const mode: StudyPlan['mode'] =
    request.targetBand === request.currentBand ? 'maintenance' : 'improvement';
  return {
    currentBand: request.currentBand,
    targetBand: request.targetBand,
    weeks: request.weeks,
    estimatedDailyMinutes: Math.min(
      180,
      60 + Math.round((request.targetBand - request.currentBand) * 30)
    ),
    mode,
    schedule: buildSchedule(request),
    resources: [
      'GET /v1/vocab/awl/sublists/{1-10} - Academic Word List by sublist',
      'GET /v1/vocab/topics - topic vocabulary packs',
      'GET /v1/questions/random - practice questions',
      'GET /v1/mistakes/random - error-correction drills',
      'GET /v1/practice/mock-test - full mock test',
      'GET /v1/scoring/tables - raw-to-band conversion',
      'POST /v1/scoring/overall - calculate your overall band'
    ]
  };
}
