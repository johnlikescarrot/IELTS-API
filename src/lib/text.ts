/**
 * Dependency-free English text analytics.
 *
 * The functions here implement published, citable measures exactly as they are
 * defined in the literature, so that a result obtained from this API can be
 * reproduced by hand or by any other implementation:
 *
 * - Flesch Reading Ease and Flesch-Kincaid Grade Level (Kincaid et al., 1975)
 * - Gunning Fog index (Gunning, 1952)
 * - SMOG grade (McLaughlin, 1969)
 * - Coleman-Liau index (Coleman & Liau, 1975)
 * - Automated Readability Index (Senter & Smith, 1967)
 * - Type-token ratio, root TTR (Guiraud, 1960), log TTR (Herdan, 1960)
 * - Maas index (Maas, 1972) and MTLD (McCarthy & Jarvis, 2010)
 *
 * Syllable counting uses a deterministic rule-based heuristic; it is documented
 * because every readability formula above inherits its error term from it.
 */

/** A token: a lower-cased alphabetic (or apostrophised) word. */
export type Token = string;

/** Word characters kept by the tokeniser: letters plus internal apostrophes. */
const WORD_PATTERN = /[A-Za-z\u00C0-\u024F]+(?:['\u2019][A-Za-z\u00C0-\u024F]+)*/g;

/** Sentence terminators recognised by {@link splitSentences}. */
const SENTENCE_PATTERN = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;

/** Maximum number of characters accepted for a single analysis request. */
export const MAX_TEXT_LENGTH = 20000;

/**
 * Split text into lower-cased word tokens.
 *
 * @param text - Raw input text.
 * @returns The tokens, in order of occurrence.
 */
export function tokenize(text: string): Token[] {
  return (text.toLowerCase().match(WORD_PATTERN) ?? []).map((token) => token.replace(/\u2019/g, "'"));
}

/**
 * Split text into sentences.
 *
 * A sentence is a run of characters terminated by `.`, `!`, `?` or a newline.
 * Fragments that contain no word character are discarded, so trailing
 * whitespace and stray punctuation never inflate the sentence count.
 *
 * @param text - Raw input text.
 * @returns Trimmed sentences.
 */
export function splitSentences(text: string): string[] {
  return (text.match(SENTENCE_PATTERN) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => WORD_PATTERN.test(sentence.toLowerCase()) || /[A-Za-z]/.test(sentence));
}

/**
 * Count the syllables of an English word with a rule-based heuristic.
 *
 * The rules are the conventional ones: count vowel groups, drop a silent
 * terminal `e`, keep `le` endings after a consonant, and never return less
 * than one syllable for a non-empty word.
 *
 * @param word - A single lower-cased word.
 * @returns The estimated syllable count (at least 1 for a non-empty word).
 */
export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) {
    return 0;
  }
  if (cleaned.length <= 3) {
    return 1;
  }
  // A terminal `le` after a consonant is syllabic ("ta-ble"), so its `e` is
  // kept; every other terminal `e`, `ed` or `es` is silent and is dropped.
  const syllabicLe = /[^aeiouy]le$/.test(cleaned);
  const trimmed = (syllabicLe ? cleaned : cleaned.replace(/(?:[^aeiouy]es|ed|[^aeiouy]e)$/, ''))
    .replace(/^y/, '')
    .replace(/([aeiouy])\1+/g, '$1');
  // A word with no vowel letter at all (e.g. the loanword "crwth") still
  // counts as one syllable.
  const groups = trimmed.match(/[aeiouy]+/g);
  return groups === null ? 1 : Math.max(1, groups.length);
}

/** Counting statistics shared by every readability formula. */
export interface TextCounts {
  /** Number of characters, whitespace excluded. */
  characters: number;
  /** Number of word tokens. */
  words: number;
  /** Number of distinct word types. */
  types: number;
  /** Number of sentences. */
  sentences: number;
  /** Total syllables across all tokens. */
  syllables: number;
  /** Tokens of three or more syllables ("complex" words). */
  polysyllables: number;
  /** Tokens of more than six characters. */
  longWords: number;
}

/**
 * Compute the raw counts every downstream measure is derived from.
 *
 * @param text - Raw input text.
 * @returns Counting statistics; all zero for text without words.
 */
export function countText(text: string): TextCounts {
  const tokens = tokenize(text);
  const sentences = splitSentences(text);
  let syllables = 0;
  let polysyllables = 0;
  let longWords = 0;
  let characters = 0;
  for (const token of tokens) {
    const count = countSyllables(token);
    syllables += count;
    if (count >= 3) {
      polysyllables += 1;
    }
    if (token.length > 6) {
      longWords += 1;
    }
    characters += token.length;
  }
  return {
    characters,
    words: tokens.length,
    types: new Set(tokens).size,
    sentences: sentences.length,
    syllables,
    polysyllables,
    longWords,
  };
}

/** Round to a fixed number of decimals, avoiding `-0`. */
function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

/** Readability scores for one text. */
export interface ReadabilityScores {
  /** Flesch Reading Ease (0-100; higher is easier). */
  fleschReadingEase: number;
  /** Flesch-Kincaid Grade Level (US school grade). */
  fleschKincaidGrade: number;
  /** Gunning Fog index. */
  gunningFog: number;
  /** SMOG grade. */
  smogIndex: number;
  /** Coleman-Liau index. */
  colemanLiau: number;
  /** Automated Readability Index. */
  automatedReadabilityIndex: number;
  /** Mean of the five grade-level measures. */
  consensusGrade: number;
}

/**
 * Compute the readability measures for a text.
 *
 * All formulas degrade gracefully: a text without words or sentences yields
 * zeros rather than `NaN`, so the response schema is always numeric.
 *
 * @param counts - Counts produced by {@link countText}.
 * @returns The readability scores, each rounded to two decimals.
 */
export function readability(counts: TextCounts): ReadabilityScores {
  const words = Math.max(1, counts.words);
  const sentences = Math.max(1, counts.sentences);
  const empty = counts.words === 0;
  const wordsPerSentence = words / sentences;
  const syllablesPerWord = counts.syllables / words;
  const charactersPer100 = (counts.characters / words) * 100;
  const sentencesPer100 = (sentences / words) * 100;

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gunningFog = 0.4 * (wordsPerSentence + 100 * (counts.polysyllables / words));
  const smogIndex = 1.043 * Math.sqrt(counts.polysyllables * (30 / sentences)) + 3.1291;
  const colemanLiau = 0.0588 * charactersPer100 - 0.296 * sentencesPer100 - 15.8;
  const automatedReadabilityIndex = 4.71 * (counts.characters / words) + 0.5 * wordsPerSentence - 21.43;

  const grades = [fleschKincaidGrade, gunningFog, smogIndex, colemanLiau, automatedReadabilityIndex];
  const consensusGrade = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;

  return {
    fleschReadingEase: empty ? 0 : round(fleschReadingEase),
    fleschKincaidGrade: empty ? 0 : round(fleschKincaidGrade),
    gunningFog: empty ? 0 : round(gunningFog),
    smogIndex: empty ? 0 : round(smogIndex),
    colemanLiau: empty ? 0 : round(colemanLiau),
    automatedReadabilityIndex: empty ? 0 : round(automatedReadabilityIndex),
    consensusGrade: empty ? 0 : round(consensusGrade),
  };
}

/**
 * Measure of Textual Lexical Diversity (McCarthy & Jarvis, 2010).
 *
 * The forward and backward passes are averaged, as in the original paper. A
 * partial final factor is included, weighted by how far it progressed towards
 * the 0.72 type-token threshold.
 *
 * @param tokens - Word tokens, in order.
 * @param threshold - TTR threshold that closes a factor (default 0.72).
 * @returns The MTLD value; 0 when there are no tokens.
 */
export function mtld(tokens: readonly Token[], threshold = 0.72): number {
  if (tokens.length === 0) {
    return 0;
  }
  const pass = (sequence: readonly Token[]): number => {
    let factors = 0;
    let types = new Set<Token>();
    let count = 0;
    let ratio = 1;
    for (const token of sequence) {
      types.add(token);
      count += 1;
      ratio = types.size / count;
      if (ratio <= threshold) {
        factors += 1;
        types = new Set<Token>();
        count = 0;
        ratio = 1;
      }
    }
    if (count > 0) {
      factors += (1 - ratio) / (1 - threshold);
    }
    return factors === 0 ? sequence.length : sequence.length / factors;
  };
  const forward = pass(tokens);
  const backward = pass([...tokens].reverse());
  return round((forward + backward) / 2);
}

/** Lexical diversity measures for one text. */
export interface DiversityScores {
  /** Number of tokens. */
  tokens: number;
  /** Number of distinct types. */
  types: number;
  /** Type-token ratio. */
  typeTokenRatio: number;
  /** Root TTR (Guiraud's index). */
  rootTypeTokenRatio: number;
  /** Log TTR (Herdan's C). */
  logTypeTokenRatio: number;
  /** Maas index (lower means more diverse). */
  maasIndex: number;
  /** Measure of Textual Lexical Diversity. */
  mtld: number;
  /** Ratio of words longer than six characters. */
  lexicalDensity: number;
  /** Hapax legomena: types occurring exactly once. */
  hapaxLegomena: number;
}

/**
 * Compute lexical diversity measures.
 *
 * @param tokens - Word tokens, in order.
 * @returns The diversity scores, each rounded to four decimals where relevant.
 */
export function diversity(tokens: readonly Token[]): DiversityScores {
  const total = tokens.length;
  const frequencies = new Map<Token, number>();
  let longWords = 0;
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    if (token.length > 6) {
      longWords += 1;
    }
  }
  const types = frequencies.size;
  const hapax = [...frequencies.values()].filter((count) => count === 1).length;
  if (total === 0) {
    return {
      tokens: 0,
      types: 0,
      typeTokenRatio: 0,
      rootTypeTokenRatio: 0,
      logTypeTokenRatio: 0,
      maasIndex: 0,
      mtld: 0,
      lexicalDensity: 0,
      hapaxLegomena: 0,
    };
  }
  const logTotal = Math.log(total);
  const logTypes = Math.log(types);
  // Herdan's C and Maas's a^2 are undefined for a single-token text.
  const single = total === 1 || types === 1;
  return {
    tokens: total,
    types,
    typeTokenRatio: round(types / total, 4),
    rootTypeTokenRatio: round(types / Math.sqrt(total), 4),
    logTypeTokenRatio: single ? 0 : round(logTypes / logTotal, 4),
    maasIndex: single ? 0 : round((logTotal - logTypes) / (logTotal * logTotal), 6),
    mtld: mtld(tokens),
    lexicalDensity: round(longWords / total, 4),
    hapaxLegomena: hapax,
  };
}

/** A frequency row of the token distribution. */
export interface FrequencyRow {
  /** The word type. */
  word: Token;
  /** Number of occurrences. */
  count: number;
  /** Share of all tokens, rounded to four decimals. */
  share: number;
}

/**
 * Return the most frequent word types, ties broken alphabetically.
 *
 * @param tokens - Word tokens.
 * @param limit - Maximum number of rows to return.
 * @returns The frequency rows, most frequent first.
 */
export function topFrequencies(tokens: readonly Token[], limit: number): FrequencyRow[] {
  const frequencies = new Map<Token, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }
  const total = Math.max(1, tokens.length);
  return [...frequencies.entries()]
    .map(([word, count]) => ({ word, count, share: round(count / total, 4) }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, limit);
}

/** Sentence-level structural statistics. */
export interface SentenceStats {
  /** Number of sentences. */
  count: number;
  /** Mean sentence length in words. */
  meanLength: number;
  /** Population standard deviation of sentence length. */
  lengthStandardDeviation: number;
  /** Shortest sentence length in words. */
  shortest: number;
  /** Longest sentence length in words. */
  longest: number;
}

/**
 * Compute sentence-length statistics, a proxy for syntactic variety.
 *
 * @param text - Raw input text.
 * @returns The sentence statistics; all zero for text without sentences.
 */
export function sentenceStats(text: string): SentenceStats {
  const lengths = splitSentences(text).map((sentence) => tokenize(sentence).length);
  if (lengths.length === 0) {
    return { count: 0, meanLength: 0, lengthStandardDeviation: 0, shortest: 0, longest: 0 };
  }
  const mean = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  const variance = lengths.reduce((sum, length) => sum + (length - mean) ** 2, 0) / lengths.length;
  return {
    count: lengths.length,
    meanLength: round(mean),
    lengthStandardDeviation: round(Math.sqrt(variance)),
    shortest: Math.min(...lengths),
    longest: Math.max(...lengths),
  };
}
