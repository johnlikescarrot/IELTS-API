/**
 * Vocabulary-coverage analysis.
 *
 * When a candidate pastes an essay or a transcript, the interesting question
 * is how its vocabulary maps onto the 4,174 headwords published in the
 * Cambridge IELTS volumes 1-22 word lists. Coverage is reported on three
 * disjoint tiers:
 *
 * - `cross-volume`: headwords that recur across at least two Cambridge
 *   volumes (133 words; the demonstrably recurring exam vocabulary),
 * - `single-volume`: headwords listed for exactly one volume (4,041 words),
 * - `out-of-list`: tokens matched by no headword.
 *
 * Matching is case-insensitive and accent-insensitive but form-exact: no
 * stemming or lemmatisation is applied, so `governments` matches only if the
 * inflected form itself is a published headword. `RESEARCH.md` Part III
 * discusses this deliberate trade-off.
 */

import { allEntries } from './vocabulary.js';
import { normalizeToken, round4 } from '../lib/textMetrics.js';

import type {
  VocabularyCoverage,
  VocabularyTierExport,
  VocabularyTierName,
  WordFrequency,
} from '../types.js';

/** A headword listed for at least this many volumes counts as `cross-volume`. */
export const CROSS_VOLUME_MIN_VOLUMES = 2;

/** Maximum number of out-of-list words returned, most frequent first. */
export const MAX_OUT_OF_LIST_WORDS = 10;

/** Tier definitions exposed by the analysis reference, in reading order. */
export const VOCABULARY_TIERS: readonly VocabularyTierExport[] = [
  {
    tier: 'cross-volume',
    description: `Headwords listed in at least ${CROSS_VOLUME_MIN_VOLUMES} Cambridge IELTS volumes.`,
  },
  { tier: 'single-volume', description: 'Headwords listed for exactly one Cambridge IELTS volume.' },
  { tier: 'out-of-list', description: 'Tokens that match no Cambridge IELTS headword.' },
];

let volumeIndex: Map<string, number> | undefined;

/** Normalised headword -> number of Cambridge volumes it is listed in. */
function indexByWord(): Map<string, number> {
  if (volumeIndex === undefined) {
    volumeIndex = new Map<string, number>();
    for (const entry of allEntries()) {
      volumeIndex.set(normalizeToken(entry.word), entry.volumes.length);
    }
  }
  return volumeIndex;
}

/**
 * Classify one normalised token against the Cambridge IELTS vocabulary.
 *
 * @param token - Normalised token (see `normalizeToken` in `lib/textMetrics.ts`).
 */
export function tierForToken(token: string): VocabularyTierName {
  const volumes = indexByWord().get(token);
  if (volumes === undefined) {
    return 'out-of-list';
  }
  return volumes >= CROSS_VOLUME_MIN_VOLUMES ? 'cross-volume' : 'single-volume';
}

/**
 * Compute the vocabulary-coverage profile of a token sequence.
 *
 * @param tokens - Normalised tokens (see `normalizeToken` in `lib/textMetrics.ts`).
 * @param topOutOfList - How many out-of-list words to list, most frequent first
 *   (ties broken alphabetically for determinism). Defaults to
 *   {@link MAX_OUT_OF_LIST_WORDS}.
 */
export function vocabularyCoverage(
  tokens: readonly string[],
  topOutOfList: number = MAX_OUT_OF_LIST_WORDS,
): VocabularyCoverage {
  const tokensByTier: Record<VocabularyTierName, number> = {
    'cross-volume': 0,
    'single-volume': 0,
    'out-of-list': 0,
  };
  const typesByTier: Record<VocabularyTierName, Set<string>> = {
    'cross-volume': new Set<string>(),
    'single-volume': new Set<string>(),
    'out-of-list': new Set<string>(),
  };
  const outFrequencies = new Map<string, number>();

  for (const token of tokens) {
    const tier = tierForToken(token);
    tokensByTier[tier] += 1;
    typesByTier[tier].add(token);
    if (tier === 'out-of-list') {
      outFrequencies.set(token, (outFrequencies.get(token) ?? 0) + 1);
    }
  }

  const total = tokens.length;
  const tiers = VOCABULARY_TIERS.map(({ tier, description }) => {
    const words = tokensByTier[tier];
    return {
      tier,
      description,
      words,
      unique: typesByTier[tier].size,
      share: total === 0 ? 0 : round4(words / total),
    };
  });

  const inList = total - tokensByTier['out-of-list'];
  const topOutOfListWords: WordFrequency[] = [...outFrequencies.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topOutOfList)
    .map(([word, count]) => ({ word, count }));

  return {
    totalWords: total,
    uniqueWords:
      typesByTier['cross-volume'].size + typesByTier['single-volume'].size + typesByTier['out-of-list'].size,
    coverage: total === 0 ? 0 : round4(inList / total),
    tiers,
    topOutOfList: topOutOfListWords,
  };
}
