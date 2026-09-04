/**
 * Deterministic, dependency-free tokenisation for English learner text.
 *
 * Every function here is pure and locale-independent so that the same input
 * always produces the same segmentation, which is a precondition for the
 * reproducibility guarantees described in `docs/reproducibility.md`.
 *
 * @packageDocumentation
 */

/** Matches a word: letters plus internal apostrophes and hyphens. */
const WORD_PATTERN = /[\p{L}][\p{L}'\u2019-]*/gu;

/** Matches end-of-sentence punctuation followed by whitespace or end of input. */
const SENTENCE_TERMINATOR = /[.!?\u2026]+(?=\s|$)/g;

/** Common abbreviations that must not terminate a sentence. */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "st",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "fig",
  "no",
  "approx",
]);

/**
 * Splits text into lower-cased word tokens.
 *
 * Digits, punctuation and symbols are discarded; hyphenated and contracted
 * forms are kept as single tokens.
 *
 * @param text - Arbitrary input text.
 * @returns The word tokens in order of appearance.
 */
export function tokenizeWords(text: string): string[] {
  const matches = text.toLowerCase().match(WORD_PATTERN);
  return matches === null ? [] : matches.map(normaliseToken);
}

/**
 * Normalises a token by folding typographic apostrophes and trimming stray
 * leading or trailing hyphens.
 *
 * @param token - A raw token.
 */
export function normaliseToken(token: string): string {
  return token.replace(/\u2019/g, "'").replace(/^-+|-+$/g, "");
}

/**
 * Splits text into sentences using terminal punctuation, guarding against a
 * small set of common abbreviations.
 *
 * @param text - Arbitrary input text.
 * @returns Trimmed, non-empty sentences.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  SENTENCE_TERMINATOR.lastIndex = 0;

  for (
    let match = SENTENCE_TERMINATOR.exec(text);
    match !== null;
    match = SENTENCE_TERMINATOR.exec(text)
  ) {
    const end = match.index + match[0].length;
    const candidate = text.slice(start, end);
    const lastWord = candidate
      .trim()
      .replace(/[.!?\u2026]+$/, "")
      .split(/\s+/)
      .at(-1);

    if (lastWord !== undefined && ABBREVIATIONS.has(lastWord.toLowerCase())) {
      continue;
    }

    const trimmed = candidate.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
    start = end;
  }

  const tail = text.slice(start).trim();
  if (tail.length > 0) {
    sentences.push(tail);
  }
  return sentences;
}

/**
 * Splits text into paragraphs on blank lines.
 *
 * @param text - Arbitrary input text.
 * @returns Trimmed, non-empty paragraphs.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Counts unique tokens.
 *
 * @param tokens - Word tokens.
 */
export function uniqueTokens(tokens: readonly string[]): Set<string> {
  return new Set(tokens);
}
