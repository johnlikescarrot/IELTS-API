/**
 * Mock-exam composition and score reporting.
 *
 * A computer-delivered mock test, in the spirit of an online test centre, has
 * three stages: sit a complete four-skill paper, turn the objective answers
 * into bands, and read the report. {@link buildMockExam} assembles the paper
 * deterministically: it references one indexed Listening full test, one
 * indexed Reading full test, one Writing Task 1 family and Task 2 prompt, and
 * one Speaking topic per part, all drawn with seeded random picks, so a mock
 * exam is reproducible, citable and safe to cache. {@link buildMockReport}
 * then applies the raw-score tables of `/v1/scores/raw` to the objective
 * papers and merges them with examiner-style bands for the productive papers.
 */

import { convertRawScore, rawScoreTable } from '../data/rawScores.js';
import { cefrForBand } from '../data/bands.js';
import { practiceIndex, type PracticeIndex } from '../data/practiceTests.js';
import { findTaskTypes } from '../data/tasks.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { SKILLS, meanOf, roundBand } from './band.js';
import { seededIndices } from './rng.js';
import { round2 } from './textstats.js';

import type {
  IeltsModule,
  MockExam,
  MockExamSection,
  MockReport,
  MockReportComponent,
  JsonValue,
  PracticeItem,
  Skill,
} from '../types.js';

/** Inputs accepted by {@link buildMockExam}; all values are pre-validated. */
export type MockExamOptions = {
  /** Seed for every deterministic pick. */
  seed: string;
  /** Module the exam is composed for. */
  module: IeltsModule;
};

/** Inputs accepted by {@link buildMockReport}; all values are pre-validated. */
export type MockReportOptions = {
  /** Module reported on; selects the Reading conversion table. */
  module: IeltsModule;
  /** Correct answers out of 40 in the Listening paper. */
  listeningCorrect: number;
  /** Correct answers out of 40 in the Reading paper. */
  readingCorrect: number;
  /** Examiner-graded Writing band, when available. */
  writing: number | undefined;
  /** Examiner-graded Speaking band, when available. */
  speaking: number | undefined;
};

/** Canonical minutes per section, in sitting order. */
const SECTION_MINUTES: Record<Skill, number> = {
  listening: 30,
  reading: 60,
  writing: 60,
  speaking: 14,
};

/**
 * Pick one item from a population deterministically.
 *
 * @param seed - Seed string for this pick.
 * @param population - Items to choose from (non-empty).
 */
function pickOne<T>(seed: string, population: readonly T[]): T {
  const [index] = seededIndices(seed, population.length, 1);
  return population[index as number] as T;
}

/** Slim reference to an indexed practice item, as embedded in a section. */
function itemReference(item: PracticeItem): Record<string, JsonValue> {
  return {
    id: item.id,
    title: item.title,
    questions: item.questions,
    sections: item.sections,
    passages: item.passages,
    questionTypes: [...item.questionTypes],
    sourceUrl: item.sourceUrl,
  };
}

/** The pool the Listening paper is drawn from: full tests that ship audio. */
function listeningPool(index: PracticeIndex): PracticeItem[] {
  return index.items.filter((item) => item.collection === 'listening-full-test' && item.assets.audio);
}

/** The pool the Reading paper is drawn from: unparsed-section full tests. */
function readingPool(index: PracticeIndex): PracticeItem[] {
  return index.items.filter((item) => item.collection === 'reading-full-test');
}

/**
 * Compose a complete four-skill mock exam deterministically from a seed.
 *
 * The same seed always produces the same exam on every replica, so a returned
 * exam can be treated as a citable artefact. The exam references upstream
 * items by identifier and permalink; nothing is redistributed.
 */
export function buildMockExam(options: MockExamOptions): MockExam {
  const { seed, module } = options;
  const index = practiceIndex();
  const listening = pickOne(`mock:${seed}:listening`, listeningPool(index));
  const reading = pickOne(`mock:${seed}:reading`, readingPool(index));
  const task1 = pickOne(`mock:${seed}:writing-task-1`, findTaskTypes(module));
  const task2 = pickOne(`mock:${seed}:writing-task-2`, WRITING_TOPICS);
  const speakingParts = ([1, 2, 3] as const).map((part) =>
    pickOne(
      `mock:${seed}:speaking-part-${part}`,
      SPEAKING_TOPICS.filter((topic) => topic.part === part),
    ),
  );

  const sections: MockExamSection[] = [
    {
      skill: 'listening',
      order: 1,
      minutes: SECTION_MINUTES.listening,
      format: 'Four recordings, ten questions each; answers transfer or check time follows on paper exams.',
      content: { paper: itemReference(listening), recordings: 4, audio: true },
    },
    {
      skill: 'reading',
      order: 2,
      minutes: SECTION_MINUTES.reading,
      format: 'Three passages of increasing difficulty, forty questions, no extra transfer time.',
      content: {
        paper: itemReference(reading),
        note:
          'The indexed collection is module-agnostic; General Training candidates apply the ' +
          'general-training-reading conversion table to the same passages.',
      },
    },
    {
      skill: 'writing',
      order: 3,
      minutes: SECTION_MINUTES.writing,
      format:
        'Task 1 (at least 150 words, about 20 minutes) and Task 2 (at least 250 words, about 40 minutes).',
      content: {
        task1: {
          id: task1.id,
          name: task1.name,
          minimumWords: 150,
          suggestedMinutes: task1.suggestedMinutes,
        },
        task2: {
          id: task2.id,
          category: task2.category,
          questionType: task2.questionType,
          prompt: task2.prompt,
          minimumWords: 250,
        },
      },
    },
    {
      skill: 'speaking',
      order: 4,
      minutes: SECTION_MINUTES.speaking,
      format: 'Face-to-face interview: Part 1 (4-5 minutes), Part 2 cue card (3-4), Part 3 discussion (4-5).',
      content: {
        parts: speakingParts.map((topic) => ({
          part: topic.part,
          id: topic.id,
          topic: topic.topic,
          questions: [...topic.questions],
        })),
      },
    },
  ];

  return {
    seed,
    module,
    sections,
    questions: listening.questions + reading.questions,
    scoring: {
      listening: 'listening',
      reading: module === 'general-training' ? 'general-training-reading' : 'academic-reading',
    },
  };
}

/**
 * Turn a completed mock exam into a four-skill score report.
 *
 * Listening and Reading bands come from the published raw-score tables;
 * Writing and Speaking are examiner-graded and are only folded into the
 * overall when supplied. A component below its table's published floor stays
 * `null`, and so does the overall while any band is missing.
 */
export function buildMockReport(options: MockReportOptions): MockReport {
  const { module, listeningCorrect, readingCorrect, writing, speaking } = options;
  const readingTest = module === 'general-training' ? 'general-training-reading' : 'academic-reading';
  const listening = convertRawScore('listening', listeningCorrect);
  const reading = convertRawScore(readingTest, readingCorrect);

  const components: MockReportComponent[] = [
    {
      skill: 'listening',
      band: listening.band,
      source: 'raw-conversion',
      raw: { test: 'listening', correct: listeningCorrect, outOf: rawScoreTable('listening').questions },
    },
    {
      skill: 'reading',
      band: reading.band,
      source: 'raw-conversion',
      raw: { test: readingTest, correct: readingCorrect, outOf: rawScoreTable(readingTest).questions },
    },
  ];
  if (writing !== undefined) {
    components.push({ skill: 'writing', band: writing, source: 'examiner-band' });
  }
  if (speaking !== undefined) {
    components.push({ skill: 'speaking', band: speaking, source: 'examiner-band' });
  }

  const bandsBySkill = new Map(components.map((component) => [component.skill, component.band]));
  const complete =
    components.length === SKILLS.length && components.every((component) => component.band !== null);
  if (!complete) {
    const missing = SKILLS.filter(
      (skill) => bandsBySkill.get(skill) === null || bandsBySkill.get(skill) === undefined,
    );
    const last = missing[missing.length - 1] as string;
    const subject = missing.length === 1 ? last : `${missing.slice(0, -1).join(', ')} and ${last}`;
    const lackingLabel = missing.length === 1 ? `${subject} was` : `${subject} were`;
    return {
      module,
      components,
      overall: null,
      cefr: null,
      weakestSkills: [],
      spread: null,
      explanation:
        `The overall band is withheld: ${lackingLabel} ` +
        (listening.belowFloor || reading.belowFloor
          ? 'below the published conversion table floor or not reported; supply examiner bands for ' +
            'writing and speaking and raw scores inside the published tables (at least the floor row of each).'
          : 'not reported; supply the missing examiner-graded bands to complete the report.'),
    };
  }

  const bands = Object.fromEntries(
    components.map((component) => [component.skill, component.band as number]),
  );
  const mean = meanOf(bands as Record<Skill, number>);
  const overall = roundBand(mean);
  const values = components.map((component) => component.band as number);
  const lowest = Math.min(...values);
  return {
    module,
    components,
    overall,
    cefr: cefrForBand(overall),
    weakestSkills: components
      .filter((component) => component.band === lowest)
      .map((component) => component.skill),
    spread: round2(Math.max(...values) - lowest),
    explanation:
      `Component bands averaged ${round2(mean)}, which the IELTS rounding rule turns into overall ${overall}. ` +
      'Listening and Reading come from the published raw-score tables; Writing and Speaking are examiner bands.',
  };
}
