/**
 * Deterministic text metrics.
 *
 * The analysis engine turns a pasted candidate text (an essay draft, a reading
 * passage, a speaking transcript) into a stable, reproducible set of
 * measurements: token and sentence counts, word-length and syllable
 * statistics, the six most-cited readability formulae, lexical-diversity
 * measures (type-token ratio, root TTR and MTLD) and a grade-to-CEFR
 * heuristic. Every function in this module is pure and side-effect free, so
 * the same text always yields the same numbers on every machine and release.
 *
 * The syllable heuristic and the Flesch family constants mirror
 * `scripts/extract_practice_tests.py`, the pipeline that produced the
 * readability statistics of the practice-test index, so measurements are
 * consistent across the whole API.
 *
 * References: Flesch (1948), Kincaid et al. (1975), Gunning (1952), McLaughlin
 * (1969), Coleman & Liau (1975), Smith & Senter (1967), McCarthy & Jarvis
 * (2010). See `RESEARCH.md` Part III for the full bibliography and the
 * documented limitations of each heuristic.
 */

/** Factor-completion threshold of the standard MTLD definition. */
export const MTLD_FACTOR_THRESHOLD = 0.72;

/** A token is "polysyllabic" when it has at least this many syllables. */
export const POLYSYLLABLE_MIN_SYLLABLES = 3;

/** Maximum number of code points accepted by the GET variant of `/v1/analyze/text`. */
export const GET_TEXT_MAX_CHARACTERS = 8000;

/** Maximum number of code points accepted by the POST variant of `/v1/analyze/text`. */
export const POST_TEXT_MAX_CHARACTERS = 50000;

/** Matches word tokens: letters and combining marks, with internal apostrophes or hyphens. */
export const WORD_TOKEN_PATTERN = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

/** Matches sentence-ending punctuation runs followed by whitespace or end of text. */
export const SENTENCE_END_PATTERN = /[.!?]+(?=\s|$)/g;

/** Vowel groups used by the syllable heuristic. */
const VOWEL_GROUP_PATTERN = /[aeiouy]+/g;

/**
 * Round to two decimals, collapsing negative zero to zero.
 *
 * @param value - Number to round.
 */
export function round2(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Round to four decimals, collapsing negative zero to zero.
 *
 * @param value - Number to round.
 */
export function round4(value: number): number {
  const rounded = Math.round(value * 10000) / 10000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Extract the word tokens of a text, in order.
 *
 * A token is a run of Unicode letters and combining marks that may contain
 * internal apostrophes or hyphens (`don't`, `state-of-the-art`). Pure digit
 * runs and punctuation are not words, matching the tokeniser used for the
 * practice-test index.
 *
 * @param text - Input text.
 * @returns Tokens as they appear, original casing preserved.
 */
export function tokenize(text: string): string[] {
  return text.match(WORD_TOKEN_PATTERN) ?? [];
}

/**
 * Normalise a token for lexical comparison: decompose accented letters,
 * strip the diacritics and lower-case the result.
 *
 * @param token - Raw token from {@link tokenize}.
 */
export function normalizeToken(token: string): string {
  return token.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Count the letters of a token after normalisation (`á` counts once,
 * apostrophes and hyphens do not count).
 *
 * @param token - Raw token from {@link tokenize}.
 */
export function letterCount(token: string): number {
  return normalizeToken(token).replace(/['’-]/g, '').length;
}

/**
 * Estimate the syllable count of a word.
 *
 * Vowel-group heuristic with the silent-final-`e` correction used by the
 * classic readability formulae: one syllable per vowel group, minus one when
 * the word ends in `e` but not in `le`, `ee` or `ye`; every word has at least
 * one syllable. Accented letters are folded onto their base letter first.
 *
 * @param word - Raw word token.
 */
export function countSyllables(word: string): number {
  const lowered = normalizeToken(word).replace(/['’-]/g, '');
  const groups = lowered.match(VOWEL_GROUP_PATTERN);
  let total = groups === null ? 0 : groups.length;
  if (
    lowered.endsWith('e') &&
    !lowered.endsWith('le') &&
    !lowered.endsWith('ee') &&
    !lowered.endsWith('ye')
  ) {
    if (total > 1) {
      total -= 1;
    }
  }
  return Math.max(total, 1);
}

/**
 * Count the sentences of a text.
 *
 * A sentence ends at a run of `.`, `!` or `?` followed by whitespace or the
 * end of the text; a trailing sentence without a terminator still counts.
 * This is intentionally simple — abbreviations such as `e.g.` split sentences
 * — and documented as such in the metric reference.
 *
 * @param text - Input text.
 */
export function countSentences(text: string): number {
  if (!/\S/.test(text)) {
    return 0;
  }
  const matches = text.match(SENTENCE_END_PATTERN);
  const terminators = matches === null ? 0 : matches.length;
  const endsWithTerminator = /[.!?]+\s*$/.test(text);
  return endsWithTerminator ? Math.max(terminators, 1) : terminators + 1;
}

/**
 * Count the paragraphs of a text (blocks separated by at least one blank
 * line).
 *
 * @param text - Input text.
 */
export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\n\s*\n/).filter((block) => block.trim().length > 0).length;
}

/** Aggregate counts produced by a single pass over the text. */
export interface TextCounts {
  /** Length of the input in UTF-16 code units. */
  characters: number;
  /** Word tokens. */
  words: number;
  /** Distinct normalised tokens. */
  uniqueWords: number;
  /** Sentences (see {@link countSentences}). */
  sentences: number;
  /** Paragraphs (blocks separated by blank lines). */
  paragraphs: number;
  /** Alphabetic letters across all tokens. */
  letters: number;
  /** Estimated syllables across all tokens. */
  syllables: number;
  /** Tokens with three or more syllables. */
  polysyllabicWords: number;
}

/** Derived unit-level averages. */
export interface TextAverages {
  /** Mean letters per word. */
  wordLength: number;
  /** Mean words per sentence. */
  sentenceLength: number;
  /** Mean syllables per word. */
  syllablesPerWord: number;
}

/** Lexical-diversity measures. */
export interface LexicalDiversity {
  /** Unique tokens divided by tokens. */
  typeTokenRatio: number;
  /** Guiraud's root TTR: unique tokens divided by the square root of tokens. */
  rootTtr: number;
  /** Measure of Textual Lexical Diversity (McCarthy & Jarvis 2010), bidirectional mean. */
  mtld: number;
  /** Types occurring exactly once. */
  hapaxLegomena: number;
  /** Hapax types divided by unique tokens. */
  hapaxRatio: number;
}

/** The six readability scores and their median grade. */
export interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  /** Median of the five grade-level formulae, clamped at 0. */
  consensusGrade: number;
}

/** The complete analysis returned by {@link analyzeText}. */
export interface TextAnalysis {
  counts: TextCounts;
  /** `null` when the text contains no words. */
  averages: TextAverages | null;
  /** `null` when the text contains no words. */
  lexical: LexicalDiversity | null;
  /** `null` when the text contains no words. */
  readability: ReadabilityScores | null;
  /** CEFR level suggested by the consensus grade; `null` without words. */
  cefr: CefrEstimate | null;
}

/** CEFR levels used by the grade heuristic. */
export type CefrEstimate = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Consensus-grade to CEFR thresholds, inclusive on the grade. */
export const GRADE_TO_CEFR: readonly { maxGrade: number; cefr: CefrEstimate }[] = [
  { maxGrade: 4, cefr: 'A2' },
  { maxGrade: 6, cefr: 'B1' },
  { maxGrade: 9, cefr: 'B2' },
  { maxGrade: 12, cefr: 'C1' },
];

/**
 * Count the word, unique-word, letter, syllable and polysyllable statistics
 * of a text in one pass.
 *
 * @param text - Input text.
 */
export function countText(text: string): TextCounts {
  const tokens = tokenize(text);
  const seen = new Set<string>();
  let letters = 0;
  let syllables = 0;
  let polysyllabicWords = 0;
  for (const token of tokens) {
    seen.add(normalizeToken(token));
    letters += letterCount(token);
    const tokenSyllables = countSyllables(token);
    syllables += tokenSyllables;
    if (tokenSyllables >= POLYSYLLABLE_MIN_SYLLABLES) {
      polysyllabicWords += 1;
    }
  }
  return {
    characters: text.length,
    words: tokens.length,
    uniqueWords: seen.size,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    letters,
    syllables,
    polysyllabicWords,
  };
}

/**
 * Median of a list of numbers.
 *
 * @param values - Input values (not mutated).
 */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/**
 * Compute the lexical-diversity measures of a token sequence.
 *
 * @param tokens - Word tokens (normalisation happens here).
 */
export function lexicalDiversity(tokens: readonly string[]): LexicalDiversity {
  if (tokens.length === 0) {
    return { typeTokenRatio: 0, rootTtr: 0, mtld: 0, hapaxLegomena: 0, hapaxRatio: 0 };
  }
  const normalised = tokens.map(normalizeToken);
  const frequencies = new Map<string, number>();
  for (const token of normalised) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  const unique = frequencies.size;
  const total = normalised.length;
  const hapax = [...frequencies.values()].filter((count) => count === 1).length;
  const forward = mtldDirectional(normalised);
  const backward = mtldDirectional([...normalised].reverse());
  return {
    typeTokenRatio: round4(unique / total),
    rootTtr: round4(unique / Math.sqrt(total)),
    mtld: round2((forward + backward) / 2),
    hapaxLegomena: hapax,
    hapaxRatio: round4(hapax / unique),
  };
}

/**
 * MTLD of a token sequence in one direction.
 *
 * Factors close every time the running type-token ratio drops below
 * {@link MTLD_FACTOR_THRESHOLD}; the trailing partial factor contributes
 * proportionally. A sequence that never completes a factor (all-distinct
 * tokens) reports the token count, the standard upper bound.
 *
 * @param tokens - Normalised tokens.
 */
function mtldDirectional(tokens: readonly string[]): number {
  let factors = 0;
  let processed = 0;
  const seen = new Set<string>();
  for (const token of tokens) {
    seen.add(token);
    processed += 1;
    if (seen.size / processed < MTLD_FACTOR_THRESHOLD) {
      factors += 1;
      seen.clear();
      processed = 0;
    }
  }
  if (processed > 0) {
    factors += Math.max(0, 1 - seen.size / processed) / (1 - MTLD_FACTOR_THRESHOLD);
  }
  return factors > 0 ? tokens.length / factors : tokens.length;
}

/**
 * Compute the six readability formulae and their median grade.
 *
 * @param counts - Aggregate counts of the text.
 */
export function readabilityScores(counts: TextCounts): ReadabilityScores {
  const wordsPerSentence = counts.words / counts.sentences;
  const syllablesPerWord = counts.syllables / counts.words;
  const lettersPerWord = counts.letters / counts.words;
  const complexPerWord = counts.polysyllabicWords / counts.words;

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gunningFog = 0.4 * (wordsPerSentence + 100 * complexPerWord);
  const smogIndex = 1.043 * Math.sqrt(counts.polysyllabicWords * (30 / counts.sentences)) + 3.1291;
  const colemanLiauIndex =
    0.0588 * lettersPerWord * 100 - 0.296 * (counts.sentences / counts.words) * 100 - 15.8;
  const automatedReadabilityIndex = 4.71 * lettersPerWord + 0.5 * wordsPerSentence - 21.43;
  const consensus = Math.max(
    0,
    median([fleschKincaidGrade, gunningFog, smogIndex, colemanLiauIndex, automatedReadabilityIndex]),
  );

  return {
    fleschReadingEase: round2(fleschReadingEase),
    fleschKincaidGrade: round2(fleschKincaidGrade),
    gunningFog: round2(gunningFog),
    smogIndex: round2(smogIndex),
    colemanLiauIndex: round2(colemanLiauIndex),
    automatedReadabilityIndex: round2(automatedReadabilityIndex),
    consensusGrade: round2(consensus),
  };
}

/**
 * Map a consensus grade level to a CEFR level using
 * {@link GRADE_TO_CEFR}; grades above the top threshold map to `C2`.
 *
 * @param grade - Consensus grade level.
 */
export function gradeToCefr(grade: number): CefrEstimate {
  for (const threshold of GRADE_TO_CEFR) {
    if (grade <= threshold.maxGrade) {
      return threshold.cefr;
    }
  }
  return 'C2';
}

/**
 * Run the full deterministic analysis over a text.
 *
 * @param text - Input text (any length; the route layer enforces limits).
 */
export function analyzeText(text: string): TextAnalysis {
  const counts = countText(text);
  if (counts.words === 0) {
    return { counts, averages: null, lexical: null, readability: null, cefr: null };
  }
  const averages: TextAverages = {
    wordLength: round2(counts.letters / counts.words),
    sentenceLength: round2(counts.words / counts.sentences),
    syllablesPerWord: round2(counts.syllables / counts.words),
  };
  const readability = readabilityScores(counts);
  return {
    counts,
    averages,
    lexical: lexicalDiversity(tokenize(text)),
    readability,
    cefr: gradeToCefr(readability.consensusGrade),
  };
}
