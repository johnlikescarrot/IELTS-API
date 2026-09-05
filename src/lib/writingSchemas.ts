/**
 * OpenAPI schemas for the original Task 1 practice contract.
 * Array bounds describe the tested revision-one corpus and its SVG layouts;
 * extending those layouts requires updating the schemas and data invariants.
 */

import { WRITING_EXERCISE_KINDS } from '../data/writingExercises.js';

/** Complete exercise schema; no answer key or learner text is part of a stimulus. */
export const WRITING_EXERCISE_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'kind',
    'title',
    'taskTypeId',
    'stimulus',
    'checklist',
    'revision',
    'instructions',
    'minimumWords',
    'suggestedMinutes',
    'figureUrl',
    'checks',
  ],
  properties: {
    id: { type: 'string' },
    kind: { type: 'string', enum: [...WRITING_EXERCISE_KINDS] },
    title: { type: 'string' },
    taskTypeId: { type: 'string', description: 'Identifier from /v1/tasks/writing.' },
    revision: { type: 'string', description: 'Revision of the original stimulus set.' },
    instructions: { type: 'string' },
    minimumWords: { type: 'integer', const: 150 },
    suggestedMinutes: { type: 'integer', const: 20 },
    figureUrl: { type: 'string', description: 'Relative URL of the accessible SVG figure.' },
    checklist: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
    checks: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['id', 'question', 'options'],
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['id', 'text'],
              properties: { id: { type: 'string' }, text: { type: 'string' } },
            },
          },
        },
      },
    },
    stimulus: {
      oneOf: [
        {
          type: 'object',
          required: ['kind', 'title', 'categoryLabel', 'categories', 'unit', 'series', 'note'],
          properties: {
            kind: { type: 'string', enum: ['line-graph', 'bar-chart', 'pie-chart'] },
            title: { type: 'string' },
            categoryLabel: { type: 'string' },
            categories: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
            unit: { type: 'string' },
            note: { type: 'string' },
            series: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                type: 'object',
                required: ['label', 'values'],
                properties: {
                  label: { type: 'string' },
                  values: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 5,
                    description: 'Aligned with categories. Null means not reported; zero is a reported zero.',
                    items: { type: ['number', 'null'], minimum: 0 },
                  },
                },
              },
            },
          },
        },
        {
          type: 'object',
          required: ['kind', 'title', 'columns', 'rows', 'note'],
          properties: {
            kind: { type: 'string', const: 'table' },
            title: { type: 'string' },
            note: { type: 'string' },
            columns: {
              type: 'array',
              minItems: 2,
              maxItems: 2,
              items: {
                type: 'object',
                required: ['label', 'unit'],
                properties: { label: { type: 'string' }, unit: { type: 'string' } },
              },
            },
            rows: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: {
                type: 'object',
                required: ['label', 'values'],
                properties: {
                  label: { type: 'string' },
                  values: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0 } },
                },
              },
            },
          },
        },
        {
          type: 'object',
          required: ['kind', 'title', 'periods', 'note'],
          properties: {
            kind: { type: 'string', const: 'map' },
            title: { type: 'string' },
            note: { type: 'string' },
            periods: {
              type: 'array',
              minItems: 2,
              maxItems: 2,
              items: {
                type: 'object',
                required: ['label', 'cells'],
                properties: {
                  label: { type: 'string' },
                  cells: {
                    type: 'array',
                    minItems: 9,
                    maxItems: 9,
                    items: { type: 'string' },
                    description: 'North-up grid: NW, N, NE, W, centre, E, SW, S, SE.',
                  },
                },
              },
            },
          },
        },
        {
          type: 'object',
          required: ['kind', 'title', 'topology', 'stages', 'note'],
          properties: {
            kind: { type: 'string', enum: ['manufacturing-process', 'natural-process'] },
            title: { type: 'string' },
            note: { type: 'string' },
            topology: {
              type: 'string',
              enum: ['linear', 'cycle'],
              description: 'A cycle connects the last stage back to the first.',
            },
            stages: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'string' } },
          },
        },
      ],
    },
  },
};

/** Stateless multiple-choice feedback, deliberately not an essay/band assessment. */
export const WRITING_FEEDBACK_SCHEMA = {
  type: 'object',
  required: [
    'exerciseId',
    'revision',
    'questionId',
    'answer',
    'correct',
    'correctOption',
    'explanation',
    'evidence',
  ],
  properties: {
    exerciseId: { type: 'string' },
    revision: { type: 'string' },
    questionId: { type: 'string' },
    answer: { type: 'string' },
    correct: { type: 'boolean' },
    correctOption: { type: 'string' },
    explanation: { type: 'string' },
    evidence: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string' },
      description: 'RFC 6901 JSON pointers into the public exercise data.',
    },
  },
};
