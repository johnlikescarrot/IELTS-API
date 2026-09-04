/**
 * Common-mistakes routes.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { cacheLong } from '../lib/etag.js';
import { paginate } from '../lib/pagination.js';
import { idParamSchema, paginationSchema, parseInput, seedSchema } from '../lib/validation.js';
import * as mistakes from '../services/mistakes.service.js';

const listQuerySchema = z.object({
  category: z
    .enum([
      'articles',
      'prepositions',
      'subject-verb-agreement',
      'word-choice',
      'countable-uncountable',
      'punctuation',
      'register',
      'cohesion'
    ])
    .optional()
});

const listWithPagingSchema = listQuerySchema.extend(paginationSchema.shape);

const randomQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).default(5),
  seed: seedSchema
});

export async function mistakeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/mistakes/random', async (request, reply) => {
    const query = parseInput(randomQuerySchema, request.query, 'query parameters');
    const quiz = mistakes.buildQuiz({ count: query.count, seed: query.seed });
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: { seed: query.seed ?? null, quiz } };
  });

  app.get('/v1/mistakes', async (request, reply) => {
    cacheLong(reply);
    const query = parseInput(listWithPagingSchema, request.query, 'query parameters');
    const filtered = mistakes.listMistakes(query.category);
    const page = paginate(filtered, query.page, query.limit);
    return {
      data: { mistakes: page.items },
      meta: { ...page.meta, categories: mistakes.MISTAKE_CATEGORIES }
    };
  });

  app.get('/v1/mistakes/:id', async (request, reply) => {
    cacheLong(reply);
    const { id } = parseInput(idParamSchema, request.params, 'id parameter');
    return { data: mistakes.getMistake(id) };
  });
}
