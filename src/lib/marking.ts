/**
 * The answer-marking engine.
 *
 * Every mock-exam centre re-implements the same fiddly rules to mark a
 * Listening or Reading answer sheet, and every implementation gets them subtly
 * wrong. The rules that Cambridge prints in the back of the practice volumes
 * are:
 *
 * - Marking is **not** case-sensitive: `TRUE`, `True` and `true` all score.
 * - Surrounding punctuation and articles printed in the key as optional are
 *   ignored: a key of `(the) river bank` accepts both `river bank` and
 *   `the river bank`.
 * - A key may list alternatives separated by `/` or `OR`: any one of them
 *   scores, and only one may be given.
 * - British and American spellings both score, so `colour` and `color` are the
 *   same answer.
 * - Answers over the stated word limit score zero even when they contain the
 *   key: `NO MORE THAN TWO WORDS` means exactly that.
 * - Hyphenated forms count as one word; numbers written as digits count as one
 *   word.
 *
 * All of that is implemented here as a pure function over strings, so a client
 * can mark an answer sheet without sending anything but the two lists. Nothing
 * is stored: the engine is stateless and the endpoint that wraps it is a `GET`.
 *
 * Spelling is judged by exact match after normalisation plus an explicit
 * British/American equivalence rule; the engine deliberately does **not** guess
 * at typos, because an examiner does not either. It does, however, report a
 * `nearMiss` flag when the only difference is a single edit, so that a learner
 * can see which marks were lost to spelling rather than to comprehension.
 */

/** Result of marking one question. */
export type MarkedAnswer = {
  /** One-based question number. */
  question: number;
  /** The answer the candidate gave, echoed verbatim. */
  given: string;
  /** The key as published, echoed verbatim. */
  expected: string;
  /** Accepted forms the key expands to. */
  accepted: string[];
  /** Whether the answer scores a mark. */
  correct: boolean;
  /** Why the answer scored or failed. */
  reason: MarkReason;
  /** True when a wrong answer is within one edit of an accepted form. */
  nearMiss: boolean;
};

/** Why an answer scored, or did not. */
export type MarkReason =
  | 'exact'
  | 'case-insensitive'
  | 'optional-word'
  | 'alternative'
  | 'spelling-variant'
  | 'blank'
  | 'over-word-limit'
  | 'incorrect';

/** Summary of a marked answer sheet. */
export type MarkedSheet = {
  /** Per-question results, in question order. */
  answers: MarkedAnswer[];
  /** Number of questions on the sheet. */
  questions: number;
  /** Number of correct answers. */
  correct: number;
  /** Number of incorrect answers, excluding blanks. */
  incorrect: number;
  /** Number of questions left blank. */
  blank: number;
  /** Number of wrong answers that were within one edit of the key. */
  nearMisses: number;
  /** Correct answers as a share of the questions, to two decimals. */
  accuracy: number;
};

/**
 * British/American spelling pairs that both score.
 *
 * The list covers the productive suffix rules rather than a dictionary: it is
 * applied to each token, so `organise`/`organize` and `organisation`/
 * `organization` are both handled by the same rule.
 */
const SPELLING_RULES: readonly (readonly [RegExp, string])[] = [
  [/ise\b/g, 'ize'],
  [/isation\b/g, 'ization'],
  [/ising\b/g, 'izing'],
  [/ised\b/g, 'ized'],
  [/yse\b/g, 'yze'],
  [/our\b/g, 'or'],
  [/ours\b/g, 'ors'],
  [/re\b/g, 'er'],
  [/ogue\b/g, 'og'],
  [/ll(ing|ed|er)\b/g, 'l$1'],
  [/ae/g, 'e'],
  [/oe/g, 'e'],
];

/** Words a key may print as optional even without brackets. */
const OPTIONAL_WORDS = new Set(['a', 'an', 'the']);

/**
 * Reduce a string to its comparable form: lower case, no surrounding
 * punctuation, single-spaced.
 *
 * @param value - Raw answer or key.
 */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[.,;:!?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Apply the British/American equivalence rules to a normalised string.
 *
 * @param value - Normalised string.
 */
export function foldSpelling(value: string): string {
  return SPELLING_RULES.reduce(
    (folded, [pattern, replacement]) => folded.replace(pattern, replacement),
    value,
  );
}

/**
 * Count words the way an IELTS word limit does: hyphenated compounds and
 * numbers written as digits each count as one word.
 *
 * @param value - Answer text.
 */
export function countWords(value: string): number {
  const cleaned = normalise(value.replace(/(\d),(\d)/g, '$1$2')).replace(/-/g, '');
  return cleaned.length === 0 ? 0 : cleaned.split(' ').filter((token) => token.length > 0).length;
}

/**
 * Expand a published key into every form that scores a mark.
 *
 * Alternatives are split on `/` and on a standalone `OR`; bracketed segments
 * are expanded into a form with and a form without them.
 *
 * @param key - The key exactly as published.
 * @returns Accepted forms, normalised, in publication order and deduplicated.
 */
export function expandKey(key: string): string[] {
  const alternatives = key
    .split(/\s+OR\s+|\//i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const forms = new Set<string>();
  for (const alternative of alternatives) {
    for (const variant of expandBrackets(alternative)) {
      const normalised = normalise(variant);
      if (normalised.length > 0) {
        forms.add(normalised);
      }
    }
  }
  return [...forms];
}

/**
 * Expand every bracketed segment of one alternative into present/absent forms.
 *
 * @param value - One alternative from the key.
 */
function expandBrackets(value: string): string[] {
  const match = /\(([^()]*)\)/.exec(value) as ([string, string] & { index: number }) | null;
  if (match === null) {
    return [value];
  }
  const before = value.slice(0, match.index);
  const after = value.slice(match.index + match[0].length);
  return [`${before}${match[1]}${after}`, `${before}${after}`].flatMap((variant) => expandBrackets(variant));
}

/** Whether a key lists alternatives separated by `/` or a standalone `OR`. */
function hasAlternatives(key: string): boolean {
  return /\s+OR\s+|\//i.test(key);
}

/** Drop leading articles so `(the) x` and `x` compare equal even without brackets. */
function dropArticles(value: string): string {
  const tokens = value.split(' ').filter((token) => token.length > 0);
  while (tokens.length > 1 && OPTIONAL_WORDS.has(tokens[0] as string)) {
    tokens.shift();
  }
  return tokens.join(' ');
}

/**
 * Levenshtein distance, capped at 2 — the engine only ever asks "is this within
 * one edit?", so the full matrix is never needed.
 *
 * @param left - First string.
 * @param right - Second string.
 * @returns The edit distance, or `2` when it exceeds one edit.
 */
export function withinOneEdit(left: string, right: string): boolean {
  if (left === right) {
    return false;
  }
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  let shortIndex = 0;
  let longIndex = 0;
  let edits = 0;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) {
      return false;
    }
    if (shorter.length === longer.length) {
      shortIndex += 1;
    }
    longIndex += 1;
  }
  return true;
}

/** Options accepted by {@link markSheet}. */
export interface MarkOptions {
  /** Maximum words allowed per answer, when the rubric states one. */
  wordLimit?: number | undefined;
}

/**
 * Decide how one answer scores against one key.
 *
 * @param given - The candidate's answer.
 * @param expected - The key as published.
 * @param options - Marking options.
 */
export function markAnswer(
  given: string,
  expected: string,
  options: MarkOptions = {},
): {
  correct: boolean;
  reason: MarkReason;
  accepted: string[];
  nearMiss: boolean;
} {
  const accepted = expandKey(expected);
  const trimmed = given.trim();
  if (trimmed.length === 0) {
    return { correct: false, reason: 'blank', accepted, nearMiss: false };
  }
  const limit = options.wordLimit;
  if (limit !== undefined && countWords(trimmed) > limit) {
    return { correct: false, reason: 'over-word-limit', accepted, nearMiss: false };
  }
  const candidate = normalise(trimmed);

  const index = accepted.indexOf(candidate);
  if (index === 0) {
    return {
      correct: true,
      reason: accepted[0] === trimmed ? 'exact' : 'case-insensitive',
      accepted,
      nearMiss: false,
    };
  }
  if (index > 0) {
    // A later form is an "alternative" only when the key really listed one;
    // otherwise it is a bracketed optional word expanded into its own form.
    return {
      correct: true,
      reason: hasAlternatives(expected) ? 'alternative' : 'optional-word',
      accepted,
      nearMiss: false,
    };
  }
  const bare = dropArticles(candidate);
  if (accepted.some((form) => dropArticles(form) === bare)) {
    return { correct: true, reason: 'optional-word', accepted, nearMiss: false };
  }
  const folded = foldSpelling(bare);
  if (accepted.some((form) => foldSpelling(dropArticles(form)) === folded)) {
    return { correct: true, reason: 'spelling-variant', accepted, nearMiss: false };
  }
  const nearMiss = accepted.some((form) => withinOneEdit(foldSpelling(dropArticles(form)), folded));
  return { correct: false, reason: 'incorrect', accepted, nearMiss };
}

/**
 * Mark a whole answer sheet.
 *
 * @param answers - Candidate answers, in question order; missing entries are blanks.
 * @param key - Published answers, in question order.
 * @param options - Marking options.
 */
export function markSheet(
  answers: readonly string[],
  key: readonly string[],
  options: MarkOptions = {},
): MarkedSheet {
  const marked = key.map((expected, position) => {
    const given = answers[position] ?? '';
    const result = markAnswer(given, expected, options);
    return {
      question: position + 1,
      given: given.trim(),
      expected,
      accepted: result.accepted,
      correct: result.correct,
      reason: result.reason,
      nearMiss: result.nearMiss,
    };
  });
  const correct = marked.filter((entry) => entry.correct).length;
  const blank = marked.filter((entry) => entry.reason === 'blank').length;
  return {
    answers: marked,
    questions: marked.length,
    correct,
    incorrect: marked.length - correct - blank,
    blank,
    nearMisses: marked.filter((entry) => entry.nearMiss).length,
    accuracy: marked.length === 0 ? 0 : Math.round((correct / marked.length) * 100) / 100,
  };
}
