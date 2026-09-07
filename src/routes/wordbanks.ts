/**
 * Word-bank routes (`/v1/wordbanks`).
 *
 * The upstream repository declares no licence, so these routes publish
 * derived, non-substitutive metadata only: bank inventories, cross-bank
 * membership, the overlap matrix, the Cambridge coverage join, per-headword
 * collocation counts, the review engine's parameters and the prompt-bank
 * metadata. No definition, phonetic transcription, example sentence, full
 * collocation pair list or user record is served.
 */

import {
  WORDBANK_COLLOCATION_CATEGORIES,
  WORDBANK_DIFFICULTIES,
  WORDBANK_IDS,
  WORDBANK_TASK_TYPES,
  findWordbank,
  findWordbankWord,
  masteryAfter,
  nextReviewInterval,
  reviewLadder,
  searchWordbankCollocations,
  searchWordbankTopics,
  searchWordbankWords,
  wordbankBanks,
  wordbankCollocationStats,
  wordbankOverlaps,
  wordbankReview,
  wordbankTopicFacets,
  wordbanksCambridge,
  wordbanksMeta,
  wordbanksStats,
} from '../data/wordbanks.js';
import { badRequest, notFound } from '../lib/errors.js';
import { parseList } from '../lib/search.js';
import { getBoolean, getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { WordbankId, WordbankOverlap, WordbankReviewInterval, WordbankReviewModel } from '../types.js';

const WORD_SORT_KEYS = ['word', 'banks', 'collocations'] as const;
const COLLOCATION_SORT_KEYS = ['word', 'partners'] as const;
const TOPIC_SORT_KEYS = ['topic', 'frequency', 'difficulty'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Facet values for the prompt banks, for response metadata. */
function topicFacetsView(): Record<string, string[]> {
  return {
    skill: wordbankTopicFacets('skill'),
    part: wordbankTopicFacets('part'),
    taskType: wordbankTopicFacets('taskType'),
    difficulty: wordbankTopicFacets('difficulty'),
    chartType: wordbankTopicFacets('chartType'),
  };
}

/** Concordance provenance and headline statistics. */
function index(): HandlerResult {
  return {
    data: { meta: wordbanksMeta(), stats: wordbanksStats() },
    meta: {
      banks: wordbankBanks().length,
      words: wordbanksStats().distinctWords,
      note: wordbanksMeta().note,
    },
  };
}

/** The seven bank inventories. */
function banks(): HandlerResult {
  return {
    data: wordbankBanks(),
    meta: {
      count: wordbankBanks().length,
      note: wordbanksMeta().note,
    },
  };
}

/** One bank, with its overlap profile against every other bank. */
function bank(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findWordbank(id);
  if (found === undefined) {
    throw notFound(`No word bank with id "${id}" in the concordance.`, { id });
  }
  const overlaps = wordbankOverlaps(found.id).map((row) => overlapFrom(found.id, row));
  return {
    data: { ...found, overlaps },
    meta: {
      comparedWith: overlaps.length,
      repository: wordbanksMeta().repository,
      license: wordbanksMeta().license,
      note: wordbanksMeta().note,
    },
  };
}

/** Reframe one overlap row from the perspective of one bank. */
function overlapFrom(
  bank: WordbankId,
  row: WordbankOverlap,
): {
  other: WordbankId;
  intersection: number;
  union: number;
  jaccard: number;
  shareOfThis: number;
  shareOfOther: number;
} {
  return {
    other: row.a === bank ? row.b : row.a,
    intersection: row.intersection,
    union: row.union,
    jaccard: row.jaccard,
    shareOfThis: row.a === bank ? row.shareOfA : row.shareOfB,
    shareOfOther: row.a === bank ? row.shareOfB : row.shareOfA,
  };
}

/** The pairwise overlap matrix, optionally restricted to one bank. */
function overlaps(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const bank = getEnum(params, 'bank', WORDBANK_IDS);
  const rows = wordbankOverlaps(bank);
  return {
    data: rows,
    meta: {
      count: rows.length,
      bank: bank ?? null,
      note: 'One row per unordered bank pair; shares are rounded to four decimals. The two identical banks are reported in stats.identicalBankPairs.',
    },
  };
}

/** The original join against the Cambridge IELTS 1-22 vocabulary. */
function cambridge(): HandlerResult {
  return {
    data: wordbanksCambridge(),
    meta: { note: wordbanksCambridge().note },
  };
}

/** Search the words of the concordance. */
function words(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 20000, 0);
  const sort = getEnum(params, 'sort', WORD_SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const banksFilter = parseList(getString(params, 'bank'), 'bank', WORDBANK_IDS) as WordbankId[] | undefined;
  const cambridge = getBoolean(params, 'cambridge', true);
  const cambridgeFilter = getString(params, 'cambridge') === undefined ? undefined : cambridge;
  const collocated = getBoolean(params, 'collocated', true);
  const collocatedFilter = getString(params, 'collocated') === undefined ? undefined : collocated;

  const page = searchWordbankWords({
    limit,
    offset,
    query,
    ...(banksFilter === undefined ? {} : { banks: banksFilter }),
    ...(cambridgeFilter === undefined ? {} : { cambridge: cambridgeFilter }),
    ...(collocatedFilter === undefined ? {} : { collocated: collocatedFilter }),
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
      query: query.length > 0 ? query : null,
      sort: sort ?? 'word',
      order: order ?? 'asc',
      banks: [...WORDBANK_IDS],
      note: 'Bank filters use any-of semantics; `cambridge` and `collocated` accept boolean values. See RESEARCH.md Part VIII.',
    },
  };
}

/** One word of the concordance. */
function word(context: RouteContext): HandlerResult {
  const term = context.params['word'] as string;
  const found = findWordbankWord(term);
  if (found === undefined) {
    throw notFound(`No word "${term}" in the word-bank concordance.`, { word: term });
  }
  return {
    data: found,
    meta: {
      repository: wordbanksMeta().repository,
      license: wordbanksMeta().license,
      note: wordbanksMeta().note,
    },
  };
}

/** Search the collocation headword aggregates. */
function collocations(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', COLLOCATION_SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const banksFilter = parseList(getString(params, 'bank'), 'bank', WORDBANK_IDS) as WordbankId[] | undefined;
  const categories = parseList(getString(params, 'category'), 'category', WORDBANK_COLLOCATION_CATEGORIES) as
    ('verb' | 'noun')[] | undefined;
  const cambridge = getBoolean(params, 'cambridge', true);
  const cambridgeFilter = getString(params, 'cambridge') === undefined ? undefined : cambridge;

  const page = searchWordbankCollocations({
    limit,
    offset,
    query,
    ...(banksFilter === undefined ? {} : { banks: banksFilter }),
    ...(categories === undefined ? {} : { categories }),
    ...(cambridgeFilter === undefined ? {} : { cambridge: cambridgeFilter }),
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
      query: query.length > 0 ? query : null,
      sort: sort ?? 'word',
      order: order ?? 'asc',
      stats: wordbankCollocationStats(),
      note: wordbankCollocationStats().note,
    },
  };
}

/** The deployed review engine, with optional deterministic computation. */
function review(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const reviews = getInt(params, 'reviews', 0, 30, -1);
  const mastery = getInt(params, 'mastery', 0, 100, -1);
  const confidence = getInt(params, 'confidence', 1, 5, 0);
  const hasCorrect = getString(params, 'correct') !== undefined;
  const hasConfidence = getString(params, 'confidence') !== undefined;
  const correct = getBoolean(params, 'correct', false);

  if (hasConfidence && !hasCorrect) {
    throw badRequest('Parameter "confidence" requires "correct".', { parameter: 'confidence' });
  }
  if (hasCorrect && (!hasConfidence || mastery < 0)) {
    throw badRequest('Parameter "correct" requires "mastery" and "confidence".', {
      parameter: 'correct',
    });
  }
  if (mastery >= 0 && reviews < 0 && !hasCorrect) {
    throw badRequest('Parameter "mastery" requires "reviews" or "correct".', {
      parameter: 'mastery',
    });
  }

  const model = wordbankReview();
  const data: {
    model: WordbankReviewModel;
    ladder: readonly WordbankReviewInterval[];
    schedule?: {
      reviews: number;
      mastery: number;
      next: {
        step: number | null;
        intervalMinutes: number;
        dynamic: boolean;
        description: string;
      };
    };
    masteryUpdate?: {
      before: number;
      correct: boolean;
      confidence: number;
      change: number;
      after: number;
      clamped: boolean;
    };
  } = { model, ladder: reviewLadder() };

  if (reviews >= 0) {
    const masteryUsed = mastery < 0 ? 0 : mastery;
    const next = nextReviewInterval(reviews, masteryUsed);
    data.schedule = {
      reviews,
      mastery: masteryUsed,
      next: {
        step: next.step,
        intervalMinutes: next.minutes,
        dynamic: next.dynamic,
        description: next.label ?? `${model.postBaseRule.baseMinutes} minutes x (1 + ${masteryUsed} / 100)`,
      },
    };
  }
  if (hasCorrect) {
    const update = masteryAfter(mastery, correct, confidence);
    data.masteryUpdate = {
      before: mastery,
      correct,
      confidence,
      change: update.change,
      after: update.after,
      clamped: update.clamped,
    };
  }
  return {
    data,
    meta: {
      note: 'All intervals are relative (minutes from the answer); the engine stores no absolute times, so responses stay deterministic.',
    },
  };
}

/** Search the system's Speaking and Writing prompt banks. */
function topics(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 100, 0);
  const sort = getEnum(params, 'sort', TOPIC_SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skill = getEnum(params, 'skill', ['speaking', 'writing'] as const);
  const part = getInt(params, 'part', 1, 3, 0);
  const taskTypes = parseList(getString(params, 'taskType'), 'taskType', WORDBANK_TASK_TYPES) as
    ('task1-academic' | 'task1-general' | 'task2')[] | undefined;
  const difficulties = parseList(getString(params, 'difficulty'), 'difficulty', WORDBANK_DIFFICULTIES) as
    ('easy' | 'medium' | 'hard')[] | undefined;

  const page = searchWordbankTopics({
    limit,
    offset,
    query,
    ...(skill === undefined ? {} : { skill }),
    ...(part === 0 ? {} : { part }),
    ...(taskTypes === undefined ? {} : { taskTypes }),
    ...(difficulties === undefined ? {} : { difficulties }),
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
      query: query.length > 0 ? query : null,
      sort: sort ?? 'topic',
      order: order ?? 'asc',
      facets: topicFacetsView(),
      note: '`frequency` is the system\u2019s own estimated test-occurrence rating, in percent; prompts are metadata only, sample answers are not published.',
    },
  };
}

export const wordbankRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/wordbanks',
    versioned: true,
    summary: 'Provenance and headline statistics for the deployed word-bank concordance.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/banks',
    versioned: true,
    summary: 'The seven exam word banks materialised by the deployed learning system.',
    handler: banks,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/banks/:id',
    versioned: true,
    summary: 'One word bank, with its overlap profile against every other bank.',
    handler: bank,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/overlaps',
    versioned: true,
    summary: 'The pairwise bank overlap matrix (intersection, union, Jaccard, containment), optional `bank`.',
    handler: overlaps,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/cambridge',
    versioned: true,
    summary: 'The join of every bank against the Cambridge IELTS 1-22 vocabulary of /v1/vocabulary.',
    handler: cambridge,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/words',
    versioned: true,
    summary:
      'Search the concordance by word, bank membership, Cambridge headword status or collocation headword status.',
    handler: words,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/words/:word',
    versioned: true,
    summary: 'One word: its bank memberships, collocation partner count and Cambridge cross-reference.',
    handler: word,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/collocations',
    versioned: true,
    summary: 'Per-headword collocation aggregates (`category`, `bank`, `cambridge`, `sort`, `order`).',
    handler: collocations,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/review',
    versioned: true,
    summary:
      'The deployed Ebbinghaus review engine: intervals, mastery rule and review window, with optional deterministic computation (`reviews`, `mastery`, `correct`, `confidence`).',
    handler: review,
  },
  {
    method: 'GET',
    path: '/v1/wordbanks/topics',
    versioned: true,
    summary:
      'Search the system\u2019s Speaking and Writing prompt banks by skill, part, task type or difficulty.',
    handler: topics,
  },
];
