/**
 * The IELTS exam-format reference.
 *
 * An original compilation of the published format of each paper — timing,
 * sections, question counts and marking — written so that a mock-exam client
 * can configure its countdown timers, section shells and auto-marking from one
 * machine-readable source instead of scraping marketing pages. The facts
 * follow the test format published by the IELTS partners; the wording is this
 * project's own. Papers that are marked objectively cross-link to the
 * raw-score tables in `./rawScores.js`, and every paper links onwards to the
 * endpoint that serves its task families or descriptors.
 */

import type { ExamPaper, ExamPaperId, Skill } from '../types.js';

/** The six papers: Listening and Speaking are shared; Reading and Writing differ by module. */
export const EXAM_PAPERS: readonly ExamPaper[] = [
  {
    id: 'listening',
    skill: 'listening',
    module: 'both',
    name: 'Listening',
    summary:
      'Four recorded sections of increasing difficulty — two set in everyday social contexts and two in educational or training contexts — played once only, with 40 questions worth one mark each. Paper-based candidates get ten minutes to transfer answers; computer-delivered candidates get two minutes to check them instead.',
    durationMinutes: 30,
    transferMinutes: 10,
    sections: [
      {
        name: 'Part 1',
        detail: 'A conversation between two people in an everyday social context.',
        minutes: null,
      },
      {
        name: 'Part 2',
        detail: 'A monologue in an everyday social context, such as a speech about local facilities.',
        minutes: null,
      },
      {
        name: 'Part 3',
        detail: 'A conversation between up to four people in an educational or training context.',
        minutes: null,
      },
      {
        name: 'Part 4',
        detail: 'A monologue on an academic subject, such as a university lecture.',
        minutes: null,
      },
    ],
    questions: 40,
    wordMinimums: null,
    marking:
      'One mark per correct answer with no negative marking; the raw mark out of 40 converts to a band via the published table.',
    rawScoreTable: 'listening',
    relatedUrl: '/v1/question-types?skill=listening',
  },
  {
    id: 'academic-reading',
    skill: 'reading',
    module: 'academic',
    name: 'Academic Reading',
    summary:
      'Three long authentic texts of increasing difficulty, taken from books, journals, magazines and newspapers, with 40 questions that must be answered — and transferred — inside the hour.',
    durationMinutes: 60,
    transferMinutes: null,
    sections: [
      {
        name: 'Section 1',
        detail: 'The first long text with its question set; the most accessible of the three.',
        minutes: null,
      },
      {
        name: 'Section 2',
        detail: 'The second long text with its question set.',
        minutes: null,
      },
      {
        name: 'Section 3',
        detail: 'The third long text with its question set; the most demanding of the three.',
        minutes: null,
      },
    ],
    questions: 40,
    wordMinimums: null,
    marking:
      'One mark per correct answer with no negative marking; the raw mark out of 40 converts to a band via the Academic table.',
    rawScoreTable: 'academic-reading',
    relatedUrl: '/v1/question-types?skill=reading',
  },
  {
    id: 'general-reading',
    skill: 'reading',
    module: 'general-training',
    name: 'General Training Reading',
    summary:
      'Three sections drawn from everyday materials — notices, advertisements, handbooks, newspapers — moving from short survival texts to one longer general-interest passage, with 40 questions in the hour.',
    durationMinutes: 60,
    transferMinutes: null,
    sections: [
      {
        name: 'Section 1',
        detail: 'Two or three short factual texts of everyday social survival English.',
        minutes: null,
      },
      {
        name: 'Section 2',
        detail: 'Two short work-related texts, such as job descriptions or training materials.',
        minutes: null,
      },
      {
        name: 'Section 3',
        detail: 'One longer text on a topic of general interest.',
        minutes: null,
      },
    ],
    questions: 40,
    wordMinimums: null,
    marking:
      'One mark per correct answer with no negative marking; the raw mark out of 40 converts to a band via the General Training table, whose thresholds sit higher than the Academic ones.',
    rawScoreTable: 'general-reading',
    relatedUrl: '/v1/question-types?skill=reading',
  },
  {
    id: 'academic-writing',
    skill: 'writing',
    module: 'academic',
    name: 'Academic Writing',
    summary:
      'Two tasks in the hour: a 150-word data-description task worth one third of the marks and a 250-word essay worth two thirds, each scored against four analytic criteria.',
    durationMinutes: 60,
    transferMinutes: null,
    sections: [
      {
        name: 'Task 1',
        detail: 'Describe, summarise or explain visual information: a graph, table, chart, map or process.',
        minutes: 20,
      },
      {
        name: 'Task 2',
        detail:
          'Respond to a point of view, argument or problem in essay form; carries twice the weight of Task 1.',
        minutes: 40,
      },
    ],
    questions: null,
    wordMinimums: [150, 250],
    marking:
      'Each task is scored by a certificated examiner against task achievement, coherence and cohesion, lexical resource, and grammatical range and accuracy.',
    rawScoreTable: null,
    relatedUrl: '/v1/bands/descriptors?set=writing-task-2',
  },
  {
    id: 'general-writing',
    skill: 'writing',
    module: 'general-training',
    name: 'General Training Writing',
    summary:
      'Two tasks in the hour: a 150-word letter worth one third of the marks and a 250-word essay worth two thirds, each scored against four analytic criteria.',
    durationMinutes: 60,
    transferMinutes: null,
    sections: [
      {
        name: 'Task 1',
        detail:
          'Write a letter requesting information or explaining a situation; the style may be personal, semi-formal or formal.',
        minutes: 20,
      },
      {
        name: 'Task 2',
        detail:
          'Respond to a point of view, argument or problem in essay form; carries twice the weight of Task 1.',
        minutes: 40,
      },
    ],
    questions: null,
    wordMinimums: [150, 250],
    marking:
      'Each task is scored by a certificated examiner against task achievement, coherence and cohesion, lexical resource, and grammatical range and accuracy.',
    rawScoreTable: null,
    relatedUrl: '/v1/bands/descriptors?set=writing-task-2',
  },
  {
    id: 'speaking',
    skill: 'speaking',
    module: 'both',
    name: 'Speaking',
    summary:
      'A face-to-face interview in three parts — familiar topics, a two-minute long turn after one minute of preparation, and an abstract discussion — recorded and scored against four analytic criteria.',
    durationMinutes: 14,
    transferMinutes: null,
    sections: [
      {
        name: 'Part 1',
        detail: 'Introduction and interview on familiar topics such as home, work, studies and interests.',
        minutes: 5,
      },
      {
        name: 'Part 2',
        detail:
          'An individual long turn of up to two minutes on a cue-card topic, after one minute of preparation.',
        minutes: 4,
      },
      {
        name: 'Part 3',
        detail: 'A two-way discussion of abstract ideas and issues thematically linked to the Part 2 topic.',
        minutes: 5,
      },
    ],
    questions: null,
    wordMinimums: null,
    marking:
      'Scored by a certificated examiner against fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation.',
    rawScoreTable: null,
    relatedUrl: '/v1/bands/descriptors?set=speaking',
  },
];

/** Exam-paper identifiers, in paper order. */
export const EXAM_PAPER_IDS: readonly ExamPaperId[] = EXAM_PAPERS.map((paper) => paper.id);

/** Skills covered by the exam-format reference. */
export const EXAM_SKILLS: readonly Skill[] = [...new Set(EXAM_PAPERS.map((paper) => paper.skill))];

/** Modules covered by the exam-format reference. */
export const EXAM_MODULES: readonly ExamPaper['module'][] = [
  ...new Set(EXAM_PAPERS.map((paper) => paper.module)),
];

/**
 * Look up one exam paper by identifier.
 *
 * @param id - Case-insensitive paper identifier.
 */
export function findExamPaper(id: string): ExamPaper | undefined {
  const needle = id.trim().toLowerCase();
  return EXAM_PAPERS.find((paper) => paper.id === needle);
}
