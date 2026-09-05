/**
 * Text tokenisation and readability measurement.
 *
 * These helpers are a faithful TypeScript port of the measurement pipeline in
 * `scripts/extract_practice_tests.py`, which produced the readability index
 * published by `/v1/tests`. Sharing one implementation is the point: a
 * researcher can measure their own passage with `/v1/analyze/readability` and
 * compare the result directly against the 1,501 measured passages in the index,
 * because both numbers come from the same tokeniser, the same syllable
 * heuristic and the same rounding.
 *
 * Every formula below is a classical, published readability formula; the
 * citations are carried in {@link READABILITY_FORMULAE} so that a response can
 * be traced back to its source.
 */

/** Alphabetic word token, allowing internal apostrophes and hyphens. */
const WORD_RE = /[A-Za-z][A-Za-z'\u2019-]*/g;

/** Sentence-terminating punctuation. */
const TERMINATORS = new Set(['.', '!', '?']);

/** Vowel group, used by the syllable heuristic. */
const VOWEL_GROUP_RE = /[aeiouy]+/g;

/**
 * HTML tag.
 *
 * The character class excludes `<` as well as `>` so that the match can never
 * backtrack across a run of unclosed angle brackets: `<<<<<...` is linear here
 * rather than quadratic.
 */
const TAG_RE = /<[^<>]*>/g;

/** The HTML entities the upstream sources use, and their replacements. */
const ENTITIES: Readonly<Record<string, string>> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

/**
 * Entity pattern.
 *
 * Every entity is replaced in a single pass, so a decoded `&` can never be
 * re-read as the start of another entity (`&amp;lt;` decodes to `&lt;`, not
 * to `<`).
 */
const ENTITY_RE = /&(?:nbsp|amp|quot|#39|lt|gt);/g;

/** Paragraph separator: one or more blank lines. */
const PARAGRAPH_RE = /\n\s*\n+/;

/** Words of three or more syllables count as "complex" for Gunning Fog. */
export const COMPLEX_WORD_SYLLABLES = 3;

/** Provenance for each formula the API reports. */
export const READABILITY_FORMULAE: Readonly<Record<string, string>> = {
  fleschReadingEase: 'Flesch, R. (1948). A new readability yardstick. Journal of Applied Psychology, 32(3).',
  fleschKincaidGrade:
    'Kincaid, J. P., Fishburne, R. P., Rogers, R. L., & Chissom, B. S. (1975). Derivation of new readability formulas. Naval Technical Training Command, Research Branch Report 8-75.',
  gunningFog: 'Gunning, R. (1952). The Technique of Clear Writing. McGraw-Hill.',
  smogIndex: 'McLaughlin, G. H. (1969). SMOG grading: a new readability formula. Journal of Reading, 12(8).',
  colemanLiauIndex:
    'Coleman, M., & Liau, T. L. (1975). A computer readability formula designed for machine scoring. Journal of Applied Psychology, 60(2).',
  automatedReadabilityIndex:
    'Senter, R. J., & Smith, E. A. (1967). Automated Readability Index. Aerospace Medical Research Laboratories, AMRL-TR-66-220.',
};

/**
 * Strip HTML markup and collapse whitespace.
 *
 * @param text - Raw text, possibly containing markup.
 * @returns Plain text with runs of whitespace collapsed to single spaces.
 */
export function stripMarkup(text: string): string {
  const plain = text.replace(TAG_RE, ' ').replace(ENTITY_RE, (entity) => ENTITIES[entity] as string);
  return plain.replace(/\s+/g, ' ').trim();
}

/**
 * Split text into alphabetic word tokens.
 *
 * @param text - Plain text.
 */
export function tokenize(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/**
 * Count sentence terminators, never returning fewer than one.
 *
 * @param text - Plain text.
 */
export function countSentences(text: string): number {
  return Math.max(sentenceSpans(text).length, 1);
}

/**
 * Split text at sentence terminators.
 *
 * A run of terminators (`?!`, `...`) closes one sentence, and a terminator only
 * closes a sentence when whitespace or the end of the input follows it, so
 * `3.14` stays a single token. The scan is a single linear pass rather than a
 * regular expression, which keeps it immune to catastrophic backtracking on
 * adversarial input such as a long run of `!`.
 *
 * @param text - Plain text.
 * @returns The non-empty sentences, trimmed.
 */
export function sentenceSpans(text: string): string[] {
  const spans: string[] = [];
  let start = 0;
  let index = 0;
  while (index < text.length) {
    if (!TERMINATORS.has(text[index] as string)) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < text.length && TERMINATORS.has(text[end] as string)) {
      end += 1;
    }
    const next = text[end];
    if (next === undefined || /\s/.test(next)) {
      // The slice always contains at least the terminator run, so it is never
      // empty after trimming and needs no emptiness guard.
      spans.push(text.slice(start, end).trim());
      start = end;
    }
    index = end;
  }
  const tail = text.slice(start).trim();
  if (tail.length > 0) {
    spans.push(tail);
  }
  return spans;
}

/**
 * Split text into non-empty paragraphs on blank lines.
 *
 * @param text - Raw text, before markup stripping.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(PARAGRAPH_RE)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Estimate the syllable count of an English word.
 *
 * Uses the vowel-group heuristic with a silent-final-`e` correction, which is
 * the counting rule the classical readability formulae were calibrated on.
 *
 * @param word - A single word token.
 * @returns At least one syllable.
 */
export function countSyllables(word: string): number {
  const lowered = word.toLowerCase();
  const groups = lowered.match(VOWEL_GROUP_RE);
  let total = groups === null ? 0 : groups.length;
  if (/(?<!l|e|y)e$/.test(lowered) && total > 1) {
    total -= 1;
  }
  return Math.max(total, 1);
}

/** Round to a fixed number of decimal places. */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** The minimum sample the readability formulae are meaningful on. */
export const MIN_READABILITY_WORDS = 20;

/** Extended readability measurement of an arbitrary passage. */
export interface TextMeasurement {
  /** Running words (alphabetic tokens). */
  words: number;
  /** Sentence count (at least one). */
  sentences: number;
  /** Paragraph count (blank-line separated, at least one). */
  paragraphs: number;
  /** Characters in word tokens (excludes punctuation and spaces). */
  characters: number;
  /** Total heuristic syllable count. */
  syllables: number;
  /** Distinct lower-cased word forms. */
  distinctWords: number;
  /** Words of three or more syllables. */
  complexWords: number;
  /** Mean sentence length in words. */
  avgSentenceLength: number;
  /** Mean syllables per word. */
  avgSyllablesPerWord: number;
  /** Mean word length in characters. */
  avgWordLength: number;
  /** Type-token ratio (lexical diversity). */
  typeTokenRatio: number;
  /** Flesch Reading Ease (higher is easier). */
  fleschReadingEase: number;
  /** Flesch-Kincaid grade level. */
  fleschKincaidGrade: number;
  /** Gunning Fog index. */
  gunningFog: number;
  /** SMOG grade. */
  smogIndex: number;
  /** Coleman-Liau index. */
  colemanLiauIndex: number;
  /** Automated Readability Index. */
  automatedReadabilityIndex: number;
  /** Mean of the five grade-level formulae. */
  meanGradeLevel: number;
  /** Whether the sample is long enough for the formulae to be meaningful. */
  reliable: boolean;
}

/**
 * Measure a passage.
 *
 * The first eight fields are computed exactly as
 * `scripts/extract_practice_tests.py` computes them, so they are directly
 * comparable with the `readability` block of any `/v1/tests` item.
 *
 * @param text - Raw passage; HTML markup is stripped first.
 * @returns The measurement, or `null` when the passage has no words at all.
 */
export function measureText(text: string): TextMeasurement | null {
  const plain = stripMarkup(text);
  const words = tokenize(plain);
  if (words.length === 0) {
    return null;
  }
  const sentences = countSentences(plain);
  const paragraphs = Math.max(splitParagraphs(text).length, 1);
  const syllableCounts = words.map(countSyllables);
  const syllables = syllableCounts.reduce((sum, count) => sum + count, 0);
  const complexWords = syllableCounts.filter((count) => count >= COMPLEX_WORD_SYLLABLES).length;
  const characters = words.reduce((sum, word) => sum + word.length, 0);
  const distinctWords = new Set(words.map((word) => word.toLowerCase())).size;

  const wordsPerSentence = words.length / sentences;
  const syllablesPerWord = syllables / words.length;
  const charactersPerWord = characters / words.length;

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gunningFog = 0.4 * (wordsPerSentence + 100 * (complexWords / words.length));
  const smogIndex = 1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291;
  const colemanLiauIndex =
    0.0588 * (charactersPerWord * 100) - 0.296 * ((sentences / words.length) * 100) - 15.8;
  const automatedReadabilityIndex = 4.71 * charactersPerWord + 0.5 * wordsPerSentence - 21.43;
  const grades = [fleschKincaidGrade, gunningFog, smogIndex, colemanLiauIndex, automatedReadabilityIndex];

  return {
    words: words.length,
    sentences,
    paragraphs,
    characters,
    syllables,
    distinctWords,
    complexWords,
    avgSentenceLength: round(wordsPerSentence, 3),
    avgSyllablesPerWord: round(syllablesPerWord, 3),
    avgWordLength: round(charactersPerWord, 3),
    typeTokenRatio: round(distinctWords / words.length, 4),
    fleschReadingEase: round(fleschReadingEase, 2),
    fleschKincaidGrade: round(fleschKincaidGrade, 2),
    gunningFog: round(gunningFog, 2),
    smogIndex: round(smogIndex, 2),
    colemanLiauIndex: round(colemanLiauIndex, 2),
    automatedReadabilityIndex: round(automatedReadabilityIndex, 2),
    meanGradeLevel: round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length, 2),
    reliable: words.length >= MIN_READABILITY_WORDS,
  };
}

/** A CEFR reading band inferred from Flesch Reading Ease. */
export interface ReadingEaseBand {
  /** Coarse difficulty label. */
  label: string;
  /** Indicative CEFR range for a reader who can cope with the passage. */
  cefr: string;
}

/** Reading Ease thresholds, ordered from easiest to hardest. */
const EASE_BANDS: readonly (readonly [number, string, string])[] = [
  [90, 'very easy', 'A1-A2'],
  [80, 'easy', 'A2'],
  [70, 'fairly easy', 'A2-B1'],
  [60, 'plain English', 'B1'],
  [50, 'fairly difficult', 'B2'],
  [30, 'difficult', 'C1'],
  [Number.NEGATIVE_INFINITY, 'very difficult', 'C2'],
];

/**
 * Describe a Flesch Reading Ease score.
 *
 * The CEFR mapping is indicative and derives from the distribution of the
 * CEFR-graded lessons in the practice-test index, not from an official
 * alignment study.
 *
 * @param ease - Flesch Reading Ease score.
 */
export function describeReadingEase(ease: number): ReadingEaseBand {
  const row = EASE_BANDS.find(([threshold]) => ease >= threshold) as readonly [number, string, string];
  return { label: row[1], cefr: row[2] };
}
