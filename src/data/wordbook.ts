/**
 * Access to the community-wordbook index.
 *
 * The upstream system <https://github.com/Iamdacai/ielts-vocab-system> is an
 * IELTS memorisation platform: a WeChat mini-program over a Node backend whose
 * core content is a Cambridge 1-18 wordbook and whose core method is an
 * Ebbinghaus spaced-repetition schedule (see `lib/srs.ts`). This module exposes
 * the derived index built by `scripts/extract_wordbook.py`: the headword list
 * with the volume attribution the upstream export claims, completeness counts,
 * a cross-validation against the Cambridge IELTS 1-22 list, and the audit
 * findings captured at the pinned commit.
 *
 * The upstream publishes no licence, so nothing but facts is republished: no
 * upstream definition, phonetic, example sentence or collocation is served.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { WordbookAudit, WordbookBookRow, WordbookItem, WordbookMeta, WordbookStats } from '../types.js';

/** Shape of `data/wordbook.json`. */
export type WordbookIndex = {
  meta: WordbookMeta;
  stats: WordbookStats;
  books: WordbookBookRow[];
  items: WordbookItem[];
  audit: WordbookAudit;
};

let cached: WordbookIndex | undefined;

/**
 * Return the wordbook index, loading it on first call.
 */
export function wordbook(): WordbookIndex {
  cached ??= loadDataset<WordbookIndex>('wordbook.json');
  return cached;
}

/** Index-level provenance metadata. */
export function wordbookMeta(): WordbookMeta {
  return wordbook().meta;
}

/** Aggregate statistics, including the cross-validation against Cambridge. */
export function wordbookStats(): WordbookStats {
  return wordbook().stats;
}

/** The per-volume cross-validation table. */
export function wordbookBooks(): WordbookBookRow[] {
  return wordbook().books;
}

/** Every indexed headword. */
export function wordbookItems(): readonly WordbookItem[] {
  return wordbook().items;
}

/** The data-quality and design audit of the upstream system. */
export function wordbookAudit(): WordbookAudit {
  return wordbook().audit;
}

/** Options accepted by {@link searchWordbook}. */
export type WordbookQuery = {
  /** Free-text search over the headword. */
  query?: string;
  /** Restrict to these upstream volume attributions (1-18). */
  books?: number[];
  /** Keep only rows shared with (or absent from) the Cambridge 1-22 list. */
  shared?: boolean;
  /** Restrict to rows whose claimed volume does/does not match the workbook. */
  agrees?: boolean;
  /** Sort key. */
  sort?: 'word' | 'book';
  /** Sort direction. */
  order?: 'asc' | 'desc';
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

const SORT_KEYS: Record<NonNullable<WordbookQuery['sort']>, (item: WordbookItem) => string | number> = {
  word: (item) => item.word,
  book: (item) => item.book,
};

/**
 * Search, filter and paginate the wordbook index.
 *
 * The dataset is stored sorted by headword then claimed volume, so the default
 * ordering needs no sort pass.
 *
 * @param options - Search options.
 * @returns A page of matching rows.
 */
export function searchWordbook(options: WordbookQuery): Page<WordbookItem> {
  const query = options.query ?? '';
  const books = options.books;
  const shared = options.shared;
  const agrees = options.agrees;
  const filtered = wordbookItems().filter((item) => {
    if (query.length > 0 && !matchesQuery([item.word, item.id], query)) {
      return false;
    }
    if (books !== undefined && books.length > 0 && !books.includes(item.book)) {
      return false;
    }
    if (shared !== undefined && item.shared !== shared) {
      return false;
    }
    if (agrees !== undefined && item.volumeAgrees !== agrees) {
      return false;
    }
    return true;
  });
  const order = options.order ?? 'asc';
  if (options.sort === undefined && order === 'asc') {
    return paginate(filtered, options.limit, options.offset);
  }
  const sortKey = SORT_KEYS[options.sort ?? 'word'];
  return paginate(sortBy(filtered, sortKey, order), options.limit, options.offset);
}
