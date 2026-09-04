import {
  MODULES,
  SKILLS,
  marksToTarget,
  overallBand,
  rawToBand,
  roundToBand,
  type Skill,
} from './core/bands.ts';
import { CEFR_TABLE, bandToCefr, cefrToBand } from './core/cefr.ts';
import { notFound } from './core/errors.ts';
import { Router, type ApiResponse } from './core/router.ts';
import { analyzeText } from './core/text.ts';
import { requireEnum, requireNumber, requireObject, requireString } from './core/validate.ts';
import { estimateWriting } from './core/writing.ts';
import { openApiDocument } from './openapi.ts';
import { READING_PASSAGES, SPEAKING_PROMPTS, WRITING_PROMPTS } from './data/prompts.ts';
import { CONTENT_POLICY, REFERENCE_SOURCES } from './data/sources.ts';
import { COHESIVE_DEVICES, VOCABULARY } from './data/vocabulary.ts';

/** Semantic version of the API surface. */
export const API_VERSION = '1.0.0';

const ok = (body: unknown): ApiResponse => ({ status: 200, body });

const paginate = <T>(
  items: readonly T[],
  query: URLSearchParams,
): { items: T[]; total: number; limit: number; offset: number } => {
  const limit = query.has('limit') ? requireNumber(query.get('limit'), 'limit', 1, 100) : 20;
  const offset = query.has('offset') ? requireNumber(query.get('offset'), 'offset', 0, 100000) : 0;
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
};

/**
 * Build the fully wired API router.
 *
 * Every endpoint is public: there is no API key, no quota, and no
 * authentication middleware anywhere in the stack.
 */
export function createApp(): Router {
  const router = new Router();

  router.get('/', () =>
    ok({
      name: 'IELTS API',
      version: API_VERSION,
      description:
        'A free, open, no-authentication IELTS API: band conversion, CEFR mapping, writing analytics and open practice content.',
      authentication: 'none',
      documentation: '/openapi.json',
      endpoints: [
        'GET /health',
        'GET /v1/meta',
        'GET /v1/sources',
        'GET /openapi.json',
        'POST /v1/band/overall',
        'GET /v1/band/convert',
        'GET /v1/band/target',
        'GET /v1/band/round',
        'GET /v1/cefr',
        'GET /v1/cefr/band/:band',
        'GET /v1/cefr/level/:level',
        'GET /v1/vocabulary',
        'GET /v1/vocabulary/:headword',
        'GET /v1/cohesive-devices',
        'GET /v1/prompts/writing',
        'GET /v1/prompts/writing/:id',
        'GET /v1/prompts/speaking',
        'GET /v1/prompts/speaking/:id',
        'GET /v1/reading/passages',
        'GET /v1/reading/passages/:id',
        'POST /v1/reading/passages/:id/check',
        'POST /v1/writing/analyze',
        'POST /v1/text/metrics',
      ],
    }),
  );

  router.get('/health', () => ok({ status: 'ok', version: API_VERSION }));

  router.get('/openapi.json', () => ok(openApiDocument()));

  router.get('/v1/meta', () =>
    ok({
      version: API_VERSION,
      skills: SKILLS,
      modules: MODULES,
      cefrLevels: CEFR_TABLE.map((row) => row.level),
      counts: {
        writingPrompts: WRITING_PROMPTS.length,
        speakingPrompts: SPEAKING_PROMPTS.length,
        readingPassages: READING_PASSAGES.length,
        vocabulary: VOCABULARY.length,
        cohesiveDevices: COHESIVE_DEVICES.length,
        referenceSources: REFERENCE_SOURCES.length,
      },
      contentPolicy: CONTENT_POLICY,
      license: 'MIT',
      authentication: 'none',
    }),
  );

  router.get('/v1/sources', () =>
    ok({
      revision: CONTENT_POLICY.upstreamReviewDate,
      sources: REFERENCE_SOURCES,
      contentPolicy: CONTENT_POLICY,
    }),
  );

  router.post('/v1/band/overall', (request) => {
    const body = requireObject(request.body, 'body');
    const scores = {} as Record<Skill, number>;
    for (const skill of SKILLS) {
      scores[skill] = requireNumber(body[skill], skill, 0, 9);
    }
    const result = overallBand(scores);
    return ok({ ...result, cefr: bandToCefr(result.overall) });
  });

  router.get('/v1/band/convert', (request) => {
    const skill = requireEnum(request.query.get('skill'), 'skill', [
      'listening',
      'reading',
    ] as const);
    const rawScore = requireNumber(request.query.get('rawScore'), 'rawScore', 0, 40);
    const module = requireEnum(request.query.get('module') ?? 'academic', 'module', MODULES);
    const result = rawToBand(rawScore, skill, module);
    return ok({ ...result, cefr: bandToCefr(result.band) });
  });

  router.get('/v1/band/target', (request) => {
    const skill = requireEnum(request.query.get('skill'), 'skill', [
      'listening',
      'reading',
    ] as const);
    const rawScore = requireNumber(request.query.get('rawScore'), 'rawScore', 0, 40);
    const targetBand = requireNumber(request.query.get('targetBand'), 'targetBand', 0, 9);
    const module = requireEnum(request.query.get('module') ?? 'academic', 'module', MODULES);
    const additionalMarks = marksToTarget(rawScore, targetBand, skill, module);
    return ok({
      skill,
      module,
      rawScore: Math.floor(rawScore),
      currentBand: rawToBand(rawScore, skill, module).band,
      targetBand,
      additionalMarks,
      achievable: additionalMarks !== null,
    });
  });

  router.get('/v1/band/round', (request) => {
    const value = requireNumber(request.query.get('value'), 'value', 0, 9);
    return ok({ value, band: roundToBand(value) });
  });

  router.get('/v1/cefr', () => ok({ items: CEFR_TABLE, total: CEFR_TABLE.length }));

  router.get('/v1/cefr/band/:band', (request) => {
    const band = requireNumber(request.params.band, 'band', 0, 9);
    return ok({ band, ...bandToCefr(band) });
  });

  router.get('/v1/cefr/level/:level', (request) => {
    const row = cefrToBand(request.params.level as string);
    if (!row) {
      throw notFound(`Unknown CEFR level '${request.params.level}'`, {
        level: request.params.level,
      });
    }
    return ok(row);
  });

  router.get('/v1/vocabulary', (request) => {
    let items = [...VOCABULARY];
    const sublist = request.query.get('sublist');
    if (sublist !== null) {
      const value = requireNumber(sublist, 'sublist', 1, 10);
      items = items.filter((entry) => entry.sublist === value);
    }
    const cefr = request.query.get('cefr');
    if (cefr !== null) {
      const value = requireEnum(cefr.toUpperCase(), 'cefr', ['B1', 'B2', 'C1', 'C2'] as const);
      items = items.filter((entry) => entry.cefr === value);
    }
    const search = request.query.get('q');
    if (search !== null) {
      const needle = requireString(search, 'q', 100).toLowerCase();
      items = items.filter(
        (entry) =>
          entry.headword.includes(needle) || entry.definition.toLowerCase().includes(needle),
      );
    }
    return ok(paginate(items, request.query));
  });

  router.get('/v1/vocabulary/:headword', (request) => {
    const headword = (request.params.headword as string).toLowerCase();
    const entry = VOCABULARY.find((item) => item.headword === headword);
    if (!entry) throw notFound(`Unknown headword '${headword}'`, { headword });
    return ok(entry);
  });

  router.get('/v1/cohesive-devices', () =>
    ok({ items: COHESIVE_DEVICES, total: COHESIVE_DEVICES.length }),
  );

  router.get('/v1/prompts/writing', (request) => {
    let items = [...WRITING_PROMPTS];
    const module = request.query.get('module');
    if (module !== null) {
      const value = requireEnum(module, 'module', MODULES);
      items = items.filter((item) => item.module === value);
    }
    const task = request.query.get('task');
    if (task !== null) {
      const value = requireEnum(task, 'task', ['1', '2'] as const);
      items = items.filter((item) => String(item.task) === value);
    }
    return ok(paginate(items, request.query));
  });

  router.get('/v1/prompts/writing/:id', (request) => {
    const item = WRITING_PROMPTS.find((prompt) => prompt.id === request.params.id);
    if (!item) throw notFound(`Unknown writing prompt '${request.params.id}'`);
    return ok(item);
  });

  router.get('/v1/prompts/speaking', (request) => {
    let items = [...SPEAKING_PROMPTS];
    const part = request.query.get('part');
    if (part !== null) {
      const value = requireEnum(part, 'part', ['1', '2', '3'] as const);
      items = items.filter((item) => String(item.part) === value);
    }
    return ok(paginate(items, request.query));
  });

  router.get('/v1/prompts/speaking/:id', (request) => {
    const item = SPEAKING_PROMPTS.find((prompt) => prompt.id === request.params.id);
    if (!item) throw notFound(`Unknown speaking prompt '${request.params.id}'`);
    return ok(item);
  });

  router.get('/v1/reading/passages', (request) => {
    let items = READING_PASSAGES.map((passage) => ({
      id: passage.id,
      title: passage.title,
      module: passage.module,
      wordCount: passage.wordCount,
      questionCount: passage.questions.length,
    }));
    const module = request.query.get('module');
    if (module !== null) {
      const value = requireEnum(module, 'module', MODULES);
      items = items.filter((item) => item.module === value);
    }
    return ok(paginate(items, request.query));
  });

  router.get('/v1/reading/passages/:id', (request) => {
    const passage = READING_PASSAGES.find((item) => item.id === request.params.id);
    if (!passage) throw notFound(`Unknown passage '${request.params.id}'`);
    const withAnswers = request.query.get('includeAnswers') === 'true';
    return ok({
      ...passage,
      questions: passage.questions.map((question) =>
        withAnswers ? question : { ...question, answer: undefined },
      ),
    });
  });

  router.post('/v1/reading/passages/:id/check', (request) => {
    const passage = READING_PASSAGES.find((item) => item.id === request.params.id);
    if (!passage) throw notFound(`Unknown passage '${request.params.id}'`);
    const body = requireObject(request.body, 'body');
    const answers = requireObject(body.answers, 'answers');
    const results = passage.questions.map((question) => {
      const given = answers[question.id];
      const normalized = typeof given === 'string' ? given.trim().toLowerCase() : null;
      const correct = normalized === question.answer.toLowerCase();
      return {
        id: question.id,
        given: normalized,
        expected: question.answer,
        correct,
      };
    });
    const score = results.filter((result) => result.correct).length;
    return ok({
      passageId: passage.id,
      score,
      total: results.length,
      percentage: Number(((score / results.length) * 100).toFixed(1)),
      results,
    });
  });

  router.post('/v1/writing/analyze', (request) => {
    const body = requireObject(request.body, 'body');
    const text = requireString(body.text, 'text');
    const task = body.task === undefined ? 2 : requireNumber(body.task, 'task', 1, 2);
    return ok(estimateWriting(text, task === 1 ? 1 : 2));
  });

  router.post('/v1/text/metrics', (request) => {
    const body = requireObject(request.body, 'body');
    const text = requireString(body.text, 'text');
    return ok(analyzeText(text));
  });

  return router;
}
