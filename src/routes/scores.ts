/**
 * Scoring routes (`/v1/scores`).
 */

import { CONVERSION_TABLES, CONVERSION_TARGETS, convertBand } from '../data/conversions.js';
import { cefrForBand } from '../data/bands.js';
import {
  MAX_RAW_SCORE,
  nextBandFrom,
  RAW_SCORE_PAPERS,
  RAW_SCORE_TABLES,
  rawScoreRow,
} from '../data/rawScores.js';
import { assertBand, calculateOverall } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getNumber, requireString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { ConversionEntry, RawScorePaper, Skill } from '../types.js';

/** Reading papers, by module, used by the mock report. */
const READING_PAPER: Record<'academic' | 'general-training', RawScorePaper> = {
  academic: 'academic-reading',
  'general-training': 'general-reading',
};

/** Modules accepted by the mock report. */
const MODULES = ['academic', 'general-training'] as const;

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

/** Convert a raw Listening or Reading score out of 40 into a band. */
function raw(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const paper = getEnum(params, 'paper', RAW_SCORE_PAPERS);
  if (paper === undefined) {
    throw badRequest('Parameter "paper" is required.', {
      parameter: 'paper',
      allowed: RAW_SCORE_PAPERS.join(','),
    });
  }
  const correct = getInt(params, 'correct', 0, MAX_RAW_SCORE, -1);
  if (correct < 0) {
    throw badRequest('Parameter "correct" is required.', {
      parameter: 'correct',
      min: '0',
      max: String(MAX_RAW_SCORE),
    });
  }
  const table = RAW_SCORE_TABLES[paper];
  const row = rawScoreRow(paper, correct);
  const next = nextBandFrom(paper, correct);
  return {
    data: {
      paper,
      name: table.name,
      module: table.module,
      correct,
      questions: table.questions,
      band: row.band,
      cefr: cefrForBand(row.band),
      bandRange: { minCorrect: row.minCorrect, maxCorrect: row.maxCorrect },
      marksToNextBand: next,
      extrapolated: row.extrapolated,
      percentage: Math.round((correct / table.questions) * 1000) / 10,
    },
    meta: {
      note: table.note,
      source: table.source,
      publishedFloor: table.publishedFloor,
      extrapolation: row.extrapolated
        ? `The source volumes stop at ${table.publishedFloor} correct answers; this row continues the final published step and must not be quoted as a published cut score.`
        : 'This row is printed in the source volumes.',
    },
  };
}

/** Publish the whole raw-score table for a paper, or all three. */
function rawTables(context: RouteContext): HandlerResult {
  const paper = getEnum(toParams(context.url), 'paper', RAW_SCORE_PAPERS);
  const tables =
    paper === undefined ? RAW_SCORE_PAPERS.map((id) => RAW_SCORE_TABLES[id]) : [RAW_SCORE_TABLES[paper]];
  return {
    data: tables,
    meta: {
      total: tables.length,
      paper: paper ?? null,
      papers: RAW_SCORE_PAPERS,
      questions: MAX_RAW_SCORE,
      note: 'Rows flagged `extrapolated` continue below the lowest cut score the source volumes print.',
    },
  };
}

/** Turn a whole mock sitting into a report form. */
function mock(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const module = getEnum(params, 'module', MODULES) ?? 'academic';
  const listeningCorrect = getInt(params, 'listeningCorrect', 0, MAX_RAW_SCORE, -1);
  const readingCorrect = getInt(params, 'readingCorrect', 0, MAX_RAW_SCORE, -1);
  if (listeningCorrect < 0 || readingCorrect < 0) {
    throw badRequest('Parameters "listeningCorrect" and "readingCorrect" are both required.', {
      parameters: 'listeningCorrect,readingCorrect',
      min: '0',
      max: String(MAX_RAW_SCORE),
    });
  }
  const writing = assertBand(Number.parseFloat(requireString(params, 'writing')), 'writing');
  const speaking = assertBand(Number.parseFloat(requireString(params, 'speaking')), 'speaking');

  const readingPaper = READING_PAPER[module];
  const listeningRow = rawScoreRow('listening', listeningCorrect);
  const readingRow = rawScoreRow(readingPaper, readingCorrect);
  const components: Record<Skill, number> = {
    listening: listeningRow.band,
    reading: readingRow.band,
    writing,
    speaking,
  };
  const result = calculateOverall(components, cefrForBand);
  const weakest = Math.min(...Object.values(components));
  return {
    data: {
      module,
      papers: {
        listening: {
          paper: 'listening',
          correct: listeningCorrect,
          band: listeningRow.band,
          marksToNextBand: nextBandFrom('listening', listeningCorrect),
          extrapolated: listeningRow.extrapolated,
        },
        reading: {
          paper: readingPaper,
          correct: readingCorrect,
          band: readingRow.band,
          marksToNextBand: nextBandFrom(readingPaper, readingCorrect),
          extrapolated: readingRow.extrapolated,
        },
        writing: { paper: `${module === 'academic' ? 'academic' : 'general'}-writing`, band: writing },
        speaking: { paper: 'speaking', band: speaking },
      },
      ...result,
      limitingSkills: (Object.keys(components) as Skill[]).filter((skill) => components[skill] === weakest),
    },
    meta: {
      rule: 'Raw scores are converted with the indicative tables at /v1/scores/raw/tables, then the four bands are averaged by the rule at /v1/scores/overall.',
      caveat:
        'A mock report is not an official result: the raw-score tables are indicative and the Writing and Speaking bands are whatever the marker awarded.',
      readingTable: readingPaper,
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
    summary: 'The Listening and Reading raw-score conversion tables in full.',
    handler: rawTables,
  },
  {
    method: 'GET',
    path: '/v1/scores/raw',
    versioned: true,
    summary: 'Convert a Listening or Reading raw score out of 40 into a band.',
    handler: raw,
  },
  {
    method: 'GET',
    path: '/v1/scores/mock',
    versioned: true,
    summary: 'Turn a whole mock sitting — two raw scores and two marked bands — into a report form.',
    handler: mock,
  },
];
