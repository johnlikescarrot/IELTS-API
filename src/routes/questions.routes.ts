/**
 * Question bank routes.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { cacheLong } from '../lib/etag.js';
import { paginate } from '../lib/pagination.js';
import { idParamSchema, paginationSchema, parseInput, seedSchema } from '../lib/validation.js';
import * as questions from '../services/questions.service.js';

const listQuerySchema = z.object({
  skill: z.enum(['speaking', 'writing']).optional(),
  part: z.coerce.number().int().min(1).max(3).optional(),
  topic: z.string().trim().min(1).max(60).optional()
});

const listWithPagingSchema = listQuerySchema.extend(paginationSchema.shape);

const randomQuerySchema = listQuerySchema.extend({ seed: seedSchema });

export async function questionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/questions/random', async (request, reply) => {
    const query = parseInput(randomQuerySchema, request.query, 'query parameters');
    const question = questions.randomQuestion(
      { skill: query.skill, part: query.part, topic: query.topic },
      query.seed
    );
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: question };
  });

  app.get('/v1/questions', async (request, _reply) => {
    const query = parseInput(listWithPagingSchema, request.query, 'query parameters');
    const filtered = questions.listQuestions({
      skill: query.skill,
      part: query.part,
      topic: query.topic
    });
    const page = paginate(filtered, query.page, query.limit);
    return { data: page.items, meta: page.meta };
  });

  app.get('/v1/questions/:id', async (request, reply) => {
    cacheLong(reply);
    const { id } = parseInput(idParamSchema, request.params, 'id parameter');
    return { data: questions.getQuestion(id) };
  });
}
