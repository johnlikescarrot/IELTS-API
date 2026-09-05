/**
 * Lexical diversity and Cambridge-vocabulary coverage.
 *
 * Lexical resource is one of the four analytic criteria IELTS examiners award,
 * and it is the criterion most amenable to measurement. This module reports
 * three families of evidence:
 *
 * 1. **Diversity** — type/token ratio and its length-corrected variants. Raw
 *    TTR falls as a text grows, so it cannot be compared across texts of
 *    different lengths; root TTR (Guiraud) and corrected TTR (Carroll) are
 *    reported alongside it, and a moving-average TTR is used for the
 *    length-robust figure.
 * 2. **Coverage** — how much of the text is drawn from the Cambridge IELTS
 *    1-22 headword list served by this API, which grounds the measure in the
 *    same corpus the rest of the API publishes.
 * 3. **Repetition** — the most frequent content words, which is what an
 *    examiner notices when lexical range is narrow.
 *
 * References:
 *
 * - Guiraud, P. (1960). *Problèmes et méthodes de la statistique linguistique*.
 * - Carroll, J. B. (1964). *Language and Thought*.
 * - Covington, M. A., & McFall, J. D. (2010). Cutting the Gordian knot: the
 *   moving-average type-token ratio (MATTR). *Journal of Quantitative
 *   Linguistics*, 17(2), 94-100.
 */

import { round, tokenizeWords } from './text.js';

/**
 * Function words excluded from the "frequent content word" report.
 *
 * The list is intentionally short and closed-class only: articles, pronouns,
 * auxiliaries, prepositions and conjunctions. Excluding them is what makes
 * repetition of *content* visible.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'now',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'ought',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
]);

/** Window size used for the moving-average type-token ratio. */
export const MATTR_WINDOW = 50;

/**
 * Moving-average type-token ratio (Covington & McFall, 2010).
 *
 * TTR is computed in a sliding window of fixed size and averaged, which makes
 * the figure comparable between texts of different lengths. When the text is
 * shorter than the window, plain TTR is returned.
 *
 * @param tokens - Word tokens in document order.
 * @param window - Window size.
 * @returns The MATTR in `[0, 1]`, or `0` for empty input.
 */
export function movingAverageTtr(tokens: readonly string[], window: number = MATTR_WINDOW): number {
  if (tokens.length === 0) {
    return 0;
  }
  if (tokens.length <= window) {
    return new Set(tokens).size / tokens.length;
  }
  let total = 0;
  const windows = tokens.length - window + 1;
  for (let start = 0; start < windows; start += 1) {
    total += new Set(tokens.slice(start, start + window)).size / window;
  }
  return total / windows;
}

/** One frequently repeated content word. */
export type WordFrequency = {
  /** The word. */
  word: string;
  /** Number of occurrences. */
  count: number;
  /** Share of all word tokens, as a fraction. */
  ratio: number;
};

/**
 * Rank content words by frequency.
 *
 * Ties are broken alphabetically so the output is deterministic.
 *
 * @param tokens - Word tokens.
 * @param top - How many entries to return.
 * @returns The most frequent non-stop words.
 */
export function frequentWords(tokens: readonly string[], top: number): WordFrequency[] {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token) || token.length < 3) {
      continue;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const total = Math.max(tokens.length, 1);
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count, ratio: round(count / total, 4) }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, top);
}

/** The lexical report for one text. */
export type LexicalReport = {
  /** Word tokens. */
  tokens: number;
  /** Distinct word types. */
  types: number;
  /** Type/token ratio (length-sensitive). */
  typeTokenRatio: number;
  /** Root TTR, `types / sqrt(tokens)` (Guiraud, 1960). */
  rootTypeTokenRatio: number;
  /** Corrected TTR, `types / sqrt(2 * tokens)` (Carroll, 1964). */
  correctedTypeTokenRatio: number;
  /** Moving-average TTR (Covington & McFall, 2010). */
  movingAverageTypeTokenRatio: number;
  /** Share of tokens that are not stop words. */
  contentWordRatio: number;
  /** Mean word length in letters. */
  meanWordLength: number;
  /** Share of tokens found in the Cambridge IELTS headword list. */
  cambridgeCoverage: number;
  /** Distinct Cambridge headwords used. */
  cambridgeMatches: number;
  /** The most frequent content words. */
  frequentWords: WordFrequency[];
};

/**
 * Compute the lexical report for a text.
 *
 * @param text - Normalised input text.
 * @param headwords - Cambridge headword set used for the coverage measure.
 * @param top - How many frequent words to report.
 * @returns The lexical report; all ratios are `0` for empty input.
 */
export function lexicalReport(text: string, headwords: ReadonlySet<string>, top = 10): LexicalReport {
  const tokens = tokenizeWords(text);
  const total = tokens.length;
  const safe = Math.max(total, 1);
  const types = new Set(tokens);

  let contentWords = 0;
  let letters = 0;
  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) {
      contentWords += 1;
    }
    letters += token.replace(/[^a-z]/gu, '').length;
  }

  let cambridgeTokens = 0;
  for (const token of tokens) {
    if (headwords.has(token)) {
      cambridgeTokens += 1;
    }
  }
  let cambridgeMatches = 0;
  for (const type of types) {
    if (headwords.has(type)) {
      cambridgeMatches += 1;
    }
  }

  return {
    tokens: total,
    types: types.size,
    typeTokenRatio: round(types.size / safe, 4),
    rootTypeTokenRatio: round(types.size / Math.sqrt(safe), 4),
    correctedTypeTokenRatio: round(types.size / Math.sqrt(2 * safe), 4),
    movingAverageTypeTokenRatio: round(movingAverageTtr(tokens), 4),
    contentWordRatio: round(contentWords / safe, 4),
    meanWordLength: round(letters / safe, 2),
    cambridgeCoverage: round(cambridgeTokens / safe, 4),
    cambridgeMatches,
    frequentWords: frequentWords(tokens, top),
  };
}
