/**
 * Classical readability indices computed from surface text statistics.
 *
 * All four formulas are reproduced from their original publications and are
 * cited in `paper/paper.bib`:
 *
 * - Flesch Reading Ease (Flesch, 1948)
 * - Flesch-Kincaid Grade Level (Kincaid et al., 1975)
 * - Gunning fog index (Gunning, 1952)
 * - Automated Readability Index (Senter & Smith, 1967)
 *
 * @packageDocumentation
 */

import { countPolysyllabic, totalSyllables } from "./syllables.ts";
import { splitSentences, tokenizeWords } from "./tokenize.ts";

/** Surface statistics shared by every readability formula. */
export interface TextStatistics {
  /** Number of characters in word tokens (letters only). */
  readonly characters: number;
  /** Number of word tokens. */
  readonly words: number;
  /** Number of sentences. */
  readonly sentences: number;
  /** Total estimated syllables. */
  readonly syllables: number;
  /** Number of word tokens with three or more syllables. */
  readonly polysyllabicWords: number;
  /** Mean words per sentence. */
  readonly meanSentenceLength: number;
  /** Mean syllables per word. */
  readonly meanSyllablesPerWord: number;
}

/** The four readability indices. */
export interface ReadabilityScores {
  /** Flesch Reading Ease; higher is easier. */
  readonly fleschReadingEase: number;
  /** Flesch-Kincaid Grade Level, in US school grades. */
  readonly fleschKincaidGrade: number;
  /** Gunning fog index, in US school grades. */
  readonly gunningFog: number;
  /** Automated Readability Index, in US school grades. */
  readonly automatedReadabilityIndex: number;
}

/** Readability output together with the statistics it was derived from. */
export interface ReadabilityReport extends ReadabilityScores {
  /** The surface statistics used by the formulas. */
  readonly statistics: TextStatistics;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Computes surface statistics for a text.
 *
 * Division-by-zero is avoided by treating an empty text as having zero-valued
 * means rather than `NaN`.
 *
 * @param text - Arbitrary input text.
 */
export function textStatistics(text: string): TextStatistics {
  const tokens = tokenizeWords(text);
  const sentences = splitSentences(text);
  const words = tokens.length;
  const sentenceCount = sentences.length;
  const syllables = totalSyllables(tokens);
  const characters = tokens.reduce(
    (sum, token) => sum + token.replace(/[^\p{L}]/gu, "").length,
    0,
  );

  return {
    characters,
    words,
    sentences: sentenceCount,
    syllables,
    polysyllabicWords: countPolysyllabic(tokens),
    meanSentenceLength: sentenceCount === 0 ? 0 : round(words / sentenceCount),
    meanSyllablesPerWord: words === 0 ? 0 : round(syllables / words),
  };
}

/**
 * Computes the four readability indices for a text.
 *
 * Empty input yields all-zero scores instead of `NaN`, so the function is total.
 *
 * @param text - Arbitrary input text.
 */
export function readability(text: string): ReadabilityReport {
  const statistics = textStatistics(text);
  const { words, sentences, syllables, polysyllabicWords, characters } =
    statistics;

  if (words === 0 || sentences === 0) {
    return {
      statistics,
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      gunningFog: 0,
      automatedReadabilityIndex: 0,
    };
  }

  const wordsPerSentence = words / sentences;
  const syllablesPerWord = syllables / words;
  const charactersPerWord = characters / words;
  const complexRatio = polysyllabicWords / words;

  return {
    statistics,
    fleschReadingEase: round(
      206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord,
    ),
    fleschKincaidGrade: round(
      0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59,
    ),
    gunningFog: round(0.4 * (wordsPerSentence + 100 * complexRatio)),
    automatedReadabilityIndex: round(
      4.71 * charactersPerWord + 0.5 * wordsPerSentence - 21.43,
    ),
  };
}
