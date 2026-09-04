import type { AssessmentCriterion, WritingCriterion } from '../types/ielts.js';

/**
 * Band descriptors for the four Writing assessment criteria (Task Achievement /
 * Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical
 * Range and Accuracy) for bands 0 through 9.
 */
export const WRITING_CRITERIA: readonly AssessmentCriterion[] = [
  {
    id: 'task-achievement',
    name: 'Task Achievement / Task Response',
    description:
      'How fully the response addresses all parts of the task and how well ideas are developed and supported.',
    descriptors: [
      {
        band: 0,
        description: 'No assessable response, or the response is wholly unrelated to the task.',
      },
      { band: 1, description: 'The response is barely relevant and contains very little content.' },
      {
        band: 2,
        description:
          'A limited response with little development; the task is only partially addressed.',
      },
      {
        band: 3,
        description: 'The response addresses the task only minimally and lacks developed ideas.',
      },
      {
        band: 4,
        description:
          'A partially developed response with limited relevance and under-supported ideas.',
      },
      {
        band: 5,
        description: 'Positions are presented but may be inconsistent; ideas are under-developed.',
      },
      {
        band: 6,
        description:
          'The task is addressed, although some parts may be more fully covered than others.',
      },
      {
        band: 7,
        description: 'The task is addressed fully with a clear position and well-developed ideas.',
      },
      {
        band: 8,
        description:
          'All parts of the task are sufficiently and consistently addressed and developed.',
      },
      {
        band: 9,
        description:
          'A fully developed, fully relevant, and precisely focused response to every part of the task.',
      },
    ],
  },
  {
    id: 'coherence-cohesion',
    name: 'Coherence and Cohesion',
    description:
      'How logically the response is organised and how effectively ideas and paragraphs are linked together.',
    descriptors: [
      {
        band: 0,
        description: 'No assessable coherence; the response is not intelligible as connected text.',
      },
      { band: 1, description: 'Almost no communicative organisation; ideas are not connected.' },
      {
        band: 2,
        description: 'Very limited organisation; simple connections are rare and often unclear.',
      },
      {
        band: 3,
        description:
          'The response is loosely organised and cohesion is used weakly and inaccurately.',
      },
      {
        band: 4,
        description: 'Organisation is apparent but inadequate; cohesion is used mechanically.',
      },
      {
        band: 5,
        description:
          'Cohesive devices are used but may be faulty or mechanical; progression is uneven.',
      },
      {
        band: 6,
        description:
          'The response is coherent and uses cohesive devices effectively, though with some errors.',
      },
      {
        band: 7,
        description:
          'Logical progression is clear and cohesion is used flexibly and appropriately.',
      },
      {
        band: 8,
        description:
          'The response is coherent throughout and cohesion is used skilfully with no noticeable faults.',
      },
      {
        band: 9,
        description:
          'Full cohesion in a logically organised response that carries meaning effortlessly.',
      },
    ],
  },
  {
    id: 'lexical-resource',
    name: 'Lexical Resource',
    description:
      'The range, precision, and appropriateness of the vocabulary used across the response.',
    descriptors: [
      { band: 0, description: 'No assessable language; only a few isolated words are attempted.' },
      { band: 1, description: 'Only a very limited set of isolated words is produced.' },
      {
        band: 2,
        description: 'A basic range of words is used inadequately and with frequent errors.',
      },
      {
        band: 3,
        description:
          'A narrow range of vocabulary is used with noticeable errors and limited precision.',
      },
      {
        band: 4,
        description: 'Limited vocabulary is used with frequent inaccuracies and little precision.',
      },
      {
        band: 5,
        description:
          'A modest range of vocabulary is used; errors occur in word choice and spelling.',
      },
      {
        band: 6,
        description:
          'An adequate range of vocabulary is used with some errors in word choice and collocation.',
      },
      {
        band: 7,
        description:
          'A good vocabulary range is used flexibly with occasional inaccuracies and less common items.',
      },
      {
        band: 8,
        description:
          'A wide vocabulary is used fluently and precisely, with only rare errors in collocation.',
      },
      {
        band: 9,
        description: 'A wide, precise, and naturally controlled vocabulary is used throughout.',
      },
    ],
  },
  {
    id: 'grammatical-range-accuracy',
    name: 'Grammatical Range and Accuracy',
    description:
      'The variety, precision, and accuracy of grammatical structures used in the response.',
    descriptors: [
      { band: 0, description: 'No assessable grammar; communication is impossible.' },
      {
        band: 1,
        description: 'Only isolated words and phrases are produced; no grammatical control.',
      },
      {
        band: 2,
        description: 'Simple structures are attempted but frequent errors prevent communication.',
      },
      { band: 3, description: 'Simple structures are used, but frequent errors impede meaning.' },
      { band: 4, description: 'Only a limited range of structures is used with frequent errors.' },
      {
        band: 5,
        description:
          'A limited range of structures is used; errors are frequent but meaning is generally clear.',
      },
      { band: 6, description: 'A mix of simple and complex structures is used with some errors.' },
      {
        band: 7,
        description:
          'A variety of complex structures is used with frequent, but not error-prone, accuracy.',
      },
      {
        band: 8,
        description:
          'A wide range of structures is used with a high degree of control and few errors.',
      },
      {
        band: 9,
        description: 'A full range of structures is used accurately, flexibly, and without error.',
      },
    ],
  },
];

/** Retrieve a single Writing criterion by identifier. */
export function getWritingCriterion(id: WritingCriterion): AssessmentCriterion | undefined {
  return WRITING_CRITERIA.find((criterion) => criterion.id === id);
}
