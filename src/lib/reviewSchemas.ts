/** OpenAPI 3.1 schemas for the explicitly versioned review-state contract. */
import { PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { REVIEW_POLICY } from './review.js';
import type { JsonValue } from '../types.js';

/** The exact date syntax accepted by review computations and vocabulary decks. */
export const REVIEW_DATE_SCHEMA = {
  type: 'string',
  format: 'date',
  pattern: '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$',
  description: 'Valid Gregorian date in years 0001..9999, evaluated in UTC. No implicit current date.',
};
const CARD_REF = { $ref: '#/components/schemas/ReviewCard' };
const COUNTER = { type: 'integer', minimum: 0, maximum: REVIEW_POLICY.maximumCounter };
const COUNT = { type: 'integer', minimum: 0 };
const TEXT = { type: 'string' };
const NULLABLE_TEXT = { type: ['string', 'null'] };
const GRADE = { type: 'integer', minimum: 0, maximum: 5 };
const QUEUE_LIMIT = { type: 'integer', minimum: 1, maximum: 100, default: 20 };
const NEW_LIMIT = { type: 'integer', minimum: 0, maximum: 50, default: 10 };
const CARDS = { type: 'array', maxItems: REVIEW_POLICY.maximumQueueCards, items: CARD_REF };

/** Components used by both request and successful response schemas. */
export const REVIEW_SCHEMAS: Record<string, JsonValue> = {
  ReviewCard: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'algorithm',
      'repetitions',
      'lapses',
      'intervalDays',
      'easeFactor',
      'lastReviewedOn',
      'dueOn',
    ],
    description:
      'Client-owned state, not proof of progress. New cards have zero counters/interval and ease 2.5. Reviewed cards require a positive interval and dueOn = lastReviewedOn + intervalDays.',
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$' },
      algorithm: { type: 'string', const: REVIEW_POLICY.algorithm },
      repetitions: COUNTER,
      lapses: COUNTER,
      intervalDays: { type: 'integer', minimum: 0, maximum: REVIEW_POLICY.maximumIntervalDays },
      easeFactor: {
        type: 'number',
        minimum: REVIEW_POLICY.minimumEaseFactor,
        maximum: REVIEW_POLICY.maximumEaseFactor,
        multipleOf: 0.01,
      },
      lastReviewedOn: { anyOf: [REVIEW_DATE_SCHEMA, { type: 'null' }] },
      dueOn: REVIEW_DATE_SCHEMA,
    },
  },
  ReviewInput: {
    type: 'object',
    additionalProperties: false,
    required: ['card', 'grade', 'on'],
    properties: { card: CARD_REF, grade: GRADE, on: REVIEW_DATE_SCHEMA },
  },
  ReviewQueueInput: {
    type: 'object',
    additionalProperties: false,
    required: ['cards', 'on'],
    properties: {
      cards: { ...CARDS, description: 'Unique card IDs required, including cards that are not due yet.' },
      on: REVIEW_DATE_SCHEMA,
      limit: QUEUE_LIMIT,
      newLimit: NEW_LIMIT,
    },
  },
  ReviewResult: {
    type: 'object',
    additionalProperties: false,
    required: ['card', 'grade', 'on', 'reason', 'repeatToday', 'intervalCapped', 'easeClamped'],
    properties: {
      card: CARD_REF,
      grade: GRADE,
      on: REVIEW_DATE_SCHEMA,
      reason: { type: 'string', enum: ['lapse', 'first-success', 'second-success', 'expanded'] },
      repeatToday: {
        type: 'boolean',
        description: 'Practise locally today; do not submit these drills as scheduled reviews.',
      },
      intervalCapped: { type: 'boolean' },
      easeClamped: { type: 'boolean' },
    },
  },
  ReviewQueue: {
    type: 'object',
    additionalProperties: false,
    required: ['on', 'limit', 'newLimit', 'counts', 'items', 'remaining'],
    properties: {
      on: REVIEW_DATE_SCHEMA,
      limit: QUEUE_LIMIT,
      newLimit: NEW_LIMIT,
      counts: {
        type: 'object',
        additionalProperties: false,
        required: ['total', 'overdue', 'due', 'new', 'scheduled'],
        description:
          'Before budgets: total = overdue + due + new + scheduled. Due means previously reviewed and due exactly on this date.',
        properties: { total: COUNT, overdue: COUNT, due: COUNT, new: COUNT, scheduled: COUNT },
      },
      items: {
        type: 'array',
        maxItems: 100,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card', 'status', 'overdueDays'],
          properties: {
            card: CARD_REF,
            status: { type: 'string', enum: ['new', 'due', 'overdue'] },
            overdueDays: COUNT,
          },
        },
      },
      remaining: { ...COUNT, description: 'Eligible cards not selected because of either budget.' },
    },
  },
  ReviewPolicy: {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(REVIEW_POLICY),
    properties: {
      algorithm: { type: 'string', const: REVIEW_POLICY.algorithm },
      name: TEXT,
      sourceUrl: { type: 'string', format: 'uri' },
      initialEaseFactor: { type: 'number' },
      minimumEaseFactor: { type: 'number' },
      maximumEaseFactor: { type: 'number' },
      maximumIntervalDays: COUNT,
      maximumCounter: COUNT,
      maximumQueueCards: COUNT,
      grades: {
        type: 'array',
        minItems: 6,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['grade', 'recall'],
          properties: { grade: GRADE, recall: TEXT },
        },
      },
      intervals: TEXT,
      easeUpdate: TEXT,
      lapse: TEXT,
      sameDay: TEXT,
      calendar: TEXT,
      queueOrder: TEXT,
      storage: { type: 'string', const: 'client-owned' },
      note: TEXT,
    },
  },
  VocabularyDeck: {
    type: 'object',
    additionalProperties: false,
    required: ['seed', 'on', 'total', 'limit', 'offset', 'hasMore', 'cards'],
    properties: {
      seed: { type: 'string', minLength: 1, maxLength: 128 },
      on: REVIEW_DATE_SCHEMA,
      total: COUNT,
      limit: { type: 'integer', minimum: 1, maximum: 50 },
      offset: COUNT,
      hasMore: { type: 'boolean' },
      cards: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['prompt', 'answer', 'state'],
          properties: {
            prompt: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'word', 'phonetic', 'partOfSpeech'],
              properties: {
                id: TEXT,
                word: TEXT,
                phonetic: NULLABLE_TEXT,
                partOfSpeech: { type: 'string', enum: [...PARTS_OF_SPEECH] },
              },
            },
            answer: {
              type: 'object',
              additionalProperties: false,
              required: ['definition', 'senses', 'morphemes', 'volumes'],
              properties: {
                definition: NULLABLE_TEXT,
                morphemes: NULLABLE_TEXT,
                volumes: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 22 } },
                senses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['pos', 'text'],
                    properties: { pos: { type: 'string', enum: [...PARTS_OF_SPEECH] }, text: TEXT },
                  },
                },
              },
            },
            state: CARD_REF,
          },
        },
      },
    },
  },
};

/** JSON request components for the two POST computation endpoints. */
export const REVIEW_REQUEST_SCHEMAS: Record<string, string> = {
  '/v1/study/review': 'ReviewInput',
  '/v1/study/review/queue': 'ReviewQueueInput',
};

/** Specialised data components inside the standard JSON response envelope. */
export const REVIEW_RESPONSE_SCHEMAS: Record<string, string> = {
  '/v1/study/review': 'ReviewResult',
  '/v1/study/review/queue': 'ReviewQueue',
  '/v1/study/review/policy': 'ReviewPolicy',
  '/v1/vocabulary/deck': 'VocabularyDeck',
};
