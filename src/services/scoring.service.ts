/**
 * Score conversion and overall band calculation.
 */

import {
  MODULE_RANGES,
  DISCLAIMER,
  type BandRange,
  type ScoreModule
} from '../data/score-conversion.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

export { DISCLAIMER };

export const SCORE_MODULES: readonly ScoreModule[] = [
  'listening',
  'reading-academic',
  'reading-general-training'
];

export interface RawToBandResult {
  readonly module: ScoreModule;
  readonly raw: number;
  readonly band: number;
  readonly range: BandRange;
  readonly disclaimer: string;
}

function rangesFor(module: ScoreModule): readonly BandRange[] {
  const ranges = MODULE_RANGES[module];
  if (ranges === undefined) {
    throw new NotFoundError('Module', module);
  }
  return ranges;
}

export function isScoreModule(value: string): value is ScoreModule {
  return (SCORE_MODULES as readonly string[]).includes(value);
}

export function rawToBand(module: ScoreModule, raw: number): RawToBandResult {
  if (!Number.isInteger(raw) || raw < 0 || raw > 40) {
    throw new ValidationError('Raw score must be an integer between 0 and 40', {
      raw,
      module
    });
  }
  // The conversion tables cover every raw score 0..40 exhaustively
  // (enforced by test/data/data-integrity.test.ts), so a match always exists.
  const range = rangesFor(module).find(
    (candidate) => raw >= candidate.min && raw <= candidate.max
  ) as BandRange;
  return { module, raw, band: range.band, range, disclaimer: DISCLAIMER };
}

export interface RawConversionRow {
  readonly raw: number;
  readonly band: number;
}

export function fullTable(module: ScoreModule): readonly RawConversionRow[] {
  const ranges = rangesFor(module);
  const rows: RawConversionRow[] = [];
  for (let raw = 0; raw <= 40; raw++) {
    // Tables cover every raw score 0..40 exhaustively (data-integrity tested).
    const range = ranges.find(
      (candidate) => raw >= candidate.min && raw <= candidate.max
    ) as BandRange;
    rows.push({ raw, band: range.band });
  }
  return rows;
}

export interface SkillScores {
  readonly listening: number;
  readonly reading: number;
  readonly writing: number;
  readonly speaking: number;
}

export interface OverallResult {
  readonly scores: SkillScores;
  readonly mean: number;
  readonly overall: number;
  readonly roundingRule: string;
}

function validateBand(value: number, skill: string): number {
  const isHalfStep = Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;
  if (!Number.isFinite(value) || value < 0 || value > 9 || !isHalfStep) {
    throw new ValidationError(`Invalid band score for ${skill}`, { value });
  }
  return value;
}

/**
 * Rounds the four-skill mean to the nearest half band, with .25 rounded up
 * to .5 and .75 rounded up to the next whole band (the official IELTS rule).
 */
export function overallBand(scores: SkillScores): OverallResult {
  const validated: SkillScores = {
    listening: validateBand(scores.listening, 'listening'),
    reading: validateBand(scores.reading, 'reading'),
    writing: validateBand(scores.writing, 'writing'),
    speaking: validateBand(scores.speaking, 'speaking')
  };
  const mean =
    (validated.listening + validated.reading + validated.writing + validated.speaking) / 4;
  const overall = Math.floor(mean * 2 + 0.5) / 2;
  return {
    scores: validated,
    mean,
    overall,
    roundingRule:
      'The mean of the four skills is rounded to the nearest half band; .25 rounds up to .5 and .75 rounds up to the next whole band.'
  };
}
