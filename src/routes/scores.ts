/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import { RAW_SCORE_TABLE_IDS, RAW_SCORE_TABLES, convertRawScore } from '../data/rawScores.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, requireString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, RawScoreRow, Skill } from '../types.js';

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

/** Convert a raw mark (correct answers out of 40) to a band score. */
function rawScore(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const paper = getEnum(params, 'paper', RAW_SCORE_TABLE_IDS);
  if (paper === undefined) {
    throw badRequest('Parameter "paper" is required.', {
      parameter: 'paper',
      allowed: RAW_SCORE_TABLE_IDS.join(','),
    });
  }
  const raw = getInt(params, 'raw', 0, 40, -1);
  if (raw < 0) {
    throw badRequest('Parameter "raw" is required.', { parameter: 'raw' });
  }
  const table = RAW_SCORE_TABLES[paper];
  const hit = convertRawScore(paper, raw);
  if (hit === undefined) {
    // The tables are ascending and gap-free, so an unmatched mark always falls
    // below the lowest published row; the floor row is guaranteed to exist.
    const floor = table.entries[0] as RawScoreRow;
    return {
      data: {
        paper,
        module: table.module,
        raw,
        rawMax: table.rawMax,
        band: null,
        range: null,
        display: null,
        cefr: null,
        nextBand: floor.band,
        marksToNextBand: floor.min - raw,
        matched: false,
        provider: table.provider,
        sourceUrl: table.sourceUrl,
      },
      meta: {
        note: `Raw ${raw} falls below the lowest published row (${floor.min}–${floor.max}, band ${floor.band}); ${table.note}`,
      },
    };
  }
  return {
    data: {
      paper,
      module: table.module,
      raw,
      rawMax: table.rawMax,
      band: hit.band,
      range: [hit.min, hit.max],
      display: hit.display,
      cefr: cefrForBand(hit.band),
      nextBand: hit.nextBand,
      marksToNextBand: hit.marksToNextBand,
      matched: true,
      provider: table.provider,
      sourceUrl: table.sourceUrl,
    },
    meta: { note: table.note },
  };
}

/** Every raw-score conversion table. */
function tables(): HandlerResult {
  return {
    data: RAW_SCORE_TABLE_IDS.map((id) => RAW_SCORE_TABLES[id]),
    meta: {
      count: RAW_SCORE_TABLE_IDS.length,
      note: 'Average marks required per the partners’ published conversion charts; actual conversions vary slightly between test versions.',
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
    summary: 'Convert a raw mark out of 40 to a band score (listening, academic or general reading).',
    handler: rawScore,
  },
  {
    method: 'GET',
    path: '/v1/scores/tables',
    versioned: true,
    summary: 'Every published raw-score to band conversion table.',
    handler: tables,
  },
];
