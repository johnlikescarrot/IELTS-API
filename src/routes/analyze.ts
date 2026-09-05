/**
 * Text-analysis routes (`/v1/analyze`).
 *
 * Every endpoint accepts the text either as a `text` query parameter on `GET`
 * or as a request body on `POST` (`text/plain`, `application/json` with a
 * `text` property, or a form-encoded `text` field). Submitted text is analysed
 * in process and is never stored or logged.
 */

import {
  WRITING_TASKS,
  analyzeCohesion,
  analyzeReadability,
  analyzeVocabulary,
  analyzeWriting,
  TASK_REQUIREMENTS,
} from '../lib/analysis.js';
import { COHESION_RELATIONS, COHESIVE_DEVICES } from '../data/lexicon.js';
import { MAX_BODY_BYTES, textFromBody } from '../lib/body.js';
import { MIN_READABILITY_WORDS, READABILITY_FORMULAE, measureText } from '../lib/text.js';
import { badRequest, unprocessable } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { JsonValue } from '../types.js';

/** Largest text accepted, in characters. */
export const MAX_TEXT_CHARACTERS = 50_000;

/**
 * Resolve the text to analyse from the query string or the request body.
 *
 * @param context - Route context.
 * @throws {HttpError} `400` when no text was supplied or it is too long.
 */
export function resolveText(context: RouteContext): string {
  const fromQuery = getString(toParams(context.url), 'text');
  const text = context.body.length > 0 ? textFromBody(context.body, context.contentType) : (fromQuery ?? '');
  if (text.trim().length === 0) {
    throw badRequest(
      'Supply the text to analyse as a "text" query parameter on GET, or as a POST body (text/plain, application/json with a "text" property, or a form-encoded "text" field).',
      { parameter: 'text', maxBodyBytes: String(MAX_BODY_BYTES) },
    );
  }
  if (text.length > MAX_TEXT_CHARACTERS) {
    throw badRequest(`The text must be at most ${MAX_TEXT_CHARACTERS} characters.`, {
      parameter: 'text',
      received: String(text.length),
      max: String(MAX_TEXT_CHARACTERS),
    });
  }
  return text;
}

/** How many lexical hits to return; shared by the lexis-bearing endpoints. */
function sampleSize(context: RouteContext): number {
  return getInt(toParams(context.url), 'sample', 0, 200, 25);
}

/** Shared privacy and provenance metadata. */
const PRIVACY = 'Submitted text is analysed in-process and is never stored, logged or transmitted.';

/** Readability measurement of an arbitrary passage. */
function readability(context: RouteContext): HandlerResult {
  const text = resolveText(context);
  const analysis = analyzeReadability(text);
  if (analysis === null) {
    throw unprocessable('The text contains no alphabetic words to measure.', { parameter: 'text' });
  }
  return {
    data: analysis as unknown as JsonValue,
    meta: {
      characters: text.length,
      minimumReliableWords: MIN_READABILITY_WORDS,
      formulae: READABILITY_FORMULAE as unknown as JsonValue,
      comparability:
        'The first eight measures are computed by the same pipeline that produced the readability index published by /v1/tests, so they are directly comparable with any indexed passage.',
      privacy: PRIVACY,
    },
  };
}

/** Lexical profile against the Cambridge IELTS 1-22 headword list. */
function vocabulary(context: RouteContext): HandlerResult {
  const text = resolveText(context);
  const profile = analyzeVocabulary(text, sampleSize(context));
  if (profile === null) {
    throw unprocessable('The text contains no alphabetic words to profile.', { parameter: 'text' });
  }
  return {
    data: profile as unknown as JsonValue,
    meta: {
      characters: text.length,
      referenceList: 'Cambridge IELTS 1-22 headwords, as published by /v1/vocabulary',
      sample: profile.matched.length + profile.offList.length,
      privacy: PRIVACY,
    },
  };
}

/** Cohesive-device inventory of a text. */
function cohesion(context: RouteContext): HandlerResult {
  const text = resolveText(context);
  const measurement = measureText(text);
  if (measurement === null) {
    throw unprocessable('The text contains no alphabetic words to scan.', { parameter: 'text' });
  }
  const analysis = analyzeCohesion(text, measurement.words);
  return {
    data: { words: measurement.words, ...analysis } as unknown as JsonValue,
    meta: {
      characters: text.length,
      relations: COHESION_RELATIONS,
      inventorySize: COHESIVE_DEVICES.length,
      note: 'The inventory is an original compilation of discourse markers grouped by the relation they signal. Presence of a device is not evidence of accurate or appropriate use.',
      privacy: PRIVACY,
    },
  };
}

/** Descriptor-aligned diagnostics for a Writing Task 1 or Task 2 response. */
function writing(context: RouteContext): HandlerResult {
  const text = resolveText(context);
  const task = getEnum(toParams(context.url), 'task', WRITING_TASKS) ?? 'task-2';
  const analysis = analyzeWriting(text, task, sampleSize(context));
  if (analysis === null) {
    throw unprocessable('The response contains no alphabetic words to analyse.', { parameter: 'text' });
  }
  return {
    data: analysis as unknown as JsonValue,
    meta: {
      characters: text.length,
      tasks: WRITING_TASKS,
      requirements: TASK_REQUIREMENTS as unknown as JsonValue,
      descriptors: '/v1/bands/descriptors',
      notABandScore:
        'This endpoint never returns a band score. Bands are awarded by trained examiners against the analytic descriptors; surface features cannot substitute for that judgement.',
      privacy: PRIVACY,
    },
  };
}

/** The cohesive-device inventory itself, as a browsable dataset. */
function devices(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const relation = getEnum(params, 'relation', COHESION_RELATIONS);
  const register = getEnum(params, 'register', ['basic', 'academic'] as const);
  const filtered = COHESIVE_DEVICES.filter(
    (device) =>
      (relation === undefined || device.relation === relation) &&
      (register === undefined || device.register === register),
  );
  return {
    data: filtered as unknown as JsonValue,
    meta: {
      total: filtered.length,
      count: COHESIVE_DEVICES.length,
      relation: relation ?? null,
      register: register ?? null,
      relations: COHESION_RELATIONS,
    },
  };
}

/** Text-analysis routes. */
export const analyzeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/analyze/readability',
    versioned: true,
    acceptsBody: true,
    summary: 'Measure a passage with six readability formulae and place it against the indexed corpus.',
    handler: readability,
  },
  {
    method: 'GET',
    path: '/v1/analyze/vocabulary',
    versioned: true,
    acceptsBody: true,
    summary: 'Profile a text against the Cambridge IELTS 1-22 headword list.',
    handler: vocabulary,
  },
  {
    method: 'GET',
    path: '/v1/analyze/cohesion',
    versioned: true,
    acceptsBody: true,
    summary: 'Inventory the cohesive devices in a text, grouped by discourse relation.',
    handler: cohesion,
  },
  {
    method: 'GET',
    path: '/v1/analyze/writing',
    versioned: true,
    acceptsBody: true,
    summary: 'Descriptor-aligned diagnostics for a Writing Task 1 or Task 2 response.',
    handler: writing,
  },
  {
    method: 'GET',
    path: '/v1/analyze/devices',
    versioned: true,
    summary: 'The cohesive-device inventory used by the cohesion analysis.',
    handler: devices,
  },
];
