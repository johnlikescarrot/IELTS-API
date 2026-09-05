/**
 * Cross-dataset search route (`/v1/search`).
 *
 * One query against every dataset the API publishes. The search is a
 * deterministic in-memory scan of the published datasets: no index, no
 * stemming, no external service — identical queries always return identical
 * responses.
 */

import { badRequest } from '../lib/errors.js';
import { runSearch, SEARCH_DATASET_IDS } from '../lib/globalSearch.js';
import { getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { RouteContext, HandlerResult, RouteDefinition } from '../lib/route.js';
import type { SearchDatasetId } from '../types.js';

/** Minimum query length; single characters match nearly everything. */
const MIN_QUERY_LENGTH = 2;
/** Maximum query length; longer queries never match a clipped field. */
const MAX_QUERY_LENGTH = 80;

/** Read and validate the search query. */
function requireQuery(params: Record<string, string | string[] | undefined>): string {
  const query = getString(params, 'q');
  if (query === undefined) {
    throw badRequest('Parameter "q" is required.', { parameter: 'q' });
  }
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    throw badRequest(
      `Parameter "q" must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`,
      {
        parameter: 'q',
        received: String(query.length),
      },
    );
  }
  return query;
}

/** Search every dataset (or a validated subset) for one query. */
function search(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = requireQuery(params);
  const requested = parseList(getString(params, 'datasets'), 'datasets', SEARCH_DATASET_IDS);
  const datasets: readonly SearchDatasetId[] | undefined = requested as SearchDatasetId[] | undefined;
  const limit = getInt(params, 'limit', 1, 20, 5);
  const report = runSearch(query, datasets, limit);
  return {
    data: report,
    meta: {
      datasets: datasets ?? SEARCH_DATASET_IDS,
      limit,
      ranking:
        'Deterministic: exact match on the primary field (4), prefix (3), substring (2), any secondary field (1); ties ordered by stable identifier.',
    },
  };
}

/** Cross-dataset search routes. */
export const searchRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/search',
    versioned: true,
    summary: 'Search every dataset at once (`q`, optional `datasets`, `limit` per dataset).',
    handler: search,
  },
];
