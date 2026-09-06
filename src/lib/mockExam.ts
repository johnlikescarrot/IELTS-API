/**
 * Deterministic mock-paper composition for the exam centre.
 *
 * The manifest concept is borrowed from the open `wanli4473/yysd-testcenter`
 * site, where a GitHub Action regenerates a manifest that the exam viewer
 * consumes: one row per paper, with its timing and structure. Here the
 * manifest is not generated from files on disk but *composed from the API's
 * own datasets* — the practice-test index, the task banks and the topic banks
 * — so any client can request a full, timed mock paper deterministically and
 * follow each pointer back to its metadata. No test content is redistributed:
 * the paper carries structure, time budgets and links.
 */

import { examTestDayConfig, listeningAfter } from '../data/examFormat.js';
import { RESPONSE_FRAMEWORKS } from '../data/frameworks.js';
import { practiceItems } from '../data/practiceTests.js';
import { findTaskTypes } from '../data/tasks.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { randomEntries } from '../data/vocabulary.js';
import { hashString, seededIndices } from './rng.js';

import type {
  CefrBand,
  ExamDelivery,
  ExamModule,
  MockPaper,
  MockPaperItem,
  MockPaperSection,
} from '../types.js';

/** Options accepted by {@link buildMockPaper}; all values are pre-validated. */
export interface MockPaperOptions {
  /** Seed string; identical inputs produce identical papers. */
  seed: string;
  /** Examination paper. */
  module: ExamModule;
  /** Delivery mode; it sets the time budgets. */
  delivery: ExamDelivery;
  /** CEFR level for the reading selection, omitting full tests in favour of graded lessons. */
  level?: CefrBand | undefined;
  /** Number of vocabulary warm-up headwords; `0` drops the warm-up section. */
  words: number;
}

/** Deterministically choose one element of a pool. */
function pick<T>(pool: readonly T[], key: string): T {
  const index = seededIndices(key, pool.length, 1)[0] as number;
  return pool[index] as T;
}

/** Deterministically choose `count` distinct elements of a pool, in pool order. */
function pickMany<T>(pool: readonly T[], key: string, count: number): T[] {
  return seededIndices(key, pool.length, count).map((index) => pool[index] as T);
}

/** Listening and Reading items, straight from the practice-test index. */
function receptiveItems(section: 'listening' | 'reading', key: string, level?: CefrBand): MockPaperItem[] {
  if (section === 'listening') {
    const pool = practiceItems().filter((item) => item.collection === 'listening-full-test');
    const chosen = pick(pool, key);
    return [
      {
        dataset: 'tests',
        id: chosen.id,
        title: chosen.title,
        link: `/v1/tests/${chosen.id}`,
        note: `${chosen.questions} questions across ${chosen.sections} parts; upstream audio indexed: ${String(
          chosen.assets.audio,
        )}.`,
      },
    ];
  }
  if (level !== undefined) {
    const pool = practiceItems().filter(
      (item) => item.collection === 'graded-reading' && item.level === level,
    );
    return pickMany(pool, key, 2).map((item) => ({
      dataset: 'tests',
      id: item.id,
      title: item.title,
      link: `/v1/tests/${item.id}`,
      note: `Graded ${item.level}; ${item.questions} questions, ${item.vocabularyCount} glossed headwords.`,
    }));
  }
  const pool = practiceItems().filter((item) => item.collection === 'reading-full-test');
  const chosen = pick(pool, key);
  return [
    {
      dataset: 'tests',
      id: chosen.id,
      title: chosen.title,
      link: `/v1/tests/${chosen.id}`,
      note: `${chosen.questions} questions across ${chosen.passages} passages; median length is known from the index.`,
    },
  ];
}

/** Writing section: one Task 1 family, one Task 2 prompt, and a matching response framework. */
function writingItems(module: ExamModule, key: string): MockPaperItem[] {
  const task1 = pick(findTaskTypes(module), `${key}|task1`);
  const task2 = pick(WRITING_TOPICS, `${key}|task2`);
  // Every essay question type in the topic bank has at least one matching
  // Task 2 framework; `test/lib/mockExam.test.ts` pins that invariant down.
  const frameworks = RESPONSE_FRAMEWORKS.filter(
    (framework) =>
      framework.section === 'writing-task-2' && framework.questionTypes.includes(task2.questionType),
  );
  const framework = pick(frameworks, `${key}|framework`);
  return [
    {
      dataset: 'tasks/writing',
      id: task1.id,
      title: `Task 1 — ${task1.name}`,
      link: `/v1/tasks/writing?module=${module}`,
      note: task1.description,
    },
    {
      dataset: 'topics/writing',
      id: task2.id,
      title: `Task 2 — ${task2.questionType} (${task2.category})`,
      link: `/v1/topics/writing?category=${encodeURIComponent(task2.category)}`,
      note: task2.prompt,
    },
    {
      dataset: 'frameworks',
      id: framework.id,
      title: `Framework — ${framework.name}`,
      link: `/v1/frameworks/${framework.id}`,
      note: `${framework.stages.length} ordered stages and ${framework.pitfalls.length} documented pitfalls for a ${task2.questionType} response.`,
    },
  ];
}

/** Speaking section: one topic per part. */
function speakingItems(key: string): MockPaperItem[] {
  return ([1, 2, 3] as const).map((part) => {
    const pool = SPEAKING_TOPICS.filter((topic) => topic.part === part);
    const chosen = pick(pool, `${key}|part${part}`);
    return {
      dataset: 'topics/speaking',
      id: chosen.id,
      title: `Part ${part} — ${chosen.topic}`,
      link: `/v1/topics/speaking?part=${part}`,
      note: chosen.questions.join(' / '),
    };
  });
}

/**
 * Compose a full mock paper manifest from the API's own datasets.
 *
 * @param options - Validated composition inputs.
 */
export function buildMockPaper(options: MockPaperOptions): MockPaper {
  const { seed, module, delivery, level, words } = options;
  const config = examTestDayConfig(module, delivery);
  const key = [seed, module, delivery, level ?? '', String(words)].join('|');
  const minutes = new Map(config.sections.map((section) => [section.id, section.durationMinutes] as const));
  const minutesOf = (id: 'listening' | 'reading' | 'writing' | 'speaking'): number =>
    minutes.get(id) as number;

  const sections: MockPaperSection[] = [];
  if (words > 0) {
    sections.push({
      id: 'vocabulary',
      name: 'Vocabulary warm-up',
      skill: null,
      minutes: 10,
      instructions: [
        'Ten minutes, before the papers start: write a one-line definition of each headword from memory.',
        'Check every definition at its link; add the misses to a personal review list.',
      ],
      items: randomEntries(`${key}|vocab`, words).map((entry) => ({
        dataset: 'vocabulary',
        id: entry.id,
        title: entry.word,
        link: `/v1/vocabulary/${encodeURIComponent(entry.word)}`,
        note: entry.partOfSpeech,
      })),
    });
  }

  const after = listeningAfter(delivery);
  sections.push(
    {
      id: 'listening',
      name: 'Listening',
      skill: 'listening',
      minutes: minutesOf('listening'),
      instructions:
        delivery === 'paper'
          ? [`Play every recording once. Allow ${after.minutes} minutes of ${after.label} at the end.`]
          : [`Type answers as you listen; allow the ${after.minutes} minutes of ${after.label} at the end.`],
      items: receptiveItems('listening', `${key}|listening`),
    },
    {
      id: 'reading',
      name: 'Reading',
      skill: 'reading',
      minutes: minutesOf('reading'),
      instructions: ['Sixty minutes for the whole paper; there is no transfer time.'],
      items: receptiveItems('reading', `${key}|reading`, level),
    },
    {
      id: 'writing',
      name: 'Writing',
      skill: 'writing',
      minutes: minutesOf('writing'),
      instructions: ['Sixty minutes for both tasks; Task 2 counts for twice as much as Task 1.'],
      items: writingItems(module, `${key}|writing`),
    },
    {
      id: 'speaking',
      name: 'Speaking',
      skill: 'speaking',
      minutes: minutesOf('speaking'),
      instructions: [
        'Record yourself; one minute of preparation before Part 2 only.',
        'Mark afterwards with /v1/bands/descriptors?set=speaking.',
      ],
      items: speakingItems(`${key}|speaking`),
    },
  );

  return {
    id: `mock.${(hashString(key) >>> 0).toString(36)}`,
    seed,
    module,
    delivery,
    level: level ?? null,
    sections,
    totalMinutes: config.sittingMinutes,
    answerSheet: {
      listening: { questions: 40 },
      reading: { questions: 40 },
      writing: { task1Words: 150, task2Words: 250 },
      speaking: { parts: 3 },
    },
    next: {
      schedule: `/v1/exam/schedule?module=${module}&delivery=${delivery}`,
      report: `/v1/exam/report?module=${module}`,
      tables: '/v1/exam/tables',
    },
    provenance:
      'Composed deterministically from this API’s own indexes; every item is metadata and a pointer, never ' +
      'upstream test content. Time budgets follow the exam-format rulebook at /v1/exam/config.',
  };
}
