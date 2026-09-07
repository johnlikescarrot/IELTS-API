/**
 * Access to the deployed word-bank concordance.
 *
 * The upstream <https://github.com/Iamdacai/ielts-vocab-system> is an
 * operational WeChat mini-program IELTS vocabulary-learning platform: an
 * Express/SQLite backend, a spaced-repetition review engine, an admin
 * statistics panel and AI-assisted speaking and writing practice, deployed
 * over HTTPS. Its live database materialises seven Chinese-market exam word
 * lists - IELTS, TOEFL, GRE, CET-4, CET-6, the postgraduate-entrance
 * examination and a general compilation - as 47,044 word rows over 15,930
 * distinct lower-cased headwords, alongside a verb/noun collocation bank and
 * seed Speaking and Writing prompt banks.
 *
 * This module exposes the machine-readable concordance built by
 * `scripts/extract_wordbanks.py`: bank inventories, cross-bank membership per
 * word, the pairwise overlap matrix, an original join against the Cambridge
 * IELTS 1-22 vocabulary of `/v1/vocabulary`, per-headword collocation counts,
 * the review engine's parameters (with deterministic next-interval and
 * mastery-update arithmetic), and the prompt banks.
 *
 * The upstream repository declares no licence, so only derived,
 * non-substitutive metadata is published: no definition, phonetic
 * transcription, example sentence, full collocation pair list or user record
 * is redistributed.
 */

import { loadDataset } from '../lib/dataset.js';
import { matchesAny, matchesFilter, matchesQuery, paginate, sortBy } from '../lib/search.js';
import { round2 } from '../lib/textstats.js';

import type { Page } from '../lib/search.js';
import type {
  Wordbank,
  WordbankCambridgeCoverage,
  WordbankCollocationHeadword,
  WordbankId,
  WordbankOverlap,
  WordbankReviewInterval,
  WordbankReviewModel,
  WordbankSpeakingTopic,
  WordbankStats,
  WordbankTopicItem,
  WordbankWord,
  WordbankWritingTopic,
  WordbanksIndex,
} from '../types.js';

/** Canonical bank order: IELTS first, then the learner's exam progression. */
export const WORDBANK_IDS: readonly WordbankId[] = [
  'ielts',
  'cet4',
  'cet6',
  'kaoyan',
  'toefl',
  'gre',
  'compilation',
];

/** The collocation categories of the deployed system. */
export const WORDBANK_COLLOCATION_CATEGORIES: readonly ('verb' | 'noun')[] = ['verb', 'noun'];

/** The writing task types of the prompt bank. */
export const WORDBANK_TASK_TYPES: readonly ('task1-academic' | 'task1-general' | 'task2')[] = [
  'task1-academic',
  'task1-general',
  'task2',
];

/** The difficulty vocabulary of the prompt banks. */
export const WORDBANK_DIFFICULTIES: readonly ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

/** Rank of each difficulty judgement, for sorting. */
const DIFFICULTY_RANK: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

/** Shape of `data/wordbanks.json`. */
type Index = WordbanksIndex;

let cached: Index | undefined;

/** Return the concordance, loading it on first call. */
export function wordbanks(): Index {
  cached ??= loadDataset<Index>('wordbanks.json');
  return cached;
}

/** Dataset metadata (provenance, licence, redistribution note). */
export function wordbanksMeta(): Index['meta'] {
  return wordbanks().meta;
}

/** Headline statistics of the concordance. */
export function wordbanksStats(): WordbankStats {
  return wordbanks().stats;
}

/** The seven bank inventories, in canonical order. */
export function wordbankBanks(): readonly Wordbank[] {
  return wordbanks().banks;
}

/** Find one bank by its identifier. */
export function findWordbank(id: string): Wordbank | undefined {
  return wordbanks().banks.find((bank) => bank.id === id);
}

/**
 * The pairwise overlap matrix, optionally restricted to pairs that involve
 * one bank.
 *
 * @param bank - Bank identifier; `undefined` returns all 21 pairs.
 */
export function wordbankOverlaps(bank?: WordbankId): readonly WordbankOverlap[] {
  const overlaps = wordbanks().overlaps;
  return bank === undefined ? overlaps : overlaps.filter((row) => row.a === bank || row.b === bank);
}

/** The original join of every bank against the Cambridge 1-22 vocabulary. */
export function wordbanksCambridge(): WordbankCambridgeCoverage {
  return wordbanks().cambridge;
}

/** The collocation headword aggregates, in sorted word order. */
export function wordbankCollocationHeadwords(): readonly WordbankCollocationHeadword[] {
  return wordbanks().collocations.headwords;
}

/** Aggregate statistics about the collocation bank. */
export function wordbankCollocationStats(): Index['collocations']['stats'] {
  return wordbanks().collocations.stats;
}

/** The deployed review engine, as verified parameters. */
export function wordbankReview(): WordbankReviewModel {
  return wordbanks().review;
}

/** The Speaking seed bank, sorted by (part, topic, question). */
export function wordbankSpeakingTopics(): readonly WordbankSpeakingTopic[] {
  return wordbanks().topics.speaking;
}

/** The Writing seed bank, sorted by (task type, topic, question). */
export function wordbankWritingTopics(): readonly WordbankWritingTopic[] {
  return wordbanks().topics.writing;
}

/** Both prompt banks as one skill-tagged collection, speaking first. */
export function wordbankTopics(): readonly WordbankTopicItem[] {
  return [
    ...wordbankSpeakingTopics().map((topic) => ({ ...topic, skill: 'speaking' as const })),
    ...wordbankWritingTopics().map((topic) => ({ ...topic, skill: 'writing' as const })),
  ];
}

/** The words of the concordance, in sorted word order. */
export function wordbankWords(): readonly WordbankWord[] {
  return wordbanks().words;
}

/**
 * Find one word of the concordance.
 *
 * @param word - Headword; matched case-insensitively against the stored
 *   lower-cased forms.
 */
export function findWordbankWord(word: string): WordbankWord | undefined {
  const key = word.toLowerCase();
  return wordbanks().words.find((entry) => entry.word === key);
}

/** Query options for the word search. */
export type WordbankWordsQuery = {
  /** Page size (1-100). */
  limit: number;
  /** Zero-based offset. */
  offset: number;
  /** Free-text query over the word and its identifier. */
  query: string;
  /** Bank filter (any-of); `undefined` disables it. */
  banks?: WordbankId[];
  /** Cambridge 1-22 membership filter; `undefined` disables it. */
  cambridge?: boolean;
  /** Collocation-headword filter; `undefined` disables it. */
  collocated?: boolean;
  /** Sort key. */
  sort?: 'word' | 'banks' | 'collocations';
  /** Sort direction. */
  order?: 'asc' | 'desc';
};

/**
 * Search the words of the concordance.
 *
 * Identical inputs produce byte-identical pages: the words are stored in
 * sorted order and every sort key is total or stable over that order.
 */
export function searchWordbankWords(options: WordbankWordsQuery): Page<WordbankWord> {
  const { limit, offset, query } = options;
  const sort = options.sort ?? 'word';
  const order = options.order ?? 'asc';
  const filtered = wordbanks().words.filter(
    (entry) =>
      matchesQuery([entry.id, entry.word], query) &&
      matchesAny(entry.banks, options.banks) &&
      (options.cambridge === undefined || entry.cambridge === options.cambridge) &&
      (options.collocated === undefined || (entry.collocations !== null) === options.collocated),
  );
  const key = (entry: WordbankWord): string | number => {
    switch (sort) {
      case 'banks':
        return entry.bankCount;
      case 'collocations':
        return entry.collocations ?? 0;
      default:
        return entry.word;
    }
  };
  return paginate(sortBy(filtered, key, order), limit, offset);
}

/** Query options for the collocation-headword search. */
export type WordbankCollocationsQuery = {
  /** Page size (1-100). */
  limit: number;
  /** Zero-based offset. */
  offset: number;
  /** Free-text query over the headword. */
  query: string;
  /** Bank filter (any-of); `undefined` disables it. */
  banks?: WordbankId[];
  /** Category filter; `undefined` disables it. */
  categories?: ('verb' | 'noun')[];
  /** Cambridge 1-22 membership filter; `undefined` disables it. */
  cambridge?: boolean;
  /** Sort key. */
  sort?: 'word' | 'partners';
  /** Sort direction. */
  order?: 'asc' | 'desc';
};

/**
 * Search the collocation headwords.
 *
 * Only per-headword aggregates are published: the full pair list of the
 * deployed system is not redistributed.
 */
export function searchWordbankCollocations(
  options: WordbankCollocationsQuery,
): Page<WordbankCollocationHeadword> {
  const { limit, offset, query } = options;
  const sort = options.sort ?? 'word';
  const order = options.order ?? 'asc';
  const filtered = wordbankCollocationHeadwords().filter(
    (head) =>
      matchesQuery([head.word], query) &&
      matchesAny(head.banks, options.banks) &&
      matchesFilter(head.category, options.categories) &&
      (options.cambridge === undefined || head.cambridge === options.cambridge),
  );
  const key = (head: WordbankCollocationHeadword): string | number => {
    switch (sort) {
      case 'partners':
        return head.partners;
      default:
        return head.word;
    }
  };
  return paginate(sortBy(filtered, key, order), limit, offset);
}

/** Query options for the prompt-bank search. */
export type WordbankTopicsQuery = {
  /** Page size (1-100). */
  limit: number;
  /** Zero-based offset. */
  offset: number;
  /** Free-text query over id, topic and question. */
  query: string;
  /** Skill filter; `undefined` disables it. */
  skill?: 'speaking' | 'writing';
  /** Speaking-part filter (speaking prompts only); `undefined` disables it. */
  part?: number;
  /** Writing task-type filter (writing prompts only); `undefined` disables it. */
  taskTypes?: ('task1-academic' | 'task1-general' | 'task2')[];
  /** Difficulty filter; `undefined` disables it. */
  difficulties?: ('easy' | 'medium' | 'hard')[];
  /** Sort key. */
  sort?: 'topic' | 'frequency' | 'difficulty';
  /** Sort direction. */
  order?: 'asc' | 'desc';
};

/** Query options for the prompt-bank search, after type narrowing. */
type TopicPredicate = (topic: WordbankTopicItem) => boolean;

/**
 * Search the system's Speaking and Writing prompt banks.
 *
 * Identical inputs produce byte-identical pages: the collection is stored in
 * (skill, part or task type, topic, question) order and every sort key is
 * total or stable over that order.
 */
export function searchWordbankTopics(options: WordbankTopicsQuery): Page<WordbankTopicItem> {
  const { limit, offset, query, part } = options;
  const sort = options.sort ?? 'topic';
  const order = options.order ?? 'asc';
  const predicates: TopicPredicate[] = [
    (topic) => matchesQuery([topic.id, topic.topic, topic.question], query),
    (topic) => options.skill === undefined || topic.skill === options.skill,
    (topic) => part === undefined || (topic.skill === 'speaking' && topic.part === part),
    (topic) =>
      options.taskTypes === undefined ||
      (topic.skill === 'writing' && options.taskTypes.includes(topic.taskType)),
    (topic) => matchesFilter(topic.difficulty, options.difficulties),
  ];
  const filtered = wordbankTopics().filter((topic) => predicates.every((predicate) => predicate(topic)));
  const key = (topic: WordbankTopicItem): string | number => {
    switch (sort) {
      case 'frequency':
        return topic.frequency;
      case 'difficulty':
        return DIFFICULTY_RANK[topic.difficulty];
      default:
        return topic.topic;
    }
  };
  return paginate(sortBy(filtered, key, order), limit, offset);
}

/** Distinct facet values of the prompt banks, sorted. */
export function wordbankTopicFacets(
  facet: 'skill' | 'part' | 'taskType' | 'difficulty' | 'chartType',
): string[] {
  const topics = wordbankTopics();
  switch (facet) {
    case 'skill':
      return [...new Set(topics.map((topic) => topic.skill))].sort();
    case 'part':
      return [...new Set(topics.filter(isSpeaking).map((topic) => String(topic.part)))].sort();
    case 'taskType':
      return [...new Set(topics.filter(isWriting).map((topic) => topic.taskType))].sort();
    case 'chartType':
      return [
        ...new Set(
          topics
            .filter(isWriting)
            .map((topic) => topic.chartType)
            .filter((value): value is string => value !== null),
        ),
      ].sort();
    default:
      return [...new Set(topics.map((topic) => topic.difficulty))].sort();
  }
}

/** Type guard narrowing a topic to the Speaking shape. */
function isSpeaking(topic: WordbankTopicItem): topic is WordbankSpeakingTopic & { skill: 'speaking' } {
  return topic.skill === 'speaking';
}

/** Type guard narrowing a topic to the Writing shape. */
function isWriting(topic: WordbankTopicItem): topic is WordbankWritingTopic & { skill: 'writing' } {
  return topic.skill === 'writing';
}

/** The interval ladder of the deployed review engine. */
export function reviewLadder(): readonly WordbankReviewInterval[] {
  return wordbankReview().intervals;
}

/** The next review interval for one word, as computed by the deployed engine.
 *
 * @param reviews - Review count already completed (0 = new word).
 * @param mastery - Mastery score 0-100, used once the ladder is exhausted.
 * @returns The interval in minutes, its ladder step and label, and whether it
 *   came from the dynamic rule.
 */
export function nextReviewInterval(
  reviews: number,
  mastery: number,
): { minutes: number; dynamic: boolean; step: number | null; label: string | null } {
  const ladder = reviewLadder();
  const interval = ladder[reviews];
  if (interval !== undefined) {
    return { minutes: interval.minutes, dynamic: false, step: reviews + 1, label: interval.label };
  }
  const base = wordbankReview().postBaseRule.baseMinutes;
  return { minutes: round2(base * (1 + mastery / 100)), dynamic: true, step: null, label: null };
}

/** The mastery score after one graded answer, per the deployed engine.
 *
 * @param current - Mastery score before the answer (0-100).
 * @param correct - Whether the answer was correct.
 * @param confidence - The learner's self-reported confidence (1-5).
 * @returns The applied change, the new score and whether it was clamped.
 */
export function masteryAfter(
  current: number,
  correct: boolean,
  confidence: number,
): { change: number; after: number; clamped: boolean } {
  const rule = wordbankReview().masteryRule;
  const change = correct ? rule.correctStep * confidence : rule.incorrectStep * confidence;
  const raw = current + change;
  const clamped = raw < rule.range[0] || raw > rule.range[1];
  const after = Math.max(rule.range[0], Math.min(rule.range[1], raw));
  return { change, after: round2(after), clamped };
}
