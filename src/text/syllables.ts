/**
 * A deterministic English syllable estimator.
 *
 * Syllable counts feed the Flesch family of readability formulas. Dictionary
 * lookup is not available in a dependency-free package, so this module uses the
 * classical vowel-group heuristic with the usual corrections for silent `e`,
 * common suffixes and vowel digraphs. The heuristic is documented, stable and
 * therefore reproducible, which matters more for comparative research than
 * absolute accuracy on rare words.
 *
 * @packageDocumentation
 */

const VOWEL_GROUP = /[aeiouy]+/g;

/** Matches a word-final syllabic `-le` such as "little", which is not silent. */
const SYLLABIC_LE = /[^aeiouy]le$/;

/** Endings that add a syllable despite the vowel-group heuristic. */
const EXTRA_SYLLABLE_ENDINGS = [
  "ia",
  "riet",
  "dien",
  "iu",
  "io",
  "ii",
  "ual",
  "ism",
];

/** Words whose heuristic count is known to be wrong. */
const OVERRIDES: ReadonlyMap<string, number> = new Map([
  ["the", 1],
  ["a", 1],
  ["i", 1],
  ["business", 2],
  ["people", 2],
  ["every", 3],
  ["different", 3],
  ["evening", 2],
  ["interesting", 4],
  ["comfortable", 4],
  ["society", 4],
  ["area", 3],
  ["idea", 3],
  ["being", 2],
  ["queue", 1],
]);

/**
 * Estimates the number of syllables in a single English word.
 *
 * @param word - A word token; case and surrounding punctuation are ignored.
 * @returns At least `1` for any word containing a letter, otherwise `0`.
 */
export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) {
    return 0;
  }

  const override = OVERRIDES.get(cleaned);
  if (override !== undefined) {
    return override;
  }

  let working = cleaned;
  if (working.endsWith("e") && !SYLLABIC_LE.test(working)) {
    working = working.slice(0, -1);
  }

  VOWEL_GROUP.lastIndex = 0;
  const groups = working.match(VOWEL_GROUP);
  let count = groups === null ? 0 : groups.length;

  for (const ending of EXTRA_SYLLABLE_ENDINGS) {
    if (cleaned.endsWith(ending)) {
      count += 1;
      break;
    }
  }

  return Math.max(1, count);
}

/**
 * Sums {@link countSyllables} across a token list.
 *
 * @param tokens - Word tokens.
 */
export function totalSyllables(tokens: readonly string[]): number {
  return tokens.reduce((sum, token) => sum + countSyllables(token), 0);
}

/**
 * Counts tokens with three or more syllables, the "complex word" definition
 * used by the Gunning fog index.
 *
 * @param tokens - Word tokens.
 */
export function countPolysyllabic(tokens: readonly string[]): number {
  return tokens.filter((token) => countSyllables(token) >= 3).length;
}
