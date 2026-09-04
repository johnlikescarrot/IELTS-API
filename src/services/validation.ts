import type { ReadingModule } from '../types/ielts.js';
import { UNKNOWN_READING_MODULE_MESSAGE } from '../data/reading.js';

/** Error type used for any request input that fails validation. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';

  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Convert a raw (usually JSON/query) value into a number.
 *
 * Numeric strings are accepted after trimming; anything else produces `NaN`.
 */
export function coerceNumber(raw: unknown): number {
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    if (raw.trim().length === 0) {
      return Number.NaN;
    }
    return Number(raw);
  }
  return Number.NaN;
}

/**
 * Validate a raw correct-answer count against `[0, max]`.
 *
 * The value must be a finite integer.
 */
export function parseCorrectCount(raw: unknown, max: number, field = 'correct'): number {
  const value = coerceNumber(raw);
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a number.`);
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${field} must be an integer.`);
  }
  if (value < 0 || value > max) {
    throw new ValidationError(`${field} must be between 0 and ${max}.`);
  }
  return value;
}

/**
 * Return whether `band` is a valid IELTS band: between 0 and 9 inclusive and a
 * multiple of 0.5 (i.e. an integer or a half band).
 */
export function isValidBand(band: number): boolean {
  if (!Number.isFinite(band)) {
    return false;
  }
  if (band < 0 || band > 9) {
    return false;
  }
  return Number.isInteger(band * 2);
}

/**
 * Validate a band score value (0–9 in half-band increments).
 */
export function parseBand(raw: unknown, field = 'band'): number {
  const value = coerceNumber(raw);
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a number.`);
  }
  if (!isValidBand(value)) {
    throw new ValidationError(`${field} must be a valid IELTS band between 0 and 9 in half bands.`);
  }
  return value;
}

/**
 * Parse the Reading module query value, defaulting to Academic when absent.
 */
export function parseReadingModule(raw: unknown): ReadingModule {
  if (raw === undefined || raw === null) {
    return 'academic';
  }
  if (typeof raw === 'string' && raw.trim().length === 0) {
    return 'academic';
  }
  const value = typeof raw === 'string' ? raw.trim() : String(raw);
  if (value === 'academic') {
    return 'academic';
  }
  if (value === 'general-training') {
    return 'general-training';
  }
  throw new ValidationError(UNKNOWN_READING_MODULE_MESSAGE);
}

/**
 * Coerce a query parameter into a trimmed string, returning an empty string
 * when the value is absent or not a string.
 */
export function parseOptionalString(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim();
}

/**
 * Coerce an optional number parameter that may be absent. Returns `undefined`
 * when the value is undefined or an empty string; otherwise behaves like
 * `parseCorrectCount`.
 */
export function parseOptionalNonNegativeInteger(
  raw: unknown,
  max: number,
  field: string,
): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'string' && raw.trim().length === 0) {
    return undefined;
  }
  return parseCorrectCount(raw, max, field);
}
