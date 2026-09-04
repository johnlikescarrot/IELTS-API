/**
 * Zod-powered request validation with consistent error formatting.
 */

import { z, type ZodTypeAny, type ZodError } from 'zod';
import { ValidationError } from './errors.js';

export interface Issue {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

function toIssues(error: ZodError): readonly Issue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
    code: issue.code
  }));
}

export function parseInput<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
  source: string
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${source}`, { issues: toIssues(result.error) });
  }
  return result.data as z.output<S>;
}

/** Pagination query shared by every list endpoint. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const seedSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? undefined : value));

export const idParamSchema = z.object({
  id: z.string().trim().min(1).max(120)
});
