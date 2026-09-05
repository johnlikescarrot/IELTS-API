/**
 * Text-analysis routes (`/v1/analyze`).
 *
 * The analysis engine measures a pasted candidate text deterministically:
 * counts, readability formulae, lexical diversity, a CEFR band indication and
 * the vocabulary-coverage profile against the Cambridge IELTS 1-22 headwords.
 * Short texts travel as a query parameter (`GET`, cacheable and ETagged like
 * every other endpoint); long texts travel as a JSON body (`POST`).
 */

import {
  CROSS_VOLUME_MIN_VOLUMES,
  MAX_OUT_OF_LIST_WORDS,
  vocabularyCoverage,
  VOCABULARY_TIERS,
} from '../data/coverage.js';
import { BAND_SCALE } from '../data/bands.js';
import { badRequest } from '../lib/errors.js';
import { requireString, toParams } from '../lib/query.js';
import {
  analyzeText,
  GET_TEXT_MAX_CHARACTERS,
  GRADE_TO_CEFR,
  MTLD_FACTOR_THRESHOLD,
  normalizeToken,
  POLYSYLLABLE_MIN_SYLLABLES,
  POST_TEXT_MAX_CHARACTERS,
  tokenize,
} from '../lib/textMetrics.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { BandEstimate, JsonValue, VocabularyCoverage } from '../types.js';

/** The shared analysis payload. */
export interface AnalysisPayload {
  /** Structured output of the deterministic text metrics. */
  metrics: ReturnType<typeof analyzeText>;
  /** How the text's vocabulary maps onto the Cambridge IELTS headwords. */
  vocabularyCoverage: VocabularyCoverage;
  /** Indicative band range derived from the CEFR heuristic; `null` without words. */
  bandEstimate: BandEstimate | null;
}

/** Extract and size-limit the `text` input from either transport. */
function readInputText(context: RouteContext): string {
  if (context.method === 'POST') {
    const body = context.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw badRequest('POST bodies must be a JSON object such as {"text": "..."}.', {
        received: Array.isArray(body) ? 'array' : typeof body,
      });
    }
    const record = body as Record<string, unknown>;
    if (typeof record.text !== 'string' || record.text.trim().length === 0) {
      throw badRequest('Field "text" must be a non-empty string.', { field: 'text' });
    }
    if (record.text.length > POST_TEXT_MAX_CHARACTERS) {
      throw badRequest(
        `Field "text" must be at most ${POST_TEXT_MAX_CHARACTERS} characters; split longer documents.`,
        { field: 'text', received: String(record.text.length), max: String(POST_TEXT_MAX_CHARACTERS) },
      );
    }
    return record.text;
  }
  const text = requireString(toParams(context.url), 'text');
  if (text.length > GET_TEXT_MAX_CHARACTERS) {
    throw badRequest(
      `Parameter "text" must be at most ${GET_TEXT_MAX_CHARACTERS} characters on GET; use POST for longer texts.`,
      { parameter: 'text', received: String(text.length), max: String(GET_TEXT_MAX_CHARACTERS) },
    );
  }
  return text;
}

/** IELTS bands on each CEFR level of the `/v1/bands` scale. Every CEFR level
 * produced by the grade heuristic is present on the band scale. */
function bandEstimate(cefr: string): BandEstimate {
  const bands = BAND_SCALE.filter((entry) => entry.cefr === cefr).map((entry) => entry.band);
  const bandMin = Math.min(...bands);
  const bandMax = Math.max(...bands);
  return {
    cefr,
    bandMin,
    bandMax,
    pointEstimate: Math.round((bandMin + bandMax) / 2 / 0.5) * 0.5,
    basis: 'readability-grade heuristic',
    caveat:
      'Derived from readability grade levels alone: task response, argument quality and grammatical accuracy are not measured. Use as a difficulty indication, never as a score prediction.',
  };
}

/** Run the full analysis over a validated input text. */
function runAnalysis(text: string): AnalysisPayload {
  const metrics = analyzeText(text);
  const tokens = tokenize(text).map(normalizeToken);
  return {
    metrics,
    vocabularyCoverage: vocabularyCoverage(tokens),
    bandEstimate: metrics.cefr === null ? null : bandEstimate(metrics.cefr),
  };
}

/** Analyze the submitted text (GET query or POST body). */
function analyze(context: RouteContext): HandlerResult {
  const text = readInputText(context);
  const payload = runAnalysis(text);
  return {
    data: payload as unknown as JsonValue,
    meta: {
      input: context.method === 'GET' ? 'query' : 'body',
      inputCharacters: text.length,
    },
  };
}

/** Self-describing reference for every reported metric. */
function reference(): HandlerResult {
  return {
    data: {
      engine: 'ielts-api/text-metrics',
      version: 1,
      tokenisation: {
        words:
          "Runs of Unicode letters and combining marks, allowing internal apostrophes and hyphens (don't, state-of-the-art). Pure digit runs are not words.",
        sentences:
          'A run of ".", "!" or "?" followed by whitespace or end of text; a trailing sentence without a terminator still counts.',
        paragraphs: 'Blocks of text separated by at least one blank line.',
        syllables:
          'Vowel-group heuristic with a silent-final-e correction, calibrated to match the practice-test readability index.',
      },
      readability: [
        {
          id: 'fleschReadingEase',
          name: 'Flesch Reading Ease',
          formula: '206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)',
          range: 'higher is easier (roughly 0-100)',
          citation: 'Flesch (1948)',
        },
        {
          id: 'fleschKincaidGrade',
          name: 'Flesch-Kincaid Grade Level',
          formula: '0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59',
          citation: 'Kincaid et al. (1975)',
        },
        {
          id: 'gunningFog',
          name: 'Gunning Fog Index',
          formula: `0.4 * ((words / sentences) + 100 * (polysyllabic words / words)), polysyllabic = ${POLYSYLLABLE_MIN_SYLLABLES}+ syllables`,
          citation: 'Gunning (1952)',
        },
        {
          id: 'smogIndex',
          name: 'SMOG Index',
          formula: '1.043 * sqrt(polysyllabic words * 30 / sentences) + 3.1291',
          citation: 'McLaughlin (1969)',
        },
        {
          id: 'colemanLiauIndex',
          name: 'Coleman-Liau Index',
          formula: '0.0588 * letters-per-100-words - 0.296 * sentences-per-100-words - 15.8',
          citation: 'Coleman & Liau (1975)',
        },
        {
          id: 'automatedReadabilityIndex',
          name: 'Automated Readability Index',
          formula: '4.71 * (letters / words) + 0.5 * (words / sentences) - 21.43',
          citation: 'Smith & Senter (1967)',
        },
        {
          id: 'consensusGrade',
          name: 'Consensus grade',
          formula: 'Median of the five grade-level formulae, clamped at 0.',
          citation: 'This project',
        },
      ],
      lexicalDiversity: [
        { id: 'typeTokenRatio', formula: 'unique words / words' },
        { id: 'rootTtr', formula: 'unique words / sqrt(words) (Guiraud)' },
        {
          id: 'mtld',
          formula: `Measure of Textual Lexical Diversity, mean of both directions, factor threshold ${MTLD_FACTOR_THRESHOLD}`,
          citation: 'McCarthy & Jarvis (2010)',
        },
        { id: 'hapaxRatio', formula: 'types occurring exactly once / unique words' },
      ],
      cefrHeuristic: {
        description:
          'The consensus grade is mapped to a CEFR level; the indicative band range is the span of IELTS bands that carry that level in /v1/bands.',
        gradeToCefr: GRADE_TO_CEFR,
        fallthrough: 'grades above the last threshold map to C2',
        note: 'A descriptive difficulty indication, not a test score.',
      },
      vocabularyCoverage: {
        description:
          'Tokens are matched form-exactly (case- and accent-insensitive, no stemming) against the Cambridge IELTS 1-22 headwords.',
        tiers: VOCABULARY_TIERS,
        crossVolumeMinVolumes: CROSS_VOLUME_MIN_VOLUMES,
        outOfListLimit: MAX_OUT_OF_LIST_WORDS,
      },
      limits: {
        getMaxCharacters: GET_TEXT_MAX_CHARACTERS,
        postMaxCharacters: POST_TEXT_MAX_CHARACTERS,
      },
    } as JsonValue,
    meta: { metrics: 7, diversityMeasures: 4, tiers: VOCABULARY_TIERS.length },
  };
}

/** Analysis routes. */
export const analyzeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/analyze/reference',
    versioned: true,
    summary: 'Reference for every analysis metric: definitions, formulae and citations.',
    handler: reference,
  },
  {
    method: 'GET',
    path: '/v1/analyze/text',
    versioned: true,
    summary: `Analyze a text passed as ?text= (up to ${GET_TEXT_MAX_CHARACTERS} characters).`,
    handler: analyze,
  },
  {
    method: 'POST',
    path: '/v1/analyze/text',
    versioned: true,
    summary: `Analyze a text posted as a JSON object with a text field (up to ${POST_TEXT_MAX_CHARACTERS} characters).`,
    handler: analyze,
  },
];
