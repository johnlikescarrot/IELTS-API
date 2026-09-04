import type { Paginated } from '../types.js';

export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/** Parse a bounded positive integer query value. Falls back to `fallback` when missing/invalid. */
export function parseBoundedInt(value: unknown, fallback: number, max: number): number {
  const num =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return fallback;
  const floored = Math.floor(num);
  if (floored < 1) return fallback;
  if (floored > max) return max;
  return floored;
}

/** Parse an offset (>= 0). Falls back to 0 when missing/invalid. */
export function parseOffset(value: unknown): number {
  const num =
    typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return 0;
  const floored = Math.floor(num);
  if (floored < 0) return 0;
  return floored;
}

export function matchesQuery(
  haystackFields: (string | string[])[],
  query: string,
): boolean {
  if (query === '') return true;
  const q = query.toLowerCase();
  return haystackFields.some((field) => {
    if (Array.isArray(field)) {
      return field.some((part) => part.toLowerCase().includes(q));
    }
    return field.toLowerCase().includes(q);
  });
}

export function paginate<T>(items: T[], limit: number, offset: number): Paginated<T> {
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
  };
}
