/**
 * Deterministic, dependency-free readability and lexical analytics used by the
 * writing endpoints. Every metric is reproducible: no randomness, no network,
 * no model weights, so results can be cited and replicated exactly.
 */

const WORD_PATTERN = /[A-Za-z][A-Za-z'’-]*/g;
const SENTENCE_PATTERN = /[^.!?]+[.!?]*/g;

/** Split text into lower-cased word tokens. */
export function tokenize(text: string): string[] {
  return (text.match(WORD_PATTERN) ?? []).map((word) => word.toLowerCase());
}

/** Split text into trimmed, non-empty sentences. */
export function sentences(text: string): string[] {
  return (text.match(SENTENCE_PATTERN) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/**
 * Estimate the syllable count of an English word using the standard
 * vowel-group heuristic with silent-`e` correction.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length === 0) return 0;
  if (clean.length <= 3) return 1;
  const trimmed = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return groups === null ? 1 : groups.length;
}

/** Metrics produced by {@link analyzeText}. */
export interface TextMetrics {
  characters: number;
  words: number;
  uniqueWords: number;
  sentences: number;
  paragraphs: number;
  syllables: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  typeTokenRatio: number;
  longWordRatio: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
}

const round = (value: number, digits = 2): number => Number(value.toFixed(digits));

/** Compute the full metric set for a piece of writing. */
export function analyzeText(text: string): TextMetrics {
  const words = tokenize(text);
  const sentenceList = sentences(text);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentenceList.length);
  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = wordCount === 0 ? 0 : syllables / wordCount;
  const longWords = words.filter((word) => countSyllables(word) >= 3).length;

  return {
    characters: text.length,
    words: wordCount,
    uniqueWords: new Set(words).size,
    sentences: sentenceList.length,
    paragraphs: paragraphs.length,
    syllables,
    averageWordsPerSentence: round(wordsPerSentence),
    averageSyllablesPerWord: round(syllablesPerWord),
    typeTokenRatio: wordCount === 0 ? 0 : round(new Set(words).size / wordCount, 4),
    longWordRatio: wordCount === 0 ? 0 : round(longWords / wordCount, 4),
    fleschReadingEase: round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord),
    fleschKincaidGrade: round(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59),
  };
}
