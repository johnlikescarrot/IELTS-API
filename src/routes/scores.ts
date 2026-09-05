/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import { RAW_SCORE_MAXIMUM, RAW_SCORE_PAPERS, RAW_SCORE_TABLES, bandForRaw } from '../data/rawScores.js';
import { assertBand, calculateOverall, MAX_BAND } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, requireString, toParams } from '../lib/query.js';
import { analyseTarget } from '../lib/target.js';
import { round2 } from '../lib/textstats.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, RawScoreNextBand, RawScoreResult, Skill } from '../types.js';

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

/** Convert a raw score out of 40 into the indicative band for a paper. */
function raw(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const paper = getEnum(params, 'paper', RAW_SCORE_PAPERS);
  if (paper === undefined) {
    throw badRequest('Parameter "paper" is required.', {
      parameter: 'paper',
      allowed: RAW_SCORE_PAPERS.join(','),
    });
  }
  const table = RAW_SCORE_TABLES[paper];
  const score = getInt(params, 'score', 0, RAW_SCORE_MAXIMUM, -1);
  if (score < 0) {
    throw badRequest('Parameter "score" is required.', {
      parameter: 'score',
      min: '0',
      max: String(RAW_SCORE_MAXIMUM),
    });
  }

  const row = bandForRaw(paper, score);
  let nextBand: RawScoreNextBand | null = null;
  if (row !== undefined && row.band < MAX_BAND) {
    // Rows are ordered highest band first, so the next band is the row before.
    const index = table.bands.indexOf(row);
    const above = table.bands[index - 1] as (typeof table.bands)[number];
    nextBand = { band: above.band, rawScore: above.min, marksNeeded: above.min - score };
  }

  const result: RawScoreResult = {
    paper,
    name: table.name,
    rawScore: score,
    maximum: table.maximum,
    percentCorrect: round2((score / table.maximum) * 100),
    band: row?.band ?? null,
    range: row?.display ?? null,
    matched: row !== undefined,
    nextBand,
    cefr: row === undefined ? null : cefrForBand(row.band),
  };
  return {
    data: result,
    meta: {
      note: table.note,
      sourceUrl: table.sourceUrl,
      unmatched:
        row === undefined
          ? `Raw score ${score} falls below the lowest published row of the ${table.name} table.`
          : null,
    },
  };
}

/** Publish the raw-score conversion tables themselves. */
function rawTables(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const paper = getEnum(params, 'paper', RAW_SCORE_PAPERS);
  const papers = paper === undefined ? RAW_SCORE_PAPERS : [paper];
  return {
    data: papers.map((candidate) => RAW_SCORE_TABLES[candidate]),
    meta: {
      count: papers.length,
      papers: RAW_SCORE_PAPERS,
      maximum: RAW_SCORE_MAXIMUM,
      note: 'Indicative conversions from official practice material; live tests are equated and move boundaries by one or two marks.',
    },
  };
}

/** Work out what each component must reach for a target overall band. */
function target(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const wanted = assertBand(Number.parseFloat(requireString(params, 'target')), 'target');
  const components: Record<Skill, number> = {
    listening: component(params, 'listening'),
    reading: component(params, 'reading'),
    writing: component(params, 'writing'),
    speaking: component(params, 'speaking'),
  };
  const analysis = analyseTarget(components, wanted);
  return {
    data: analysis,
    meta: {
      rule: 'Overall = mean of the four components rounded to the nearest half band; means ending in .25 or .75 round up.',
      method:
        'Each route is the lowest reportable band for one component that reaches the target while the other three stay unchanged; routes are ordered by the size of the lift.',
      balanced:
        'When no single component can reach the target, "balanced" raises every component by the same number of half bands.',
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
    summary: 'Convert a Listening or Reading raw score out of 40 into an indicative band.',
    handler: raw,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw-tables',
    versioned: true,
    summary: 'The published raw-score to band conversion tables for the three marked papers.',
    handler: rawTables,
  },
  {
    method: 'GET',
    path: '/v1/scores/target',
    versioned: true,
    summary: 'What each component must reach for a target overall band, cheapest route first.',
    handler: target,
  },
];
