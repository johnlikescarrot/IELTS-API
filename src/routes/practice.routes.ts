/**
 * Practice routes: mock tests, vocabulary quizzes and study plans.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { parseInput, seedSchema } from '../lib/validation.js';
import * as practice from '../services/practice.service.js';

const mockTestQuerySchema = z.object({ seed: seedSchema });

const vocabQuizQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).default(5),
  topicId: z.string().trim().min(1).max(60).optional(),
  seed: seedSchema
});

const halfBand = z.coerce.number().min(1).max(9);

const studyPlanQuerySchema = z.object({
  currentBand: halfBand,
  targetBand: halfBand,
  weeks: z.coerce.number().int().min(1).max(52).default(8),
  seed: seedSchema
});

export async function practiceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/practice/mock-test', async (request, reply) => {
    const query = parseInput(mockTestQuerySchema, request.query, 'query parameters');
    const mockTest = practice.buildMockTest(query.seed);
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: mockTest };
  });

  app.get('/v1/practice/vocab-quiz', async (request, reply) => {
    const query = parseInput(vocabQuizQuerySchema, request.query, 'query parameters');
    const quiz = practice.buildVocabQuiz({
      count: query.count,
      topicId: query.topicId,
      seed: query.seed
    });
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: { seed: query.seed ?? null, quiz } };
  });

  app.get('/v1/practice/study-plan', async (request, reply) => {
    const query = parseInput(studyPlanQuerySchema, request.query, 'query parameters');
    const plan = practice.buildStudyPlan({
      currentBand: query.currentBand,
      targetBand: query.targetBand,
      weeks: query.weeks,
      seed: query.seed
    });
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: plan };
  });
}
