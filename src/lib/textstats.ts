/**
 * Text statistics: tokenisation, sentence segmentation, syllable estimation and
 * the Flesch formulas.
 *
 * Everything here is a deterministic, dependency-free heuristic so that the
 * analysis endpoints behave identically on every replica and release — the same
 * property the rest of the API guarantees for its datasets. The heuristics are
 * standard ones (whitespace tokenisation with an alphabetic filter, vowel-group
 * syllable estimation, the classic sentence terminators) and are documented
 * inline so researchers can cite exactly what was measured.
 */

/** A word token: starts with a letter, may carry internal apostrophes or hyphens. */
const WORD_PATTERN = /[a-zA-Z][a-zA-Z'’-]*/g;

/** Sentence terminators: full stop, exclamation mark, question mark, ellipsis. */
const SENTENCE_END = /[.!?…]+(\s+|$)/;

/**
 * Longest accepted text, in characters.
 *
 * The analysers travel in the query string (the API is GET-only), so the cap
 * keeps percent-encoded requests comfortably inside common HTTP header limits:
 * 4,000 characters is roughly 650 words — any Task 2 essay fits with room to
 * spare.
 */
export const MAX_TEXT_LENGTH = 4_000;

/**
 * Split text into non-empty sentences.
 *
 * Repeated terminators (`!?`, `...`) end a single sentence; a final stretch of
 * text without a terminator still counts as one sentence.
 *
 * @param text - Raw text.
 */
export function sentencesOf(text: string): string[] {
  const sentences: string[] = [];
  let rest = text.trim();
  while (rest.length > 0) {
    const match = SENTENCE_END.exec(rest);
    if (match === null) {
      sentences.push(rest);
      break;
    }
    const sentence = rest.slice(0, match.index).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return sentences;
}

/**
 * Extract lower-cased word tokens.
 *
 * Tokens must begin with a letter; digits, standalone punctuation and symbols
 * are not words. Internal apostrophes (straight and curly) and hyphens are
 * kept, so `don't` and `well-known` stay single tokens.
 *
 * @param text - Raw text.
 */
export function wordsOf(text: string): string[] {
  const matches = text.match(WORD_PATTERN);
  if (matches === null) {
    return [];
  }
  return matches.map((word) => word.toLowerCase());
}

/**
 * Estimate the syllable count of a single word.
 *
 * Heuristic: count maximal vowel groups (`aeiouy`), then subtract one for a
 * trailing silent `e` (kept for the `le` ending, as in `little`). The result
 * never falls below one.
 *
 * @param word - A word containing at least one letter.
 */
export function syllablesOf(word: string): number {
  const lower = word.toLowerCase();
  const groups = lower.match(/[aeiouy]+/g);
  let count = groups === null ? 0 : groups.length;
  if (count > 1 && lower.endsWith('e') && !lower.endsWith('le')) {
    count -= 1;
  }
  return Math.max(1, count);
}

/**
 * Mean of a non-empty numeric sample.
 *
 * @param values - Sample; must not be empty.
 */
export function meanOf(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

/**
 * Population standard deviation of a numeric sample.
 *
 * @param values - Sample; may be empty.
 */
export function stdevOf(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = meanOf(values);
  const variance = meanOf(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

/**
 * Round to two decimal places.
 *
 * @param value - Raw value.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round to one decimal place.
 *
 * @param value - Raw value.
 */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Flesch Reading Ease: `206.835 - 1.015 * words/sentences - 84.6 * syllables/words`.
 *
 * @param words - Running words (> 0).
 * @param sentences - Sentence count (> 0).
 * @param syllables - Total syllables.
 */
export function fleschReadingEase(words: number, sentences: number, syllables: number): number {
  return round2(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words));
}

/**
 * Flesch-Kincaid grade level: `0.39 * words/sentences + 11.8 * syllables/words - 15.59`.
 *
 * @param words - Running words (> 0).
 * @param sentences - Sentence count (> 0).
 * @param syllables - Total syllables.
 */
export function fleschKincaidGrade(words: number, sentences: number, syllables: number): number {
  return round2(0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59);
}

/** Number of words with three or more syllables in a token list. */
function longWordCount(words: readonly string[]): number {
  return words.filter((word) => syllablesOf(word) >= 3).length;
}

/** Base statistics for a list of tokens and its source text. */
export type BaseProfile = {
  words: number;
  sentences: number;
  paragraphs: number;
  avgWordsPerSentence: number;
  avgWordLength: number;
  sentenceLengthStdDev: number;
  longWordShare: number;
  syllablesPerWord: number;
};

/**
 * Compute the base statistics shared by the readability report and the essay
 * profile.
 *
 * @param text - Raw text.
 * @param tokens - Lower-cased tokens of the text (from {@link wordsOf}).
 * @param sentences - Sentences of the text (from {@link sentencesOf}).
 */
export function baseProfile(
  text: string,
  tokens: readonly string[],
  sentences: readonly string[],
): BaseProfile {
  const lengths = sentences.map((sentence) => wordsOf(sentence).length);
  const syllables = tokens.reduce((sum, word) => sum + syllablesOf(word), 0);
  const characters = tokens.reduce((sum, word) => sum + word.length, 0);
  const paragraphs = text
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0).length;
  return {
    words: tokens.length,
    sentences: sentences.length,
    paragraphs,
    avgWordsPerSentence: round2(tokens.length / sentences.length),
    avgWordLength: round2(characters / tokens.length),
    sentenceLengthStdDev: round2(stdevOf(lengths)),
    longWordShare: round2(longWordCount(tokens) / tokens.length),
    syllablesPerWord: round2(syllables / tokens.length),
  };
}
