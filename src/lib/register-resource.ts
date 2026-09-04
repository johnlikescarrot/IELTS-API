import type { FastifyInstance } from "fastify";
import type { Paginated } from "../types.js";
import { parsePagination } from "./query.js";

/** Loads the full (pre-pagination) result set for a list endpoint. */
export type ListLoader<T> = (params: Record<string, string>) => T[];

/** Looks up a single resource, returning undefined when absent. */
export type IdLookup<T> = (id: string) => T | undefined;

/**
 * Register a paginated, searchable list endpoint plus a single-resource `:id`
 * endpoint under a common base path. Keeps the route code DRY while leaving the
 * data logic in the underlying data modules.
 */
export function registerResource<T>(
  app: FastifyInstance,
  basePath: string,
  loader: ListLoader<T>,
  getById: IdLookup<T>,
): void {
  app.get(basePath, async (request) => {
    const params = request.query as Record<string, string>;
    const results = loader(params);
    const page = parsePagination(params, { defaultLimit: 20, maxLimit: 100 });
    const payload: Paginated<T> = {
      total: results.length,
      limit: page.limit,
      offset: page.offset,
      items: results.slice(page.offset, page.offset + page.limit),
    };
    return payload;
  });

  app.get(`${basePath}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = getById(id);
    if (item === undefined) {
      return reply.code(404).send({ error: `Resource '${id}' not found` });
    }
    return item;
  });
}
