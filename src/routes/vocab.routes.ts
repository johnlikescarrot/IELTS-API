/**
 * Vocabulary routes: Academic Word List + topic vocabulary + unified search.
 */

import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { cacheLong } from '../lib/etag.js';
import { NotFoundError } from '../lib/errors.js';
import { paginate } from '../lib/pagination.js';
import { paginationSchema, parseInput, seedSchema } from '../lib/validation.js';
import { AWL_SOURCE } from '../data/academic-word-list.js';
import * as awl from '../services/awl.service.js';
import * as vocab from '../services/vocab.service.js';

const sublistParamSchema = z.object({
  sublist: z.coerce.number().int().min(1).max(10)
});

const wordParamSchema = z.object({
  word: z.string().trim().min(1).max(60)
});

const topicParamSchema = z.object({
  topicId: z.string().trim().min(1).max(60)
});

const randomWordsQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(10),
  sublist: z.coerce.number().int().min(1).max(10).optional(),
  seed: seedSchema
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
  scope: z.enum(['awl', 'topics', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const randomVocabQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(10),
  topicId: z.string().trim().min(1).max(60).optional(),
  seed: seedSchema
});

export async function vocabRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/vocab/awl', async (_request, reply) => {
    cacheLong(reply);
    const sublists = awl.listSublists();
    const wordCount = sublists.reduce((sum, summary) => sum + summary.wordCount, 0);
    return {
      data: {
        name: 'Academic Word List',
        citation: AWL_SOURCE.citation,
        sourceUrl: AWL_SOURCE.url,
        wordCount,
        sublistCount: sublists.length,
        sublists
      }
    };
  });

  app.get('/v1/vocab/awl/sublists/:sublist', async (request, reply) => {
    cacheLong(reply);
    const { sublist } = parseInput(sublistParamSchema, request.params, 'sublist parameter');
    const { page, limit } = parseInput(paginationSchema, request.query, 'query parameters');
    const words = awl.getSublist(sublist);
    const paginated = paginate(words, page, limit);
    return { data: { sublist, words: paginated.items }, meta: paginated.meta };
  });

  app.get('/v1/vocab/awl/words/:word', async (request, reply) => {
    cacheLong(reply);
    const { word } = parseInput(wordParamSchema, request.params, 'word parameter');
    const detail = awl.getWord(word);
    if (detail === null) {
      throw new NotFoundError('AWL word', word);
    }
    return { data: detail };
  });

  app.get('/v1/vocab/awl/random', async (request, reply) => {
    const query = parseInput(randomWordsQuerySchema, request.query, 'query parameters');
    const words = awl.randomWords({
      count: query.count,
      sublist: query.sublist,
      seed: query.seed
    });
    if (query.seed === undefined) {
      reply.header('cache-control', 'no-store');
    } else {
      cacheLong(reply);
    }
    return { data: { seed: query.seed ?? null, words } };
  });

  app.get('/v1/vocab/topics', async (_request, reply) => {
    cacheLong(reply);
    return { data: { topics: vocab.listTopics() } };
  });

  app.get('/v1/vocab/topics/random', async (request, reply) => {
    const query = parseInput(randomVocabQuerySchema, request.query, 'query parameters');
    const entries = vocab.randomVocab({
      count: query.count,
      topicId: query.topicId,
      seed: query.seed
    });
    reply.header('cache-control', query.seed === undefined ? 'no-store' : 'public, max-age=86400');
    return { data: { seed: query.seed ?? null, entries } };
  });

  app.get('/v1/vocab/topics/:topicId', async (request, reply) => {
    cacheLong(reply);
    const { topicId } = parseInput(topicParamSchema, request.params, 'topic parameter');
    const pack = vocab.getTopic(topicId);
    return { data: pack };
  });

  app.get('/v1/vocab/search', async (request, reply) => {
    const query = parseInput(searchQuerySchema, request.query, 'query parameters');
    const results: { awl: readonly awl.AwlWord[]; topics: readonly vocab.VocabSearchHit[] } = {
      awl: [],
      topics: []
    };
    if (query.scope === 'awl' || query.scope === 'all') {
      results.awl = awl.searchWords(query.q, query.limit);
    }
    if (query.scope === 'topics' || query.scope === 'all') {
      results.topics = vocab.searchVocab(query.q, query.limit);
    }
    reply.header('cache-control', 'public, max-age=3600');
    return {
      data: results,
      meta: {
        query: query.q,
        scope: query.scope,
        awlMatches: results.awl.length,
        topicMatches: results.topics.length
      }
    };
  });
}
