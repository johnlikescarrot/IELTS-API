/**
 * Deterministic, dependency-free text segmentation and counting.
 *
 * Every readability formula in {@link module:lib/readability} is a ratio over
 * four quantities: sentences, words, syllables and letters. Published
 * implementations disagree about how those quantities are obtained, which is
 * the main reason readability scores are not reproducible across tools. This
 * module therefore fixes one explicit, documented segmentation and reuses it
 * everywhere, so a score reported by this API can be recomputed exactly.
 *
 * The rules, stated once:
 *
 * - A **word** is a maximal run of ASCII letters, optionally containing
 *   internal apostrophes or hyphens (`don't`, `state-of-the-art` counts as one
 *   word). Digits and standalone punctuation are not words.
 * - A **sentence** ends at `.`, `!`, `?` or a newline, and runs of terminators
 *   collapse. Text with no terminator is one sentence.
 * - **Syllables** are counted with the vowel-group heuristic described in
 *   {@link countSyllables}.
 */

/**
 * Longest text accepted by the analysis endpoints, in characters.
 *
 * The analysis endpoints take their input in the query string, so the whole
 * request must fit inside Node's maximum HTTP header size (16 KiB by default).
 * Percent-encoding inflates the text — every space becomes `%20` — so the
 * usable budget is well below that limit. 5,000 characters leaves ample
 * headroom while comfortably exceeding a Task 2 response, which is 250-400
 * words (roughly 2,500 characters). Longer text is rejected with `422` rather
 * than being truncated, so a caller is never silently given a score for only
 * part of their text.
 */
export const MAX_TEXT_LENGTH = 5000;

/** A word carrying three or more syllables is "complex" (Gunning Fog). */
export const COMPLEX_WORD_SYLLABLES = 3;

/**
 * Collapse all whitespace runs to single spaces and trim.
 *
 * @param raw - Raw input text.
 * @returns The normalised text.
 */
export function normaliseText(raw: string): string {
  return raw.replace(/\s+/gu, ' ').trim();
}

/**
 * Normalise whitespace while preserving paragraph breaks.
 *
 * The essay checker reports on paragraphing, so it must be able to see blank
 * lines. This collapses runs of spaces and single newlines but keeps a blank
 * line between paragraphs, which is what {@link splitParagraphs} splits on.
 *
 * @param raw - Raw input text.
 * @returns The text with paragraph structure intact.
 */
export function normaliseParagraphs(raw: string): string {
  return raw
    .replace(/\r\n?/gu, '\n')
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.replace(/\s+/gu, ' ').trim())
    .filter((paragraph) => paragraph.length > 0)
    .join('\n\n');
}

/**
 * Split text into sentences.
 *
 * Terminators are `.`, `!`, `?` and newlines; consecutive terminators produce
 * one break rather than empty sentences. Text without any terminator is
 * treated as a single sentence, so the sentence count is never zero for
 * non-empty input.
 *
 * @param text - Input text.
 * @returns Trimmed, non-empty sentences.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\n\r]+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * Extract lower-cased word tokens.
 *
 * @param text - Input text.
 * @returns Word tokens in document order, lower-cased.
 */
export function tokenizeWords(text: string): string[] {
  const matches = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/gu);
  if (matches === null) {
    return [];
  }
  return matches.map((token) => token.toLowerCase());
}

/**
 * Estimate the number of syllables in an English word.
 *
 * The heuristic is the widely used vowel-group rule: strip a silent trailing
 * `e` (and the `es`/`ed` inflections that do not add a syllable), then count
 * runs of vowels, treating `y` as a vowel. Words of three letters or fewer are
 * always one syllable. The result is never below one for a word containing a
 * letter, which keeps every downstream ratio finite.
 *
 * This is an approximation — no dictionary-free method is exact — but it is
 * deterministic and documented, which is what reproducibility requires.
 *
 * @param word - A single word token.
 * @returns The estimated syllable count (`0` only for a token with no letters).
 */
export function countSyllables(word: string): number {
  const letters = word.toLowerCase().replace(/[^a-z]/gu, '');
  if (letters.length === 0) {
    return 0;
  }
  if (letters.length <= 3) {
    return 1;
  }
  const stripped = letters.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/u, '').replace(/^y/u, '');
  const groups = stripped.match(/[aeiouy]+/gu);
  if (groups === null) {
    return 1;
  }
  return groups.length;
}

/** The counts every readability formula is derived from. */
export type TextStats = {
  /** Number of sentences. */
  sentences: number;
  /** Number of word tokens. */
  words: number;
  /** Number of distinct word types (lower-cased). */
  uniqueWords: number;
  /** Total estimated syllables across all words. */
  syllables: number;
  /** Number of letters across all words. */
  letters: number;
  /** Words with three or more syllables. */
  complexWords: number;
  /** Words with exactly one syllable. */
  monosyllables: number;
  /** Characters in the normalised text, including spaces. */
  characters: number;
  /** Mean words per sentence. */
  wordsPerSentence: number;
  /** Mean syllables per word. */
  syllablesPerWord: number;
  /** Mean letters per word. */
  lettersPerWord: number;
};

/**
 * Compute every count the readability formulas need, in a single pass.
 *
 * @param text - Normalised input text.
 * @returns The derived counts. All ratios are `0` when there are no words.
 */
export function analyseText(text: string): TextStats {
  const sentenceList = splitSentences(text);
  const words = tokenizeWords(text);
  const sentences = Math.max(sentenceList.length, 1);

  let syllables = 0;
  let letters = 0;
  let complexWords = 0;
  let monosyllables = 0;
  const types = new Set<string>();

  for (const word of words) {
    const count = countSyllables(word);
    syllables += count;
    letters += word.replace(/[^a-z]/gu, '').length;
    if (count >= COMPLEX_WORD_SYLLABLES) {
      complexWords += 1;
    }
    if (count === 1) {
      monosyllables += 1;
    }
    types.add(word);
  }

  const total = words.length;
  const safe = Math.max(total, 1);

  return {
    sentences,
    words: total,
    uniqueWords: types.size,
    syllables,
    letters,
    complexWords,
    monosyllables,
    characters: text.length,
    wordsPerSentence: total / sentences,
    syllablesPerWord: syllables / safe,
    lettersPerWord: letters / safe,
  };
}

/**
 * Round to a fixed number of decimal places, avoiding `-0`.
 *
 * @param value - Value to round.
 * @param places - Decimal places (default 2).
 * @returns The rounded value.
 */
export function round(value: number, places = 2): number {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}
