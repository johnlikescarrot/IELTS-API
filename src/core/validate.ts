import { badRequest } from './errors.ts';

/** Assert that a value is a finite number inside `[min, max]`. */
export function requireNumber(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw badRequest(`'${field}' must be a finite number`, { field, value });
  }
  if (parsed < min || parsed > max) {
    throw badRequest(`'${field}' must be between ${min} and ${max}`, {
      field,
      value: parsed,
      min,
      max,
    });
  }
  return parsed;
}

/** Assert that a value is a non-empty string no longer than `maxLength`. */
export function requireString(value: unknown, field: string, maxLength = 20000): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`'${field}' must be a non-empty string`, { field });
  }
  if (value.length > maxLength) {
    throw badRequest(`'${field}' must be at most ${maxLength} characters`, {
      field,
      maxLength,
      length: value.length,
    });
  }
  return value;
}

/** Assert that a value is one of `allowed`, returning it narrowed. */
export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`'${field}' must be one of: ${allowed.join(', ')}`, {
      field,
      allowed,
      value,
    });
  }
  return value as T;
}

/** Assert that a value is an object literal (not null, not an array). */
export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw badRequest(`'${field}' must be a JSON object`, { field });
  }
  return value as Record<string, unknown>;
}
