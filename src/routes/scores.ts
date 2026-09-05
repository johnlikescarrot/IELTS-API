/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import {
  RAW_SCORE_NOTE,
  RAW_SCORE_TABLES,
  convertRawScore,
  rawScoreTable,
  rawTableIdFor,
} from '../data/rawScores.js';
import { cefrForBand } from '../data/bands.js';
import { TASK_MODULES } from '../data/tasks.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, requireString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, Skill } from '../types.js';

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

/** Convert a raw score (correct answers out of 40) to a band score. */
function raw(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', ['listening', 'reading']);
  if (skill === undefined) {
    throw badRequest('Parameter "skill" is required.', {
      parameter: 'skill',
      allowed: 'listening,reading',
    });
  }
  const module = getEnum(params, 'module', TASK_MODULES);
  if (skill === 'reading' && module === undefined) {
    throw badRequest('Parameter "module" is required when skill is "reading".', {
      parameter: 'module',
      allowed: TASK_MODULES.join(','),
    });
  }
  const correct = getInt(params, 'correct', 0, 40, -1);
  if (correct < 0) {
    throw badRequest('Parameter "correct" is required.', { parameter: 'correct' });
  }
  const table = rawTableIdFor(skill, module ?? 'academic');
  return {
    data: convertRawScore(table, correct),
    meta: {
      questions: rawScoreTable(table).questions,
      note: rawScoreTable(table).note,
    },
  };
}

/** Every published raw-score conversion table. */
function rawTables(): HandlerResult {
  return {
    data: RAW_SCORE_TABLES,
    meta: {
      total: RAW_SCORE_TABLES.length,
      note: RAW_SCORE_NOTE,
      endpoint: '/v1/scores/raw?skill=listening&correct=27',
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
    path: '/v1/scores/raw/tables',
    versioned: true,
    summary:
      'The raw-score to band conversion tables for Listening and Reading (Academic and General Training).',
    handler: rawTables,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw',
    versioned: true,
    summary: 'Convert correct answers out of 40 into a band score for a receptive paper.',
    handler: raw,
  },
];
