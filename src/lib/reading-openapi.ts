/** OpenAPI 3.1 / JSON Schema contracts for original reading practice. */

import { READING_LEVELS, READING_QUESTION_TYPES, READING_TOPICS } from '../data/reading.js';
import { MAX_READING_ANSWER_LENGTH } from './reading.js';

/** Shared contracts used by documentation and wire-format validation tests. */
export const READING_SCHEMAS = {
  ReadingSummary: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'title', 'level', 'topic', 'suggestedMinutes', 'questionCount'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      level: {
        type: 'string',
        enum: [...READING_LEVELS],
        description: 'Editorial label; not an assessed CEFR level.',
      },
      topic: { type: 'string', enum: [...READING_TOPICS] },
      suggestedMinutes: { type: 'integer', minimum: 1 },
      questionCount: { type: 'integer', minimum: 1 },
    },
  },
  ReadingQuestion: {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'prompt', 'options'],
        properties: {
          id: { type: 'string' },
          type: { const: 'single-choice' },
          prompt: { type: 'string' },
          options: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'text'],
              properties: { id: { type: 'string' }, text: { type: 'string' } },
            },
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'prompt'],
        properties: {
          id: { type: 'string' },
          type: { const: 'true-false-not-given' },
          prompt: { type: 'string' },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'prompt', 'maxWords'],
        properties: {
          id: { type: 'string' },
          type: { const: 'short-answer' },
          prompt: { type: 'string' },
          maxWords: { type: 'integer', minimum: 1 },
        },
      },
    ],
  },
  ReadingExercise: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'title', 'level', 'topic', 'suggestedMinutes', 'paragraphs', 'questions'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      level: { type: 'string', enum: [...READING_LEVELS] },
      topic: { type: 'string', enum: [...READING_TOPICS] },
      suggestedMinutes: { type: 'integer', minimum: 1 },
      paragraphs: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
      questions: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ReadingQuestion' } },
    },
  },
  ReadingStats: {
    type: 'object',
    additionalProperties: false,
    required: ['exercises', 'questions', 'byLevel', 'byQuestionType'],
    properties: {
      exercises: { type: 'integer', minimum: 1 },
      questions: { type: 'integer', minimum: 1 },
      byLevel: {
        type: 'object',
        required: [...READING_LEVELS],
        additionalProperties: { type: 'integer', minimum: 0 },
      },
      byQuestionType: {
        type: 'object',
        required: [...READING_QUESTION_TYPES],
        additionalProperties: { type: 'integer', minimum: 0 },
      },
    },
  },
  ReadingSubmission: {
    type: 'object',
    additionalProperties: false,
    required: ['answers'],
    description:
      'Omit unanswered questions. Duplicate or unknown question IDs are rejected. Do not send personal information. Maximum body size: 16384 UTF-8 bytes.',
    properties: {
      answers: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['questionId', 'answer'],
          properties: {
            questionId: { type: 'string' },
            answer: {
              type: 'string',
              maxLength: MAX_READING_ANSWER_LENGTH,
              description: 'At most 256 Unicode code points.',
            },
          },
        },
      },
    },
  },
  ReadingGrade: {
    type: 'object',
    additionalProperties: false,
    required: ['exerciseId', 'correct', 'incorrect', 'unanswered', 'total', 'percentage', 'feedback'],
    properties: {
      exerciseId: { type: 'string' },
      correct: { type: 'integer', minimum: 0 },
      incorrect: { type: 'integer', minimum: 0 },
      unanswered: { type: 'integer', minimum: 0 },
      total: { type: 'integer', minimum: 1 },
      percentage: { type: 'number', minimum: 0, maximum: 100 },
      feedback: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['questionId', 'outcome', 'acceptedAnswers', 'explanation', 'evidenceParagraphs'],
          properties: {
            questionId: { type: 'string' },
            outcome: { type: 'string', enum: ['correct', 'incorrect', 'unanswered', 'word-limit-exceeded'] },
            acceptedAnswers: { type: 'array', minItems: 1, items: { type: 'string' } },
            explanation: { type: 'string' },
            evidenceParagraphs: { type: 'array', minItems: 1, items: { type: 'integer', minimum: 1 } },
          },
        },
      },
    },
  },
};
