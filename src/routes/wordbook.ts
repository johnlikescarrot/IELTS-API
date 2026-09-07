/**
 * Community-wordbook routes (`/v1/wordbook`).
 *
 * A derived index of the Cambridge 1-18 wordbook shipped by
 * `Iamdacai/ielts-vocab-system`, cross-validated against this API's own
 * Cambridge 1-22 list, plus the data-quality audit of the upstream system.
 * Only headwords, attributions and statistics are served; the upstream
 * definitions are never redistributed.
 */

import { badRequest } from '../lib/errors.js';
import { getBoolean, getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';
import {
  searchWordbook,
  wordbookAudit,
  wordbookBooks,
  wordbookMeta,
  wordbookStats,
} from '../data/wordbook.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

const SORT_KEYS = ['word', 'book'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Parse a comma-separated list of Cambridge volume numbers (1-18). */
function parseBooks(raw: string | undefined): number[] | undefined {
  const tokens = parseList(raw, 'book');
  if (tokens === undefined) {
    return undefined;
  }
  return tokens.map((token) => {
    const book = /^\d{1,2}$/.test(token) ? Number.parseInt(token, 10) : Number.NaN;
    if (!Number.isInteger(book) || book < 1 || book > 18) {
      throw badRequest('Parameter "book" must list Cambridge volumes between 1 and 18.', {
        parameter: 'book',
        received: token,
      });
    }
    return book;
  });
}

/** Provenance, statistics and the per-volume cross-validation table. */
function index(): HandlerResult {
  const meta = wordbookMeta();
  return {
    data: { meta, stats: wordbookStats(), books: wordbookBooks() },
    meta: {
      rows: wordbookStats().rows,
      note: meta.note,
    },
  };
}

/** Search the headword index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q');
  const books = parseBooks(getString(params, 'book'));
  const shared = params['shared'] === undefined ? undefined : getBoolean(params, 'shared', true);
  const agrees = params['agrees'] === undefined ? undefined : getBoolean(params, 'agrees', true);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100000, 0);

  const page = searchWordbook({
    limit,
    offset,
    ...(query === undefined ? {} : { query }),
    ...(books === undefined ? {} : { books }),
    ...(shared === undefined ? {} : { shared }),
    ...(agrees === undefined ? {} : { agrees }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query ?? null,
      book: books ?? null,
      shared: shared ?? null,
      agrees: agrees ?? null,
      sort: sort ?? 'word',
      order: order ?? 'asc',
      note: wordbookMeta().note,
    },
  };
}

/** Statistics only. */
function stats(): HandlerResult {
  return { data: wordbookStats() };
}

/** The per-volume cross-validation table. */
function books(): HandlerResult {
  const rows = wordbookBooks();
  return {
    data: rows,
    meta: {
      count: rows.length,
      sharedTotal: rows.reduce((sum, row) => sum + row.sharedInBook, 0),
      agreementTotal: rows.reduce((sum, row) => sum + row.agreesWithVolume, 0),
      caveat:
        'The wordbook columns reproduce the upstream cambridge_book attribution, which the source workbook mostly contradicts: sharedInBook counts words the upstream assigns to the volume that are also in the Cambridge 1-22 list, agreesWithVolume counts those the workbook also lists in that volume.',
    },
  };
}

/** The data-quality audit of the upstream system. */
function audit(): HandlerResult {
  const value = wordbookAudit();
  return {
    data: value,
    meta: {
      count: value.findings.length,
      repository: wordbookMeta().repository,
      commit: wordbookMeta().commit,
      method: value.method,
    },
  };
}

/** Community-wordbook routes. */
export const wordbookRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/wordbook',
    versioned: true,
    summary:
      'Provenance, statistics and the per-volume cross-validation table for the community Cambridge 1-18 wordbook.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/wordbook/items',
    versioned: true,
    summary: 'Search the wordbook headword index (`book`, `shared`, `agrees`, `q`).',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/wordbook/stats',
    versioned: true,
    summary: 'Wordbook statistics, completeness counts and the cross-validation summary.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/wordbook/books',
    versioned: true,
    summary: 'Per-volume cross-validation against the Cambridge IELTS 1-22 word lists.',
    handler: books,
  },
  {
    method: 'GET',
    path: '/v1/wordbook/audit',
    versioned: true,
    summary: 'Data-quality audit of the upstream memorisation system, with pinned evidence.',
    handler: audit,
  },
];
