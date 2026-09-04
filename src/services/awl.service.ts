/**
 * Academic Word List service: sublist browsing, word lookup, search and
 * seeded random selection.
 */

import {
  AWL_ENTRIES,
  AWL_INDEX,
  AWL_SOURCE,
  SUBLIST_COUNT,
  getSublistWords,
  type AwlEntry
} from '../data/academic-word-list.js';
import { NotFoundError } from '../lib/errors.js';
import { createRng, sample } from '../lib/random.js';

export interface SublistSummary {
  readonly sublist: number;
  readonly wordCount: number;
}

export interface AwlWord {
  readonly word: string;
  readonly sublist: number;
  readonly indexInSublist: number;
  readonly globalIndex: number;
}

export interface AwlWordDetail extends AwlWord {
  readonly source: typeof AWL_SOURCE;
}

function toWord(entry: AwlEntry, globalIndex: number): AwlWord {
  return {
    word: entry.word,
    sublist: entry.sublist,
    indexInSublist: getSublistWords(entry.sublist).indexOf(entry.word) + 1,
    globalIndex
  };
}

export function listSublists(): readonly SublistSummary[] {
  const summaries: SublistSummary[] = [];
  for (let sublist = 1; sublist <= SUBLIST_COUNT; sublist++) {
    summaries.push({ sublist, wordCount: getSublistWords(sublist).length });
  }
  return summaries;
}

export function getSublist(sublist: number): readonly AwlWord[] {
  if (!Number.isInteger(sublist) || sublist < 1 || sublist > SUBLIST_COUNT) {
    throw new NotFoundError('Sublist', String(sublist));
  }
  const entries = AWL_ENTRIES.filter((entry) => entry.sublist === sublist);
  return entries.map((entry) => {
    const globalIndex = AWL_ENTRIES.indexOf(entry) + 1;
    return toWord(entry, globalIndex);
  });
}

export function getWord(word: string): AwlWordDetail | null {
  const entry = AWL_INDEX.get(word.toLowerCase());
  if (entry === undefined) {
    return null;
  }
  const globalIndex = AWL_ENTRIES.indexOf(entry) + 1;
  return { ...toWord(entry, globalIndex), source: AWL_SOURCE };
}

export function searchWords(query: string, limit: number): readonly AwlWord[] {
  const needle = query.toLowerCase();
  const startsWith: AwlWord[] = [];
  const contains: AwlWord[] = [];
  AWL_ENTRIES.forEach((entry, index) => {
    const word = toWord(entry, index + 1);
    if (entry.word.startsWith(needle)) {
      startsWith.push(word);
    } else if (entry.word.includes(needle)) {
      contains.push(word);
    }
  });
  return [...startsWith, ...contains].slice(0, limit);
}

export interface RandomWordsOptions {
  readonly count: number;
  readonly sublist?: number | undefined;
  readonly seed?: string | undefined;
}

export function randomWords(options: RandomWordsOptions): readonly AwlWord[] {
  const pool =
    options.sublist === undefined
      ? AWL_ENTRIES.map((entry, index) => toWord(entry, index + 1))
      : getSublist(options.sublist);
  const rng = createRng(options.seed);
  return sample(pool, options.count, rng);
}
