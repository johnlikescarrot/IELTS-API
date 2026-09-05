/**
 * Test-format blueprints.
 *
 * A blueprint is the fixed structure of one IELTS paper: how many parts it has,
 * how long they run, how many items they carry and what each part is drawing
 * on. Blueprints are what make a practice set comparable to a real sitting, and
 * what a study needs in order to state that its instrument matched the test.
 *
 * Timings and item counts follow the IELTS partners' published test format. The
 * commentary is original to this project.
 */

import type { TestBlueprint, TestModule } from '../types.js';

/** The five papers a candidate can sit. */
export const TEST_MODULES: readonly TestModule[] = [
  'listening',
  'reading-academic',
  'reading-general-training',
  'writing-academic',
  'writing-general-training',
  'speaking',
];

/** Blueprints for every paper, in the order they are sat. */
export const TEST_BLUEPRINTS: readonly TestBlueprint[] = [
  {
    module: 'listening',
    name: 'Listening',
    skill: 'listening',
    sharedAcrossModules: true,
    durationMinutes: 30,
    transferMinutes: 10,
    items: 40,
    scoring: 'raw',
    rawScoreTable: 'listening',
    summary:
      'Four recorded parts of increasing difficulty, played once only. Paper candidates get ten extra minutes to copy answers onto the answer sheet; computer candidates get two.',
    parts: [
      {
        number: 1,
        name: 'Everyday conversation',
        items: 10,
        description: 'A conversation between two speakers in a social or transactional context.',
        register: 'social',
        focus: 'Listening for concrete factual detail: names, dates, addresses, prices, times.',
      },
      {
        number: 2,
        name: 'Everyday monologue',
        items: 10,
        description: 'A monologue in a social context, such as a talk about local facilities.',
        register: 'social',
        focus: 'Following a described layout or sequence, often with a map or plan.',
      },
      {
        number: 3,
        name: 'Educational discussion',
        items: 10,
        description: 'A discussion between up to four speakers in an educational or training context.',
        register: 'academic',
        focus: 'Tracking who holds which view as several speakers agree, qualify and disagree.',
      },
      {
        number: 4,
        name: 'Academic monologue',
        items: 10,
        description: 'A lecture or talk on an academic subject, delivered without pauses.',
        register: 'academic',
        focus: 'Sustaining attention over an unbroken stretch of academic argument.',
      },
    ],
  },
  {
    module: 'reading-academic',
    name: 'Academic Reading',
    skill: 'reading',
    sharedAcrossModules: false,
    durationMinutes: 60,
    transferMinutes: 0,
    items: 40,
    scoring: 'raw',
    rawScoreTable: 'reading-academic',
    summary:
      'Three long passages from books, journals and newspapers, written for a non-specialist audience. No extra transfer time is given: answers must be recorded as you go.',
    parts: [
      {
        number: 1,
        name: 'Passage 1',
        items: 13,
        description: 'A descriptive or factual text, typically the most accessible of the three.',
        register: 'academic',
        focus: 'Building speed early to bank time for the harder passages.',
      },
      {
        number: 2,
        name: 'Passage 2',
        items: 13,
        description: 'A discursive or analytical text with a more developed argument.',
        register: 'academic',
        focus: 'Following an argument across paragraphs rather than within them.',
      },
      {
        number: 3,
        name: 'Passage 3',
        items: 14,
        description: 'The most complex text, often argumentative and with a distinct authorial stance.',
        register: 'academic',
        focus: 'Separating the writer s position from the views the writer reports.',
      },
    ],
  },
  {
    module: 'reading-general-training',
    name: 'General Training Reading',
    skill: 'reading',
    sharedAcrossModules: false,
    durationMinutes: 60,
    transferMinutes: 0,
    items: 40,
    scoring: 'raw',
    rawScoreTable: 'reading-general-training',
    summary:
      'Three sections moving from everyday notices to a longer text of general interest. The texts are easier than the Academic paper, so the raw score needed for a given band is higher.',
    parts: [
      {
        number: 1,
        name: 'Social survival',
        items: 14,
        description: 'Two or more short factual texts: notices, advertisements, timetables.',
        register: 'everyday',
        focus: 'Extracting specific information from short, dense, practical texts.',
      },
      {
        number: 2,
        name: 'Workplace survival',
        items: 13,
        description: 'Two short work-related texts: contracts, staff handbooks, training material.',
        register: 'workplace',
        focus: 'Reading procedural and contractual language accurately.',
      },
      {
        number: 3,
        name: 'General reading',
        items: 13,
        description: 'One longer, more complex text of general interest.',
        register: 'general',
        focus: 'Sustaining comprehension over an extended descriptive text.',
      },
    ],
  },
  {
    module: 'writing-academic',
    name: 'Academic Writing',
    skill: 'writing',
    sharedAcrossModules: false,
    durationMinutes: 60,
    transferMinutes: 0,
    items: 2,
    scoring: 'analytic',
    rawScoreTable: null,
    summary:
      'Two tasks marked against four analytic criteria by a trained examiner. Task 2 carries twice the weight of Task 1, so the time split should follow the marks.',
    parts: [
      {
        number: 1,
        name: 'Task 1 — describe visual information',
        items: 1,
        description:
          'Summarise, describe or explain a graph, table, chart, diagram or process in at least 150 words.',
        register: 'academic',
        focus: 'Selecting and reporting the main features; no opinion is invited.',
      },
      {
        number: 2,
        name: 'Task 2 — discursive essay',
        items: 1,
        description:
          'Write a discursive essay responding to a point of view, argument or problem in at least 250 words.',
        register: 'academic',
        focus: 'Answering every part of the prompt with a clear, sustained position.',
      },
    ],
  },
  {
    module: 'writing-general-training',
    name: 'General Training Writing',
    skill: 'writing',
    sharedAcrossModules: false,
    durationMinutes: 60,
    transferMinutes: 0,
    items: 2,
    scoring: 'analytic',
    rawScoreTable: null,
    summary:
      'Two tasks marked against four analytic criteria. Task 1 is a letter whose register — formal, semi-formal or informal — is set by the prompt.',
    parts: [
      {
        number: 1,
        name: 'Task 1 — letter',
        items: 1,
        description:
          'Write a letter requesting information or explaining a situation, in at least 150 words.',
        register: 'everyday',
        focus: 'Matching register to the stated relationship with the reader.',
      },
      {
        number: 2,
        name: 'Task 2 — essay',
        items: 1,
        description:
          'Write an essay responding to a point of view, argument or problem, in at least 250 words. The style may be less formal than the Academic paper.',
        register: 'general',
        focus: 'Answering every part of the prompt with a clear, sustained position.',
      },
    ],
  },
  {
    module: 'speaking',
    name: 'Speaking',
    skill: 'speaking',
    sharedAcrossModules: true,
    durationMinutes: 14,
    transferMinutes: 0,
    items: 3,
    scoring: 'analytic',
    rawScoreTable: null,
    summary:
      'A face-to-face interview of eleven to fourteen minutes in three parts, recorded and marked against four analytic criteria. The same test is used for Academic and General Training.',
    parts: [
      {
        number: 1,
        name: 'Introduction and interview',
        items: 1,
        description: 'Four to five minutes of questions on familiar topics: home, work, study, interests.',
        register: 'social',
        focus: 'Answering fully without over-preparing; short answers cap fluency marks.',
      },
      {
        number: 2,
        name: 'Individual long turn',
        items: 1,
        description:
          'A cue card with one minute to prepare and one to two minutes to speak, followed by a rounding-off question.',
        register: 'social',
        focus: 'Using the preparation minute to plan the whole turn, not just the opening.',
      },
      {
        number: 3,
        name: 'Two-way discussion',
        items: 1,
        description: 'Four to five minutes of abstract discussion developing the themes of the Part 2 topic.',
        register: 'academic',
        focus: 'Justifying, speculating and comparing rather than describing.',
      },
    ],
  },
];

/**
 * Look up one blueprint.
 *
 * @param module - Module identifier, e.g. `reading-academic`.
 */
export function findBlueprint(module: string): TestBlueprint | undefined {
  const needle = module.toLowerCase();
  return TEST_BLUEPRINTS.find((blueprint) => blueprint.module === needle);
}

/** Total test time, excluding the Speaking interview, which may be sat separately. */
export function totalTestMinutes(): number {
  return TEST_BLUEPRINTS.filter((blueprint) => blueprint.skill !== 'speaking')
    .filter((blueprint) => !blueprint.module.endsWith('general-training'))
    .reduce((total, blueprint) => total + blueprint.durationMinutes + blueprint.transferMinutes, 0);
}
