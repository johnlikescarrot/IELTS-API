/**
 * Access to the speaking question-season structure.
 *
 * The upstream collection <https://github.com/Oxidaner/ielts> documents the
 * September-December 2025 speaking season with a classification deck (every
 * Part 2 cue card tagged by the four canonical content categories and by
 * rotation status) and a crowd question bank (Part 1 topic sets, Part 2 cards
 * with Part 3 follow-ups). `scripts/extract_speaking_bank.py` derives the
 * structure only - card titles act as identifiers, prompt texts and bullets
 * stay upstream - so researchers can study how the bank rotates without the
 * deck substituting for the source.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type {
  CardCategory,
  CardStatus,
  SpeakingBankCard,
  SpeakingCard,
  SpeakingPart1Topic,
} from '../types.js';

/** Shape of `data/speaking-bank.json`. */
export type SpeakingBankIndex = {
  meta: {
    name: string;
    repository: string;
    upstreamFiles: Record<string, string>;
    license: string;
    attribution: string;
    note: string;
  };
  season: {
    start: string;
    end: string;
    label: string;
    rotation: string;
  };
  stats: {
    deckCards: number;
    bankCards: number;
    titleMatches: number;
    byCategory: Record<CardCategory, number>;
    byStatus: Record<CardStatus, number>;
    part1Topics: number;
    part1Questions: number;
    part3FollowUps: number;
  };
  part1Topics: SpeakingPart1Topic[];
  part2Cards: SpeakingCard[];
  part2BankIndex: SpeakingBankCard[];
};

/** The parsed dataset. */
function index(): SpeakingBankIndex {
  return loadDataset<SpeakingBankIndex>('speaking-bank.json');
}

/** Content categories of the Part 2 cue cards. */
export const CARD_CATEGORIES: readonly CardCategory[] = ['person', 'object', 'event', 'place'];

/** Rotation statuses recorded by the upstream deck. */
export const CARD_STATUSES: readonly CardStatus[] = ['new', 'retained'];

/** Season window and rotation mechanics. */
export function season(): SpeakingBankIndex['season'] {
  return index().season;
}

/** Summary statistics of the season structure. */
export function speakingBankStats(): SpeakingBankIndex['stats'] {
  return index().stats;
}

/** Provenance metadata of the season structure. */
export function speakingBankMeta(): SpeakingBankIndex['meta'] {
  return index().meta;
}

/**
 * Return Part 1 topic sets, optionally searched by topic name.
 *
 * @param query - Free-text filter over topic names.
 */
export function part1Topics(query = ''): SpeakingPart1Topic[] {
  const topics = index().part1Topics;
  if (query.length === 0) {
    return [...topics];
  }
  return topics.filter((topic) => matchesQuery([topic.name], query));
}

/**
 * Return Part 2 cue cards, optionally filtered.
 *
 * @param options - Category, status and free-text filters.
 */
export function findSpeakingCards(options: {
  category?: CardCategory | undefined;
  status?: CardStatus | undefined;
  query?: string | undefined;
}): SpeakingCard[] {
  const { category, status, query = '' } = options;
  return index().part2Cards.filter((card) => {
    if (category !== undefined && card.category !== category) {
      return false;
    }
    if (status !== undefined && card.status !== status) {
      return false;
    }
    return query.length === 0 || matchesQuery([card.titleZh, card.promptLine], query);
  });
}

/**
 * Return one page of Part 2 cue cards.
 *
 * @param options - Filter, sort and pagination options.
 */
export function speakingCardsPage(options: {
  category?: CardCategory | undefined;
  status?: CardStatus | undefined;
  query?: string | undefined;
  sort?: 'id' | 'prompt' | undefined;
  order?: 'asc' | 'desc' | undefined;
  limit: number;
  offset: number;
}): Page<SpeakingCard> {
  const { sort = 'id', order = 'asc' } = options;
  const filtered = findSpeakingCards(options);
  const sorted = sortBy(
    filtered,
    (card) => (sort === 'prompt' ? card.promptLine.toLowerCase() : card.id),
    order,
  );
  return paginate(sorted, options.limit, options.offset);
}

/**
 * Find one Part 2 cue card by identifier.
 *
 * @param id - Card identifier.
 */
export function findSpeakingCard(id: string): SpeakingCard | undefined {
  return index().part2Cards.find((card) => card.id === id);
}

/**
 * Return the crowd bank's Part 2 index with Part 3 follow-up counts.
 *
 * @param query - Free-text filter over card titles.
 */
export function bankIndex(query = ''): SpeakingBankCard[] {
  const cards = index().part2BankIndex;
  if (query.length === 0) {
    return [...cards];
  }
  return cards.filter((card) => matchesQuery([card.titleZh, card.titleEn], query));
}
