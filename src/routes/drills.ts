/**
 * Vocabulary drill routes (`/v1/drills`).
 *
 * The generators are deterministic functions of a seed plus the published
 * vocabulary dataset — no randomness without a seed, no state between
 * requests — so a paper can report the exact item set it used by quoting the
 * request URL.
 */

import { PARTS_OF_SPEECH } from '../data/vocabulary.js';
import { generateClozeItems, generateMatchingSet } from '../lib/drills.js';
import { badRequest } from '../lib/errors.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { QueryParams } from '../types.js';
import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';

/** Parse a comma-separated list of Cambridge IELTS volume numbers. */
function parseVolumes(raw: string | undefined): number[] | undefined {
  const tokens = parseList(raw, 'volume');
  if (tokens === undefined) {
    return undefined;
  }
  return tokens.map((token) => {
    const volume = /^\d{1,2}$/.test(token) ? Number.parseInt(token, 10) : Number.NaN;
    if (!Number.isInteger(volume) || volume < 1 || volume > 22) {
      throw badRequest('Parameter "volume" must list volumes between 1 and 22.', {
        parameter: 'volume',
        received: token,
      });
    }
    return volume;
  });
}

/** Read the shared `seed` parameter, defaulting to today's date. */
function seedOf(params: QueryParams, prefix: string): string {
  return getString(params, 'seed') ?? `${prefix}:${new Date().toISOString().slice(0, 10)}`;
}

/** Multiple-choice definition cloze. */
function cloze(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 1, 20, 5);
  const optionCount = getInt(params, 'options', 2, 6, 4);
  const seed = seedOf(params, 'cloze');
  const partOfSpeech = getEnum(params, 'pos', PARTS_OF_SPEECH);
  const volumes = parseVolumes(getString(params, 'volume'));

  const { items, pool } = generateClozeItems({
    seed,
    count,
    optionCount,
    ...(partOfSpeech === undefined ? {} : { partOfSpeech }),
    ...(volumes === undefined ? {} : { volumes }),
  });
  return {
    data: items,
    meta: {
      seed,
      requested: count,
      generated: items.length,
      pool,
      optionCount,
      partOfSpeech: partOfSpeech ?? null,
      volume: volumes ?? null,
      answerKeyIncluded: true,
      method:
        'The target headword is blanked from its own gloss; distractors are same-part-of-speech headwords drawn from the whole dataset that never occur as tokens in the item text.',
      determinism: "Identical seeds return identical items; the default seed is today's ISO date.",
    },
  };
}

/** Word-definition matching set. */
function matching(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const count = getInt(params, 'count', 2, 10, 4);
  const seed = seedOf(params, 'matching');
  const { set, pool } = generateMatchingSet({ seed, count });
  return {
    data: set,
    meta: {
      seed,
      requested: count,
      pairs: set.words.length,
      pool,
      answerKeyIncluded: true,
      method:
        'Words keep dataset order; definitions are presented in seeded shuffled order. Gloss texts are unique, so each word has exactly one valid match.',
      determinism: "Identical seeds return identical sets; the default seed is today's ISO date.",
    },
  };
}

/** Vocabulary-drill routes. */
export const drillRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/drills/cloze',
    versioned: true,
    summary: 'Seeded multiple-choice definition cloze items generated from the Cambridge glosses.',
    handler: cloze,
  },
  {
    method: 'GET',
    path: '/v1/drills/matching',
    versioned: true,
    summary: 'Seeded word-to-definition matching set with an exact, unique solution.',
    handler: matching,
  },
];
