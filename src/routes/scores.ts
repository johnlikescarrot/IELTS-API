/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import {
  RAW_SCORE_MODULES,
  RAW_SCORE_TABLES,
  RAW_SCORE_TOTAL,
  RAW_SCORE_VARIANTS,
  rawScoreTable,
  variantDisagreements,
} from '../data/rawScores.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { convertRawScore } from '../lib/rawScore.js';
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

/** Convert a raw score out of 40 into a band score. */
function raw(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', RAW_SCORE_MODULES);
  if (module === undefined) {
    throw badRequest('Parameter "module" is required.', {
      parameter: 'module',
      allowed: RAW_SCORE_MODULES.join(','),
    });
  }
  const table = rawScoreTable(module);
  const outOf = getInt(params, 'outOf', 1, RAW_SCORE_TOTAL, RAW_SCORE_TOTAL);
  const correct = getInt(params, 'correct', 0, RAW_SCORE_TOTAL, -1);
  if (correct < 0) {
    throw badRequest('Parameter "correct" is required.', { parameter: 'correct' });
  }
  const targetRaw = getNumber(params, 'target', 0, 9);
  const target = targetRaw === undefined ? undefined : assertBand(targetRaw, 'target');
  const result = convertRawScore(table, correct, outOf, target);
  const meta: Record<string, string> = {
    provenance: table.provenance,
    note: table.note,
    anchorSource: table.anchorSourceUrl,
  };
  if (outOf !== RAW_SCORE_TOTAL) {
    meta.rescaling = `The score was rescaled proportionally from ${outOf} questions to ${RAW_SCORE_TOTAL}. Rescaling is not equating: a shorter section measures less precisely, and one mark here moves the scaled score by ${(RAW_SCORE_TOTAL / outOf).toFixed(1)}.`;
  }
  if (!result.sensitivity.stable) {
    meta.threshold =
      'This raw score sits on a band boundary, where the published thresholds are least reliable.';
  }
  return { data: result, meta };
}

/** Publish the raw-score conversion tables and the disagreements between sources. */
function rawTables(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', RAW_SCORE_MODULES);
  const tables = RAW_SCORE_MODULES.filter((id) => module === undefined || id === module).map(
    (id) => RAW_SCORE_TABLES[id],
  );
  const variants = RAW_SCORE_VARIANTS.filter(
    (variant) => module === undefined || variant.module === module,
  ).map((variant) => {
    const disagreements = variantDisagreements(variant);
    return {
      id: variant.id,
      module: variant.module,
      label: variant.label,
      sourceUrl: variant.sourceUrl,
      note: variant.note,
      disagreements,
      disagreeingScores: disagreements.length,
      agreementRate: Math.round((1 - disagreements.length / (RAW_SCORE_TOTAL + 1)) * 1000) / 10,
    };
  });
  return {
    data: { tables, variants },
    meta: {
      count: tables.length,
      totalQuestions: RAW_SCORE_TOTAL,
      provenance: 'indicative-consensus',
      caveat:
        'IELTS publishes only the average marks scored at whole bands 4-8 and equates every test version separately; no official raw-score table exists. These tables reconstruct the consensus used across preparation providers and are validated against the published averages.',
      disagreementMethod: `Each variant is compared with the consensus table at all ${RAW_SCORE_TOTAL + 1} possible raw scores; agreementRate is the percentage of raw scores at which the two agree.`,
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
    path: '/v1/scores/raw',
    versioned: true,
    summary: 'Convert a Listening or Reading raw score out of 40 into a band score.',
    handler: raw,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw/tables',
    versioned: true,
    summary: 'The raw-score conversion tables, with the disagreements between published sources.',
    handler: rawTables,
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
];
