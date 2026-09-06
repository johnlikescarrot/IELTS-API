/**
 * The structure and timing of the IELTS test.
 *
 * A mock-exam centre needs exactly three things before it can run a paper:
 * how long each part lasts, how many questions it carries, and how much of the
 * final band it is worth. Those facts are published by the IELTS partners and
 * are reproduced here in a machine-readable form, split by delivery mode
 * (paper-based and computer-delivered differ only in the Listening transfer
 * window) and by module (Academic and General Training differ only in Reading
 * and Writing Task 1).
 *
 * The numbers are the published test specification, not measurements: they are
 * the same for every test day, which is what makes them safe to hard-code and
 * useful as a timing source for an invigilation clock.
 */

import type { ExamPaper, ExamPart, ExamStructure, Skill } from '../types.js';

/**
 * Working time of the three written papers, in minutes: 30 + 60 + 60.
 *
 * The often-quoted "2 hours 45 minutes" adds the 10-minute Listening transfer
 * window and the administrative time either side; the number here is the sum of
 * the published working times alone, which is what a mock clock needs.
 */
export const WRITTEN_MINUTES = 150;

/** Build a part row. */
function part(
  order: number,
  name: string,
  minutes: number | null,
  questions: number | null,
  detail: string,
): ExamPart {
  return { order, name, minutes, questions, detail };
}

const LISTENING_PARTS: readonly ExamPart[] = [
  part(1, 'Part 1', null, 10, 'A conversation between two speakers in an everyday social context.'),
  part(2, 'Part 2', null, 10, 'A monologue in an everyday social context, such as a guided tour.'),
  part(
    3,
    'Part 3',
    null,
    10,
    'A conversation between up to four speakers in an educational or training context.',
  ),
  part(4, 'Part 4', null, 10, 'An academic monologue, typically a university lecture.'),
];

const ACADEMIC_READING_PARTS: readonly ExamPart[] = [
  part(1, 'Passage 1', null, 13, 'The most accessible passage; typically descriptive or factual.'),
  part(2, 'Passage 2', null, 13, 'A discursive or analytical passage of increasing difficulty.'),
  part(3, 'Passage 3', null, 14, 'The most demanding passage; argumentative, with abstract vocabulary.'),
];

const GENERAL_READING_PARTS: readonly ExamPart[] = [
  part(1, 'Section 1: social survival', null, 14, 'Two or three short factual texts on everyday topics.'),
  part(2, 'Section 2: workplace survival', null, 13, 'Two short work-related texts.'),
  part(3, 'Section 3: general reading', null, 13, 'One longer, more complex text of general interest.'),
];

const WRITING_PARTS = (task1: string): readonly ExamPart[] => [
  part(1, 'Task 1', 20, 1, task1),
  part(
    2,
    'Task 2',
    40,
    1,
    'An essay of at least 250 words responding to a point of view, argument or problem. Worth two thirds of the Writing band.',
  ),
];

const SPEAKING_PARTS: readonly ExamPart[] = [
  part(
    1,
    'Part 1: introduction and interview',
    5,
    null,
    'Familiar questions about home, work, study and interests.',
  ),
  part(
    2,
    'Part 2: long turn',
    4,
    1,
    'One minute of preparation, then one to two minutes of uninterrupted speech on a task card, followed by one or two rounding-off questions.',
  ),
  part(3, 'Part 3: discussion', 5, null, 'Abstract discussion of the themes raised by the Part 2 task card.'),
];

/** Build one paper row. */
function paper(
  id: ExamPaper['id'],
  skill: Skill,
  minutes: number,
  questions: number | null,
  parts: readonly ExamPart[],
  extra: Omit<ExamPaper, 'id' | 'skill' | 'minutes' | 'questions' | 'parts'>,
): ExamPaper {
  return { id, skill, minutes, questions, parts, ...extra };
}

/** The four papers, in the order they are sat. */
const PAPERS: readonly ExamPaper[] = [
  paper('listening', 'listening', 30, 40, LISTENING_PARTS, {
    name: 'Listening',
    module: 'both',
    marking: 'objective',
    weightOfOverall: 0.25,
    transferMinutes: 10,
    transferNote:
      'Paper-based tests add 10 minutes after the recording to copy answers onto the answer sheet. Computer-delivered tests replace it with 2 minutes to check answers already typed on screen.',
    order: 1,
    notes: ['The recording is played once only.', 'One mark per question; spelling and grammar are marked.'],
  }),
  paper('academic-reading', 'reading', 60, 40, ACADEMIC_READING_PARTS, {
    name: 'Academic Reading',
    module: 'academic',
    marking: 'objective',
    weightOfOverall: 0.25,
    transferMinutes: 0,
    transferNote: 'No extra transfer time: answers are written directly on the answer sheet.',
    order: 2,
    notes: [
      'Three passages of 2,150-2,750 words in total, taken from books, journals and newspapers.',
      'Roughly 90 seconds per question once reading time is included.',
    ],
  }),
  paper('general-reading', 'reading', 60, 40, GENERAL_READING_PARTS, {
    name: 'General Training Reading',
    module: 'general-training',
    marking: 'objective',
    weightOfOverall: 0.25,
    transferMinutes: 0,
    transferNote: 'No extra transfer time: answers are written directly on the answer sheet.',
    order: 2,
    notes: [
      'Texts are drawn from notices, advertisements, handbooks and workplace documents.',
      'The conversion to bands is stricter than the Academic table because the texts are easier.',
    ],
  }),
  paper(
    'academic-writing',
    'writing',
    60,
    2,
    WRITING_PARTS(
      'A summary of at least 150 words describing a graph, table, chart, diagram or process. Worth one third of the Writing band.',
    ),
    {
      name: 'Academic Writing',
      module: 'academic',
      marking: 'analytic',
      weightOfOverall: 0.25,
      transferMinutes: 0,
      transferNote: 'No transfer time; the 60 minutes include planning and checking.',
      order: 3,
      notes: [
        'Task 2 carries twice the weight of Task 1: spend 20 minutes on Task 1 and 40 on Task 2.',
        'Under-length responses are penalised under Task Achievement or Task Response.',
      ],
    },
  ),
  paper(
    'general-writing',
    'writing',
    60,
    2,
    WRITING_PARTS(
      'A letter of at least 150 words in a personal, semi-formal or formal register. Worth one third of the Writing band.',
    ),
    {
      name: 'General Training Writing',
      module: 'general-training',
      marking: 'analytic',
      weightOfOverall: 0.25,
      transferMinutes: 0,
      transferNote: 'No transfer time; the 60 minutes include planning and checking.',
      order: 3,
      notes: [
        'Task 1 is a letter; the register asked for by the prompt is itself assessed.',
        'Task 2 carries twice the weight of Task 1.',
      ],
    },
  ),
  paper('speaking', 'speaking', 14, null, SPEAKING_PARTS, {
    name: 'Speaking',
    module: 'both',
    marking: 'analytic',
    weightOfOverall: 0.25,
    transferMinutes: 0,
    transferNote: 'Not applicable: the interview is recorded, not transcribed by the candidate.',
    order: 4,
    notes: [
      'A face-to-face interview of 11-14 minutes with a trained examiner.',
      'May be sat up to seven days before or after the written papers.',
    ],
  }),
];

/** Identifiers of every paper. */
export const EXAM_PAPERS: readonly ExamPaper['id'][] = PAPERS.map((entry) => entry.id);

/** Modules a paper can belong to. */
export const EXAM_MODULES = ['academic', 'general-training'] as const;

/**
 * The papers of one module, in the order they are sat.
 *
 * @param module - Module to describe.
 */
export function papersForModule(module: (typeof EXAM_MODULES)[number]): ExamPaper[] {
  return PAPERS.filter((entry) => entry.module === module || entry.module === 'both').sort(
    (left, right) => left.order - right.order,
  );
}

/**
 * Look up one paper by identifier.
 *
 * @param id - Paper identifier, case-insensitive.
 */
export function findExamPaper(id: string): ExamPaper | undefined {
  const needle = id.trim().toLowerCase();
  return PAPERS.find((entry) => entry.id === needle);
}

/**
 * The whole test specification for one module.
 *
 * @param module - Module to describe.
 */
export function examStructure(module: (typeof EXAM_MODULES)[number]): ExamStructure {
  const papers = papersForModule(module);
  const written = papers.filter((entry) => entry.skill !== 'speaking');
  const writtenMinutes = written.reduce((sum, entry) => sum + entry.minutes, 0);
  const transfer = written.reduce((sum, entry) => sum + entry.transferMinutes, 0);
  return {
    module,
    papers,
    totalQuestions: papers.reduce((sum, entry) => sum + (entry.questions ?? 0), 0),
    writtenMinutes,
    writtenMinutesWithTransfer: writtenMinutes + transfer,
    speakingMinutes: 14,
    sittingOrder: papers.map((entry) => entry.name),
    scoring:
      'Listening and Reading are marked out of 40 and converted with the tables at /v1/scores/raw. Writing and Speaking are marked against the analytic descriptors at /v1/bands/descriptors. The overall band is the mean of the four, rounded by the rule at /v1/scores/overall.',
  };
}

/** Every paper, in sitting order, regardless of module. */
export const ALL_EXAM_PAPERS: readonly ExamPaper[] = PAPERS;
