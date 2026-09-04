import type { FastifyInstance } from 'fastify';
import { API } from '../config.js';
import { LISTENING_BAND_RANGES, LISTENING_QUESTION_COUNT } from '../data/listening.js';
import { READING_QUESTION_COUNT, getReadingBandRanges } from '../data/reading.js';
import { WRITING_CRITERIA, getWritingCriterion } from '../data/writing.js';
import { SPEAKING_CRITERIA, getSpeakingCriterion } from '../data/speaking.js';
import { VOCABULARY, searchVocabulary } from '../data/vocabulary.js';
import { searchMistakes } from '../data/mistakes.js';
import { filterResources } from '../data/resources.js';
import { convertRawToBand, overallBandScore, overallBandDescriptors } from '../services/band.js';
import {
  parseBand,
  parseCorrectCount,
  parseOptionalNonNegativeInteger,
  parseOptionalString,
  parseReadingModule,
} from '../services/validation.js';
import { errorHandler } from './error-handler.js';
import type { ComponentBandScores } from '../types/ielts.js';

type QueryRecord = Record<string, unknown>;

/**
 * Register every route on the supplied Fastify instance.
 *
 * The API is read-only, free, and requires no authentication.
 */
export function registerRoutes(app: FastifyInstance): void {
  app.get('/', async () => ({
    name: API.name,
    version: API.version,
    description: API.description,
    free: true,
    authentication: 'none',
    endpoints: {
      health: '/health',
      bandScores: '/api/band-scores',
      bandScore: '/api/band-scores/:band',
      listeningScore: '/api/score/listening?correct=n',
      readingScore: '/api/score/reading?correct=n&module=academic',
      overallScore: '/api/score/overall (POST)',
      writingCriteria: '/api/writing/criteria',
      speakingCriteria: '/api/speaking/criteria',
      vocabulary: '/api/vocabulary?q=term',
      mistakes: '/api/mistakes?q=term',
      resources: '/api/resources?skill=writing&q=term',
    },
  }));

  app.get('/health', async () => ({
    status: 'ok',
    service: API.name,
    version: API.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/band-scores', async () => ({
    count: overallBandDescriptors().length,
    bands: overallBandDescriptors(),
  }));

  app.get<{ Params: Record<string, string> }>('/api/band-scores/:band', async (request, reply) => {
    const band = parseBand(request.params.band);
    const result = overallBandDescriptors().find((entry) => entry.band === band);
    if (!result) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: `No overall band descriptor for band ${band}.` },
      });
    }
    return {
      band: result.band,
      description: result.description,
    };
  });

  app.get('/api/score/listening', async (request) => {
    const correct = parseCorrectCount(
      (request.query as QueryRecord).correct,
      LISTENING_QUESTION_COUNT,
      'correct',
    );
    return listeningConversion(correct);
  });

  app.get('/api/score/reading', async (request) => {
    const query = request.query as QueryRecord;
    const correct = parseCorrectCount(query.correct, READING_QUESTION_COUNT, 'correct');
    const module = parseReadingModule(query.module);
    return readingConversion(correct, module);
  });

  app.post('/api/score/overall', async (request) => {
    const body = (request.body ?? {}) as Partial<ComponentBandScores>;
    return overallBandScore({
      listening: parseBand(body.listening, 'listening'),
      reading: parseBand(body.reading, 'reading'),
      writing: parseBand(body.writing, 'writing'),
      speaking: parseBand(body.speaking, 'speaking'),
    });
  });

  app.get('/api/writing/criteria', async () => ({
    count: WRITING_CRITERIA.length,
    criteria: WRITING_CRITERIA,
  }));

  app.get<{ Params: Record<string, string> }>(
    '/api/writing/criteria/:id',
    async (request, reply) => {
      const criterion = getWritingCriterion(request.params.id as never);
      if (!criterion) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `Unknown writing criterion "${request.params.id}".`,
          },
        });
      }
      return criterion;
    },
  );

  app.get('/api/speaking/criteria', async () => ({
    count: SPEAKING_CRITERIA.length,
    criteria: SPEAKING_CRITERIA,
  }));

  app.get<{ Params: Record<string, string> }>(
    '/api/speaking/criteria/:id',
    async (request, reply) => {
      const criterion = getSpeakingCriterion(request.params.id as never);
      if (!criterion) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `Unknown speaking criterion "${request.params.id}".`,
          },
        });
      }
      return criterion;
    },
  );

  app.get('/api/vocabulary', async (request) => {
    const q = parseOptionalString((request.query as QueryRecord).q);
    return { count: searchVocabulary(q).length, words: searchVocabulary(q) };
  });

  app.get<{ Params: Record<string, string> }>('/api/vocabulary/:id', async (request, reply) => {
    const id = request.params.id;
    const word = VOCABULARY.find((entry) => entry.id === id);
    if (!word) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: `Unknown vocabulary entry "${id}".` },
      });
    }
    return word;
  });

  app.get('/api/mistakes', async (request) => {
    const q = parseOptionalString((request.query as QueryRecord).q);
    return { count: searchMistakes(q).length, mistakes: searchMistakes(q) };
  });

  app.get('/api/resources', async (request) => {
    const query = request.query as QueryRecord;
    const skill = parseOptionalString(query.skill);
    const q = parseOptionalString(query.q);
    const pages = Math.max(1, parseOptionalNonNegativeInteger(query.page, 1000, 'page') ?? 1);
    const pageSize = Math.max(1, parseOptionalNonNegativeInteger(query.limit, 100, 'limit') ?? 20);
    const all = filterResources(skill === '' ? undefined : skill, q);
    const start = (pages - 1) * pageSize;
    const slice = all.slice(start, start + pageSize);
    return {
      count: all.length,
      page: pages,
      pageSize: slice.length,
      total: all.length,
      resources: slice,
    };
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
    });
  });

  app.setErrorHandler(errorHandler(app));
}

/** Build the listening conversion response. */
function listeningConversion(correct: number): Record<string, unknown> {
  const band = convertRawToBand(correct, LISTENING_BAND_RANGES);
  return {
    section: 'listening',
    correct,
    total: LISTENING_QUESTION_COUNT,
    band,
    nextBand: band === 9 ? null : band + 0.5,
  };
}

/** Build the reading conversion response for the requested module. */
function readingConversion(
  correct: number,
  module: 'academic' | 'general-training',
): Record<string, unknown> {
  const band = convertRawToBand(correct, getReadingBandRanges(module));
  return {
    section: 'reading',
    module,
    correct,
    total: READING_QUESTION_COUNT,
    band,
    nextBand: band === 9 ? null : band + 0.5,
  };
}
