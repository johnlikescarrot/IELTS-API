/**
 * Exam-format reference for the four IELTS skills.
 *
 * The facts recorded here are the published test formats of the IELTS partners
 * (British Council, IDP and Cambridge Assessment English): part counts,
 * question counts, timings and delivery rules. They are deliberately kept to
 * what every candidate can verify on the public IELTS website, so that
 * downstream applications (practice apps, dashboards, LLM tools) never have to
 * hard-code the exam structure. The content is informed by, and interoperates
 * with, the community practice repository indexed at `/v1/catalog`.
 */

import type { SkillFormat } from '../types.js';

/** Published formats of the four IELTS skills. */
export const SKILL_FORMATS: readonly SkillFormat[] = [
  {
    id: 'listening',
    name: 'Listening',
    summary:
      'Four recorded sections and 40 questions; the same format is used for the Academic and General Training modules.',
    modules: ['academic', 'general-training'],
    minutes: 30,
    questionCount: 40,
    parts: [
      {
        name: 'Part 1',
        focus: 'Every-day social conversation between two people',
        minutes: 8,
        questionCount: 10,
      },
      {
        name: 'Part 2',
        focus: 'Every-day social monologue (talk, guide, announcement)',
        minutes: 8,
        questionCount: 10,
      },
      {
        name: 'Part 3',
        focus: 'Academic conversation with up to four people',
        minutes: 8,
        questionCount: 10,
      },
      {
        name: 'Part 4',
        focus: 'Academic monologue, usually a lecture extract',
        minutes: 8,
        questionCount: 10,
      },
    ],
    notes: [
      'Each recording is played once only.',
      'Paper-based candidates copy their answers to the answer sheet in an extra 10 minutes at the end.',
      'Computer-delivered candidates get two minutes to review their answers.',
      'Answers follow the printed word limit exactly; spelling and number formats are marked strictly.',
    ],
    scoringNote:
      'One mark per correct answer. 40 raw marks convert to a 0-9 band: see /v1/scores/raw?table=listening.',
  },
  {
    id: 'reading',
    name: 'Reading',
    summary:
      '60 minutes, 40 questions and three long texts; the Academic module uses authentic academic material, General Training uses workplace and survival texts.',
    modules: ['academic', 'general-training'],
    minutes: 60,
    questionCount: 40,
    parts: [
      {
        name: 'Section 1 (GT) / Passage 1 (AC)',
        focus: 'Social and functional texts; factual detail questions',
        minutes: 20,
        questionCount: 13,
      },
      {
        name: 'Section 2 (GT) / Passage 2 (AC)',
        focus: 'Workplace or semi-formal material; transactional detail and main points',
        minutes: 20,
        questionCount: 13,
      },
      {
        name: 'Section 3 (GT) / Passage 3 (AC)',
        focus: 'Long, dense, discursive text; inference, structure and viewpoint questions',
        minutes: 20,
        questionCount: 14,
      },
    ],
    notes: [
      'There is no extra transfer time; answers go on the sheet (or screen) while reading.',
      'Texts in the Academic module are drawn from books, journals and magazines and are described as accessible to a non-specialist.',
      'Question order generally follows the order of the text, except for matching tasks.',
      'Typical Academic passage length is 750-950 words; General Training Section 3 rarely exceeds 900 words.',
    ],
    scoringNote:
      'One mark per correct answer. Conversion differs per module: see /v1/scores/raw?table=reading-academic or reading-general-training.',
  },
  {
    id: 'writing',
    name: 'Writing',
    summary:
      'Two tasks in 60 minutes; Task 2 counts for twice as much as Task 1 and the two modules differ only in Task 1.',
    modules: ['academic', 'general-training'],
    minutes: 60,
    questionCount: null,
    parts: [
      {
        name: 'Task 1',
        focus: 'Academic: report on visual data. General Training: formal or informal letter.',
        minutes: 20,
        questionCount: null,
      },
      {
        name: 'Task 2',
        focus: 'Discursive essay responding to a point of view, argument or problem.',
        minutes: 40,
        questionCount: null,
      },
    ],
    notes: [
      'Task 1 expects at least 150 words and Task 2 at least 250 words; under-length responses are penalised.',
      'Bullet points stating what the response should cover appear on the question paper for both tasks.',
      'Handwritten and computer-delivered versions follow the same word expectations.',
    ],
    scoringNote:
      'Examiner-marked against four analytic criteria; see /v1/bands/descriptors?set=writing-task-1 and set=writing-task-2.',
  },
  {
    id: 'speaking',
    name: 'Speaking',
    summary:
      'A face-to-face, recorded interview of three parts lasting 11-14 minutes; identical in both modules.',
    modules: ['academic', 'general-training'],
    minutes: 14,
    questionCount: null,
    parts: [
      {
        name: 'Part 1',
        focus: 'Familiar-experience questions on two or three everyday topics',
        minutes: 5,
        questionCount: null,
      },
      {
        name: 'Part 2',
        focus:
          'Long turn: one minute of preparation, up to two minutes of uninterrupted speech on a cue card',
        minutes: 4,
        questionCount: null,
      },
      {
        name: 'Part 3',
        focus: 'Abstract two-way discussion extending the Part 2 topic',
        minutes: 5,
        questionCount: null,
      },
    ],
    notes: [
      'The examiner follows printed question frames but may adapt phrasing.',
      'The whole test is audio recorded for quality control and re-marking.',
      'Parts 1, 2 and 3 sample familiar, semi-formal and formal registers respectively.',
    ],
    scoringNote:
      'Examiner-marked against fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation; see /v1/bands/descriptors?set=speaking.',
  },
];

/** Identifiers of the four skills, in test order. */
export const SKILL_IDS: readonly string[] = SKILL_FORMATS.map((skill) => skill.id);

/**
 * Look up one skill format by identifier.
 *
 * @param id - Skill identifier (`listening`, `reading`, `writing`, `speaking`).
 */
export function findSkillFormat(id: string): SkillFormat | undefined {
  return SKILL_FORMATS.find((skill) => skill.id === id);
}
