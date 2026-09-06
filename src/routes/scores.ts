/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { RAW_SCORE_TABLES, RAW_SCORE_TESTS, convertRawScore, rawScoreTable } from '../data/rawScores.js';
import { cefrForBand } from '../data/bands.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, getString, requireString, toParams } from '../lib/query.js';
import { TASK_MODULES } from '../data/tasks.js';
import { buildMockReport } from '../lib/mock.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, IeltsModule, Skill } from '../types.js';

/** Read and validate one component of the test report. */
function component(params: Record<string, string | string[] | undefined>, skill: Skill): number {
  const raw = requireString(params, skill);
  return assertBand(Number.parseFloat(raw), skill);
}

/** Compute an overall band score from the four components. */
function overall(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const scores: Record<Skill, number> = {
    listening: component(params, 'listening'),
    reading: component(params, 'reading'),
    writing: component(params, 'writing'),
    speaking: component(params, 'speaking'),
  };
  const result = calculateOverall(scores, cefrForBand);
  return {
    data: result,
    meta: {
      rule: 'Overall = mean of the four components rounded to the nearest half band; means ending in .25 or .75 round up.',
      components:
        'listening, reading, writing, speaking are required and must be bands between 0 and 9 in 0.5 steps.',
    },
  };
}

/** Convert a band score to another scale. */
function convert(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const raw = requireString(params, 'band');
  const band = assertBand(Number.parseFloat(raw), 'band');
  const target = getEnum(params, 'to', CONVERSION_TARGETS);
  if (target === undefined) {
    throw badRequest('Parameter "to" is required.', {
      parameter: 'to',
      allowed: CONVERSION_TARGETS.join(','),
    });
  }
  const table = CONVERSION_TABLES[target];
  const entry = convertBand(target, band);
  return {
    data: {
      from: { scale: 'ielts', band },
      to: {
        scale: target,
        name: table.name,
        unit: table.unit,
        provider: table.provider,
        sourceUrl: table.sourceUrl,
        provenance: table.provenance,
        value: entry?.value ?? null,
        display: entry?.display ?? null,
      },
      matched: entry !== undefined,
    },
    meta: {
      note: entry === undefined ? `No published concordance for band ${band} on ${table.name}.` : table.note,
    },
  };
}

/** Convert an arbitrary numeric score on a target scale back to an IELTS band. */
function interpret(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const target = getEnum(params, 'scale', CONVERSION_TARGETS);
  if (target === undefined) {
    throw badRequest('Parameter "scale" is required.', {
      parameter: 'scale',
      allowed: CONVERSION_TARGETS.join(','),
    });
  }
  const score = getNumber(params, 'score', 0, 1000);
  if (score === undefined) {
    throw badRequest('Parameter "score" is required.', { parameter: 'score' });
  }
  const table = CONVERSION_TABLES[target];
  const rows = table.entries.filter((entry): entry is ConversionEntry & { value: [number, number] } =>
    Array.isArray(entry.value),
  );
  const hit = rows.find((entry) => score >= entry.value[0] && score <= entry.value[1]);
  return {
    data: {
      from: { scale: target, score },
      to: { scale: 'ielts', band: hit?.band ?? null },
      matched: hit !== undefined,
    },
    meta: {
      note:
        hit === undefined
          ? `Score ${score} falls outside the published ${table.name} concordance ranges.`
          : table.note,
    },
  };
}

/** The published raw-score to band conversion tables for the objective papers. */
function rawTables(): HandlerResult {
  return {
    data: { tables: RAW_SCORE_TABLES },
    meta: {
      note:
        'One mark per correct answer, forty questions per paper. Conversion is deterministic for a published ' +
        'table; individual test forms may shift a threshold by a mark or two.',
      floors:
        'Bands below 2.5 are not published for the objective papers; scores under a floor report band null.',
    },
  };
}

/** Convert a raw correct-answers count to a band via the published table. */
function rawConvert(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const test = getEnum(params, 'test', RAW_SCORE_TESTS);
  if (test === undefined) {
    throw badRequest('Parameter "test" is required.', {
      parameter: 'test',
      allowed: RAW_SCORE_TESTS.join(','),
    });
  }
  const correctRaw = requireString(params, 'correct');
  if (!/^[+-]?\d+$/.test(correctRaw)) {
    throw badRequest('Parameter "correct" must be an integer.', {
      parameter: 'correct',
      received: correctRaw,
    });
  }
  const correct = Number.parseInt(correctRaw, 10);
  if (correct < 0 || correct > 40) {
    throw badRequest(`Parameter "correct" must be between 0 and 40.`, {
      parameter: 'correct',
      received: correctRaw,
      min: '0',
      max: '40',
    });
  }
  const table = rawScoreTable(test);
  const conversion = convertRawScore(test, correct);
  return {
    data: {
      test,
      name: table.name,
      correct,
      outOf: table.questions,
      band: conversion.band,
      range: conversion.range,
      belowFloor: conversion.belowFloor,
      cefr: conversion.band === null ? null : cefrForBand(conversion.band),
    },
    meta: {
      note: conversion.belowFloor
        ? `A score of ${correct} is below the published floor of the ${table.name} table (lowest published ` +
          `row starts at ${table.rows[table.rows.length - 1]?.correct[0]} correct answers).`
        : table.note,
      provider: table.provider,
      sourceUrl: table.sourceUrl,
    },
  };
}

/** Report the four skills of a completed mock exam as bands and an overall. */
function mockReport(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = (getEnum(params, 'module', TASK_MODULES) ?? 'academic') as IeltsModule;
  const listeningCorrect = getInt(params, 'listeningCorrect', 0, 40, -1);
  const readingCorrect = getInt(params, 'readingCorrect', 0, 40, -1);
  if (listeningCorrect < 0) {
    throw badRequest('Parameter "listeningCorrect" is required (correct answers out of 40).', {
      parameter: 'listeningCorrect',
    });
  }
  if (readingCorrect < 0) {
    throw badRequest('Parameter "readingCorrect" is required (correct answers out of 40).', {
      parameter: 'readingCorrect',
    });
  }
  const writingRaw = getString(params, 'writing');
  const speakingRaw = getString(params, 'speaking');
  const report = buildMockReport({
    module,
    listeningCorrect,
    readingCorrect,
    writing: writingRaw === undefined ? undefined : assertBand(Number.parseFloat(writingRaw), 'writing'),
    speaking: speakingRaw === undefined ? undefined : assertBand(Number.parseFloat(speakingRaw), 'speaking'),
  });
  return {
    data: report,
    meta: {
      method:
        'Listening and Reading bands come from the published raw-score tables of /v1/scores/raw; the ' +
        'overall is the mean of the four component bands rounded to the nearest half band, .25/.75 up.',
      objectivePapers:
        'Raw scores below a table floor stay null; the overall is withheld until every component has a band.',
    },
  };
}

/** Scoring routes. */
export const scoreRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/scores/overall',
    versioned: true,
    summary: 'Calculate an overall band score from the four component scores.',
    handler: overall,
  },
  {
    method: 'GET',
    path: '/v1/scores/convert',
    versioned: true,
    summary: 'Convert an IELTS band to another scale (CEFR, TOEFL iBT, Cambridge, PTE, DET).',
    handler: convert,
  },
  {
    method: 'GET',
    path: '/v1/scores/interpret',
    versioned: true,
    summary: 'Map a score on another scale back to an indicative IELTS band.',
    handler: interpret,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw',
    versioned: true,
    summary: 'Published raw-score to band tables for Listening, Academic Reading and GT Reading.',
    handler: rawTables,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw/convert',
    versioned: true,
    summary: 'Convert correct answers (0-40) on an objective paper to a band score.',
    handler: rawConvert,
  },
  {
    method: 'GET',
    path: '/v1/scores/mock-report',
    versioned: true,
    summary: 'Four-skill score report of a completed mock exam: raw marks and examiner bands to an overall.',
    handler: mockReport,
  },
];
