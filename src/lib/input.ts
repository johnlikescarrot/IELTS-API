/** Strict, non-coercing validation for client-owned JSON state. Values are never echoed in errors. */
import { badRequest } from './errors.js';

/** Read an object, rejecting unknown fields rather than silently ignoring misspellings. */
export function readObject(value: unknown, field: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badRequest(`Field "${field}" must be an object.`, { field });
  }
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw badRequest(`Field "${field}" contains an unsupported property.`, { field });
  }
  return value as Record<string, unknown>;
}

/** Read a finite, bounded JSON number; integers are required unless explicitly disabled. */
export function readNumber(value: unknown, field: string, min: number, max: number, integer = true): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw badRequest(`Field "${field}" must be ${integer ? 'an integer' : 'a number'} in ${min}..${max}.`, {
      field,
    });
  }
  return value;
}

/** Read a nonblank, length-bounded string without silently normalising identifiers or seeds. */
export function readString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw badRequest(`Field "${field}" must be a nonblank string of at most ${maxLength} characters.`, {
      field,
    });
  }
  return value;
}

/** Read an exact Gregorian calendar date in years 0001..9999, interpreted at midnight UTC. */
export function readDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    throw badRequest(`Field "${field}" must be a date (YYYY-MM-DD) in years 0001..9999.`, { field });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest(`Field "${field}" is not a valid calendar date.`, { field });
  }
  return value;
}
