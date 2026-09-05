/**
 * Deterministic mock-exam blueprint generation.
 *
 * {@link buildExamBlueprint} turns a module, a calendar date and an optional
 * target band into a full mock-exam session: the official four-paper format
 * with timings, a question-type mix derived from the frequencies observed in
 * the practice-test corpus, links to indexed practice material of a matching
 * difficulty, original Writing and Speaking tasks from the topic banks, and
 * the scoring path from raw marks to band scores.
 *
 * Like the study planner, the blueprint is a pure function of its inputs: all
 * selections are seeded from the canonical session string, so identical
 * requests produce byte-identical sessions on every replica.
 */

import { practiceItems, practiceStats } from '../data/practiceTests.js';
import { QUESTION_TYPES } from '../data/questionTypes.js';
import { EXAM_THEMES } from '../data/themes.js';
import { TASK_TYPES } from '../data/tasks.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { hashString, seededIndices } from './rng.js';

import type {
  CefrBand,
  ExamFormat,
  ExamPaperFormat,
  ExamSourceItem,
  ExamTypeShare,
  IeltsModule,
  MockExamBlueprint,
  PracticeItem,
  QuestionTypeId,
} from '../types.js';

/** Modules supported by the exam layer. */
export const EXAM_MODULES: readonly IeltsModule[] = ['academic', 'general-training'];

/** Lowest target band a blueprint accepts; below 4.0 there is nothing to simulate. */
export const BLUEPRINT_MIN_TARGET = 4;

/** Total time allowed for the whole test in seconds. */
const LISTENING_SECONDS = 1800;
const READING_SECONDS = 3600;
const WRITING_SECONDS = 3600;

/** Available question types, keyed by canonical identifier. */
const TYPE_NAMES = Object.fromEntries(QUESTION_TYPES.map((type) => [type.id, type.name])) as Record<
  QuestionTypeId,
  string
>;

/** Official Listening structure: four parts of ten questions. */
const LISTENING_PARTS: ExamPaperFormat['parts'] = [
  {
    number: 1,
    context: 'Everyday social transaction between two speakers (a booking, an enquiry, a form).',
    questions: 10,
  },
  {
    number: 2,
    context: 'Monologue on a general topic (a guided tour, an announcement, a radio item).',
    questions: 10,
  },
  {
    number: 3,
    context: 'Academic discussion between up to four speakers (a tutor and students).',
    questions: 10,
  },
  {
    number: 4,
    context: 'Academic lecture or monologue on a specialised topic.',
    questions: 10,
  },
];

/** Academic Reading structure: three passages, commonly split 13/13/14. */
const ACADEMIC_READING_PARTS: ExamPaperFormat['parts'] = [
  {
    number: 1,
    context: 'A long text from an academic source (often narrative or descriptive).',
    questions: 13,
  },
  { number: 2, context: 'A longer argumentative or analytical text.', questions: 13 },
  {
    number: 3,
    context: 'The hardest text: dense argumentation and more complex question sets.',
    questions: 14,
  },
];

/** General Training Reading structure: three sections, commonly split 14/13/13. */
const GENERAL_TRAINING_READING_PARTS: ExamPaperFormat['parts'] = [
  {
    number: 1,
    context: 'Two or three short everyday texts (notices, advertisements, timetables).',
    questions: 14,
  },
  { number: 2, context: 'Workplace texts (job descriptions, contracts, staff notices).', questions: 13 },
  { number: 3, context: 'One longer general-interest text.', questions: 13 },
];

/**
 * Build the official format reference for one module.
 *
 * @param module - Module whose format is described.
 */
export function buildExamFormat(module: IeltsModule): ExamFormat {
  const readingParts =
    module === 'general-training' ? GENERAL_TRAINING_READING_PARTS : ACADEMIC_READING_PARTS;
  return {
    module,
    listening: {
      durationSeconds: LISTENING_SECONDS,
      transferMinutes: 10,
      questions: 40,
      parts: LISTENING_PARTS,
    },
    reading: {
      durationSeconds: READING_SECONDS,
      transferMinutes: 0,
      questions: 40,
      parts: readingParts,
    },
    writing: {
      durationSeconds: WRITING_SECONDS,
      task1: { minutes: 20, minimumWords: 150 },
      task2: { minutes: 40, minimumWords: 250 },
    },
    speaking: {
      duration: '11\u201314 minutes',
      parts: [
        {
          part: 1,
          duration: '4\u20135 minutes',
          notes: 'Short questions on familiar topics; answers of a few sentences.',
        },
        {
          part: 2,
          duration: '3\u20134 minutes',
          notes: 'One minute to prepare, then a two-minute talk from a cue card.',
        },
        {
          part: 3,
          duration: '4\u20135 minutes',
          notes: 'Follow-up discussion extending the Part 2 topic.',
        },
      ],
    },
    totalDuration: {
      minutes: '161\u2013164',
      note: 'Listening plus Reading plus Writing plus the face-to-face Speaking interview, excluding waiting time.',
    },
  };
}

/**
 * Allocate a total count across weighted shares using the largest-remainder
 * method, so the allocated counts always sum to `total`.
 *
 * @param shares - Non-negative weights, one per bucket.
 * @param total - Total number of items to allocate.
 */
export function allocateQuestions(shares: readonly number[], total: number): number[] {
  if (total <= 0) {
    return shares.map(() => 0);
  }
  if (shares.length === 0) {
    return [];
  }
  const totalShare = shares.reduce((sum, share) => sum + share, 0);
  if (totalShare <= 0) {
    return shares.map(() => 0);
  }
  const raw = shares.map((share) => (share / totalShare) * total);
  const allocated = raw.map((value) => Math.floor(value));
  let remainder = total - allocated.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  for (let position = 0; position < order.length && remainder > 0; position += 1) {
    const entry = order[position] as { index: number };
    allocated[entry.index] = (allocated[entry.index] as number) + 1;
    remainder -= 1;
  }
  return allocated;
}

/** Graded-reading level suggested for a target band. */
function levelForTarget(target: number): CefrBand {
  if (target <= 4.5) {
    return 'A1-A2';
  }
  return target <= 6.5 ? 'B1-B2' : 'C1-C2';
}

/** Share of each question type observed in one receptive paper. */
function typeMixFor(skill: 'listening' | 'reading', paper: 'listening' | 'reading'): ExamTypeShare[] {
  const counts = practiceStats().questionTypesBySkill[skill] as Partial<Record<QuestionTypeId, number>>;
  const sorted = (Object.entries(counts) as [QuestionTypeId, number][])
    .sort((left, right) => right[1] - left[1])
    .slice(0, paper === 'listening' ? 4 : 5);
  const total = sorted.reduce((sum, entry) => sum + entry[1], 0);
  const questions = allocateQuestions(
    sorted.map((entry) => entry[1]),
    40,
  );
  return sorted
    .map(([id, count], index) => ({
      id,
      name: TYPE_NAMES[id],
      share: Math.round((count / total) * 10000) / 10000,
      questions: questions[index] as number,
    }))
    .sort((left, right) => left.questions - right.questions);
}

/** One indexed practice item, reduced to the metadata the blueprint needs. */
function toSourceItem(item: PracticeItem): ExamSourceItem {
  return {
    id: item.id,
    title: item.title,
    url: item.sourceUrl,
    collection: item.collection,
    questions: item.questions,
    questionTypes: [...item.questionTypes],
    level: item.level,
    readingEase: item.readability?.fleschReadingEase ?? null,
  };
}

/** Choose one listening practice paper from the index. */
function listeningSources(seed: string): ExamSourceItem[] {
  const pool = practiceItems().filter((item) => item.collection === 'listening-full-test');
  const index = seededIndices(`${seed}|listening-source`, pool.length, 1)[0] as number;
  return [toSourceItem(pool[index] as PracticeItem)];
}

/** Choose reading practice material: graded lessons for a target, a full paper otherwise. */
function readingSources(seed: string, target: number | null): ExamSourceItem[] {
  if (target !== null) {
    const level = levelForTarget(target);
    const pool = practiceItems().filter(
      (item) => item.collection === 'graded-reading' && item.level === level,
    );
    const indices = seededIndices(`${seed}|reading-source|${level}`, pool.length, 3);
    return indices.map((index) => toSourceItem(pool[index] as PracticeItem));
  }
  const pool = practiceItems().filter((item) => item.collection === 'reading-full-test');
  const indices = seededIndices(`${seed}|reading-source`, pool.length, 1);
  return indices.map((index) => toSourceItem(pool[index] as PracticeItem));
}

/** Pick one item of a topic pool by seed. */
function pickOne<T>(seed: string, pool: readonly T[]): T {
  const index = seededIndices(seed, pool.length, 1)[0] as number;
  return pool[index] as T;
}

/** Notes shared by every blueprint. */
function blueprintNotes(target: number | null): string[] {
  const notes = [
    'The blueprint is a pure function of module, date and seed: identical inputs produce identical sessions on every replica.',
    'Linked practice items are derived metadata from the practice-test index; their question counts are upstream figures and may differ from the official 40-question format, so they are linked for practice, never claimed to be a paper.',
    'The Reading question split across three passages varies by paper; the figures are the commonly published distribution.',
    'Speaking parts are drawn independently from the topic bank; in a live test Part 3 extends the Part 2 theme.',
    'Paper-based Listening allows 10 minutes to transfer answers; Reading and computer-delivered Listening do not.',
    'Raw marks convert with the indicative tables published by /v1/scores/raw; boundaries move by up to one mark per test version.',
  ];
  if (target !== null) {
    notes.push(
      `Graded reading sources were selected for the ${levelForTarget(target)} lessons, matching a target of ${target.toFixed(1)}.`,
    );
  }
  return notes;
}

/**
 * Build a deterministic mock-exam blueprint.
 *
 * @param options - Pre-validated inputs.
 */
export function buildExamBlueprint(options: {
  module: IeltsModule;
  date: string;
  seed: string;
  target: number | null;
}): MockExamBlueprint {
  const { module, date, seed, target } = options;
  const format = buildExamFormat(module);
  const themesPool = EXAM_THEMES.filter((theme) => theme.skills.includes('writing'));
  const themeIndices = seededIndices(`ielts-api|exam-themes|${seed}`, themesPool.length, 2);
  const taskOne = pickOne(
    `${seed}|task1|${module}`,
    TASK_TYPES.filter((task) => task.module === module),
  );
  const taskTwo = pickOne(`${seed}|task2`, WRITING_TOPICS);
  const partOne = pickOne(
    `${seed}|speaking|1`,
    SPEAKING_TOPICS.filter((topic) => topic.part === 1),
  );
  const partTwo = pickOne(
    `${seed}|speaking|2`,
    SPEAKING_TOPICS.filter((topic) => topic.part === 2),
  );
  const partThree = pickOne(
    `${seed}|speaking|3`,
    SPEAKING_TOPICS.filter((topic) => topic.part === 3),
  );

  return {
    session: {
      id: `mock-${hashString(`ielts-api|exam|${module}|${seed}`).toString(16).padStart(8, '0')}`,
      module,
      date,
      seed,
      reproducible: true,
    },
    themes: themeIndices.map((index) => {
      const theme = themesPool[index] as (typeof EXAM_THEMES)[number];
      return { id: theme.id, group: theme.group, name: theme.name };
    }),
    listening: {
      format: format.listening,
      questionTypeMix: typeMixFor('listening', 'listening'),
      sources: listeningSources(seed),
    },
    reading: {
      format: format.reading,
      questionTypeMix: typeMixFor('reading', 'reading'),
      sources: readingSources(seed, target),
    },
    writing: {
      format: format.writing,
      task1: {
        familyId: taskOne.id,
        name: taskOne.name,
        endpoint: `/v1/tasks/writing?module=${module}`,
      },
      task2: {
        prompt: taskTwo.prompt,
        category: taskTwo.category,
        questionType: taskTwo.questionType,
        positions: [...taskTwo.positions],
        endpoint: `/v1/topics/writing?category=${encodeURIComponent(taskTwo.category)}&type=${taskTwo.questionType}`,
      },
    },
    speaking: {
      duration: format.speaking.duration,
      parts: format.speaking.parts,
      part1: { topic: partOne.topic, questions: [...partOne.questions] },
      part2: { topic: partTwo.topic, cueCard: [...partTwo.questions] },
      part3: { topic: partThree.topic, questions: [...partThree.questions] },
    },
    scoring: {
      overallRule:
        'Overall = mean of the three paper bands and the Speaking band, rounded to the nearest half band; means ending in .25 or .75 round up.',
      rawEndpoint: '/v1/scores/raw?skill=listening&correct=27',
      tablesEndpoint: '/v1/scores/raw/tables',
    },
    notes: blueprintNotes(target),
  };
}
