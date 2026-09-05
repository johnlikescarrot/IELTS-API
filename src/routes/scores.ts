/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import { RAW_SCORE_COMPONENTS, RAW_SCORE_MAX, RAW_SCORE_TABLES, convertRawScore } from '../data/rawscores.js';
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

/**
 * Convert a raw Listening or Reading score into a band score.
 *
 * The raw score is the number of correct answers out of 40; there is no partial
 * credit and no negative marking. The response reports the marginal cost of the
 * next half band, which is the number a practice test actually needs, and
 * surfaces the provenance of the boundary rather than presenting an indicative
 * table as if it were official.
 */
function rawScore(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const component = getEnum(params, 'component', RAW_SCORE_COMPONENTS);
  if (component === undefined) {
    throw badRequest('Parameter "component" is required.', {
      parameter: 'component',
      allowed: RAW_SCORE_COMPONENTS.join(','),
    });
  }
  if (params['raw'] === undefined) {
    throw badRequest('Parameter "raw" is required.', { parameter: 'raw' });
  }
  // Deliberately parsed with a wide range so that an out-of-range raw score is
  // reported against the conversion table rather than as a generic bound error.
  const raw = getInt(params, 'raw', 0, 1000, 0);
  const table = RAW_SCORE_TABLES[component];
  const result = convertRawScore(component, raw);
  if (result === undefined) {
    throw badRequest(`Raw score ${raw} is outside the ${table.name} conversion table.`, {
      parameter: 'raw',
      received: String(raw),
      max: String(RAW_SCORE_MAX),
    });
  }
  return {
    data: { ...result, cefr: cefrForBand(result.band), table: table.name },
    meta: {
      provenance: table.provenance,
      note: table.note,
      components: RAW_SCORE_COMPONENTS,
      basis: result.basis,
      tablesEndpoint: '/v1/scores/tables',
    },
  };
}

/** Publish the raw-score conversion tables themselves. */
function rawScoreTables(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const component = getEnum(params, 'component', RAW_SCORE_COMPONENTS);
  const tables = RAW_SCORE_COMPONENTS.filter(
    (candidate) => component === undefined || candidate === component,
  ).map((candidate) => RAW_SCORE_TABLES[candidate]);
  const extrapolated = tables.reduce(
    (count, table) => count + table.rows.filter((row) => row.basis === 'extrapolated').length,
    0,
  );
  const contested = tables.reduce(
    (count, table) => count + table.rows.filter((row) => row.disagreement !== null).length,
    0,
  );
  return {
    data: tables,
    meta: {
      total: tables.length,
      component: component ?? null,
      components: RAW_SCORE_COMPONENTS,
      questions: RAW_SCORE_MAX,
      extrapolatedRows: extrapolated,
      contestedRows: contested,
      note: 'Tables are exhaustive over 0-40, so every raw score resolves. Rows carry the basis of their boundary and, where public tables disagree, the competing boundary.',
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
    path: '/v1/scores/raw',
    versioned: true,
    summary: 'Convert a raw Listening or Reading score out of 40 into a band score.',
    handler: rawScore,
  },
  {
    method: 'GET',
    path: '/v1/scores/tables',
    versioned: true,
    summary: 'The raw-score to band-score conversion tables, with the provenance of every boundary.',
    handler: rawScoreTables,
  },
  {
    method: 'GET',
    path: '/v1/scores/interpret',
    versioned: true,
    summary: 'Map a score on another scale back to an indicative IELTS band.',
    handler: interpret,
  },
];
