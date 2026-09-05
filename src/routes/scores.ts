/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import { bandForRawScore, rawScoreForBand, RAW_SCORE_MODULES, RAW_SCORE_TABLES } from '../data/rawScores.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, getString, requireString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, RawScoreModuleId, Skill } from '../types.js';

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

/** Compact module descriptor shared by the raw-score response modes. */
function moduleDescriptor(moduleId: RawScoreModuleId): {
  id: RawScoreModuleId;
  name: string;
  skill: string;
  questions: number;
} {
  const table = RAW_SCORE_TABLES[moduleId];
  return { id: table.id, name: table.name, skill: table.skill, questions: table.questions };
}

/** Provenance metadata shared by the raw-score response modes. */
function rawScoreMeta(moduleId: RawScoreModuleId, note?: string): Record<string, string> {
  const table = RAW_SCORE_TABLES[moduleId];
  return {
    source: table.source,
    sourceUrl: table.sourceUrl,
    provenance: 'published-table',
    note: note ?? table.note,
  };
}

/**
 * The published raw-score conversion tables.
 *
 * Three modes: `module` alone returns the full table, `module` + `correct`
 * converts one practice mark to a band, and `module` + `band` returns the
 * minimum mark the band requires.
 */
function raw(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const moduleId = getEnum(params, 'module', RAW_SCORE_MODULES);
  if (moduleId === undefined) {
    throw badRequest('Parameter "module" is required.', {
      parameter: 'module',
      allowed: RAW_SCORE_MODULES.join(','),
    });
  }
  const table = RAW_SCORE_TABLES[moduleId];
  const correctRaw = getString(params, 'correct');
  const bandRaw = getString(params, 'band');
  if (correctRaw !== undefined && bandRaw !== undefined) {
    throw badRequest('Parameters "correct" and "band" cannot be combined; provide only one.', {
      parameter: 'correct,band',
    });
  }

  if (correctRaw !== undefined) {
    const correct = getInt(params, 'correct', 0, table.questions, 0);
    const row = bandForRawScore(moduleId, correct);
    const next = row === undefined ? undefined : rawScoreForBand(moduleId, row.band + 0.5);
    return {
      data: {
        module: moduleDescriptor(moduleId),
        correct,
        matched: row !== undefined,
        band: row?.band ?? null,
        cefr: row === undefined ? null : cefrForBand(row.band),
        row: row ?? null,
        nextBand:
          next === undefined
            ? null
            : {
                band: next.band,
                correct: next.min,
                additionalNeeded: next.min - correct,
              },
      },
      meta: rawScoreMeta(
        moduleId,
        row === undefined
          ? `A raw score of ${correct} is below the published table's floor (band ${table.floor}).`
          : undefined,
      ),
    };
  }

  if (bandRaw !== undefined) {
    const band = assertBand(Number.parseFloat(bandRaw), 'band');
    const row = rawScoreForBand(moduleId, band);
    return {
      data: {
        module: moduleDescriptor(moduleId),
        band,
        matched: row !== undefined,
        minCorrect: row?.min ?? null,
        row: row ?? null,
      },
      meta: rawScoreMeta(
        moduleId,
        row === undefined
          ? `Band ${band} is outside this table (bands ${table.floor}-9); Writing and Speaking are rated against /v1/bands/descriptors.`
          : undefined,
      ),
    };
  }

  return {
    data: {
      module: moduleDescriptor(moduleId),
      floor: table.floor,
      rows: table.entries.map((entry) => ({ ...entry, cefr: cefrForBand(entry.band) })),
    },
    meta: rawScoreMeta(moduleId),
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
    summary:
      'Published raw-score tables for the objective papers: convert correct answers to a band, or find the mark a band requires (`module`, `correct`, `band`).',
    handler: raw,
  },
];
