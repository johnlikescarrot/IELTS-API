/**
 * Stateless vocabulary diagnostics.
 *
 * A mock-exam centre lives or dies by its placement test. The open centre
 * <https://github.com/wanli4473/yysd-testcenter> runs a staged vocabulary
 * diagnostic (`server/diagnostic.js`): questions are drawn from levelled word
 * banks, formats follow fixed ratios, and the report grades each stage with a
 * Wilson score interval. This module ports that design to a stateless,
 * authentication-free API: {@link buildQuiz} deterministically samples the
 * 4,174 Cambridge headwords into a quiz, and {@link evaluateQuiz} rebuilds the
 * same quiz from its seed to grade a submitted answer string. No session is
 * stored; the seed *is* the session. Only entries with a published gloss are
 * testable; the rest of the dataset is never sampled.
 *
 * Three formats are supported. In `meaning-choice` the prompt is a headword
 * and the options are definitions; in `word-choice` the prompt is a
 * definition and the options are headwords; in `spelling` the prompt is a
 * definition plus a first-letter hint and the answer is the headword itself.
 * Choice answers are letters (`A`–`D`); spelling answers are words. Answers
 * are submitted as one comma-separated string in question order.
 */

import { allEntries } from '../data/vocabulary.js';
import { badRequest } from './errors.js';
import { hashString, mulberry32, seededIndices } from './rng.js';

import type { VocabularyEntry } from '../types.js';

/** Question formats, in canonical order. */
export const DIAGNOSTIC_FORMATS = ['meaning-choice', 'word-choice', 'spelling'] as const;

/** One quiz question format. */
export type DiagnosticFormat = (typeof DIAGNOSTIC_FORMATS)[number];

/** Format shares; largest remainders win the leftover questions. */
const FORMAT_RATIOS: readonly (readonly [DiagnosticFormat, number])[] = [
  ['meaning-choice', 0.35],
  ['word-choice', 0.35],
  ['spelling', 0.3],
];

/** Fewest questions a quiz accepts. */
export const MIN_QUESTIONS = 4;

/** Most questions a quiz accepts. */
export const MAX_QUESTIONS = 40;

/** Default quiz length. */
export const DEFAULT_QUESTIONS = 12;

/** Seed used when the caller does not supply one. */
export const DEFAULT_SEED = 'ielts-diagnostic';

/** Options per choice question. */
export const CHOICE_COUNT = 4;

/** Letters labelling the choice options. */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Accuracy at or above which a quiz passes. */
export const PASS_THRESHOLD = 0.8;

/** Accuracy at or above which a quiz is excellent. */
export const EXCELLENT_THRESHOLD = 0.9;

/** z-value of the two-sided 95% Wilson score interval. */
const WILSON_Z_95 = 1.96;

/** Overall rating of a graded quiz. */
export type DiagnosticRating = 'excellent' | 'good' | 'weak';

/** A vocabulary entry that can appear in a quiz: a headword with a published gloss. */
export type TestableEntry = VocabularyEntry & { definition: string };

/**
 * Vocabulary entries usable in quizzes.
 *
 * @returns Entries with a non-null definition, in dataset order.
 */
export function testableEntries(): readonly TestableEntry[] {
  return allEntries().filter((entry): entry is TestableEntry => entry.definition !== null);
}

/** One quiz question. Correct answers are never included. */
export type DiagnosticQuestion = {
  /** Zero-based position in the quiz; answers align to this order. */
  index: number;
  /** Vocabulary entry identifier (e.g. `w00001`). */
  entryId: string;
  /** Question format. */
  format: DiagnosticFormat;
  /** The headword (meaning-choice) or its definition (other formats). */
  prompt: string;
  /** First-letter hint for spelling questions, otherwise `null`. */
  hint: string | null;
  /** Four options for choice questions, otherwise `null`. */
  choices: readonly string[] | null;
};

/** A generated quiz. */
export type DiagnosticQuiz = {
  /** Seed the quiz was built from. */
  seed: string;
  /** Number of questions. */
  count: number;
  /** Formats used, in canonical order. */
  formats: readonly DiagnosticFormat[];
  /** Questions in answering order. */
  questions: readonly DiagnosticQuestion[];
};

/** Round a proportion to four decimals for stable JSON output. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Split a question count across formats by largest remainder.
 *
 * @param count - Number of questions.
 * @param formats - Formats to use; an empty list yields all zeros.
 * @returns Per-format question counts, keyed by every format.
 */
export function allocateFormats(
  count: number,
  formats: readonly DiagnosticFormat[],
): Record<DiagnosticFormat, number> {
  const totals: Record<DiagnosticFormat, number> = {
    'meaning-choice': 0,
    'word-choice': 0,
    spelling: 0,
  };
  const selected = FORMAT_RATIOS.filter(([format]) => formats.includes(format));
  if (selected.length === 0) {
    return totals;
  }
  const weight = selected.reduce((sum, entry) => sum + entry[1], 0);
  const lots = selected.map(([format, ratio]) => {
    const exact = (count * ratio) / weight;
    const whole = Math.floor(exact);
    return { format, count: whole, rest: exact - whole };
  });
  lots.sort((left, right) => right.rest - left.rest);
  let remaining = count - lots.reduce((sum, lot) => sum + lot.count, 0);
  for (const lot of lots) {
    if (remaining <= 0) {
      break;
    }
    lot.count += 1;
    remaining -= 1;
  }
  for (const lot of lots) {
    totals[lot.format] = lot.count;
  }
  return totals;
}

/**
 * Shuffle values in place with a seeded generator.
 *
 * @param values - Values to shuffle.
 * @param seed - Seed string.
 */
function shuffleInPlace<T>(values: T[], seed: string): void {
  const random = mulberry32(hashString(seed));
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const left = values[index] as T;
    const right = values[other] as T;
    values[index] = right;
    values[other] = left;
  }
}

/**
 * Draw distractor texts for a choice question.
 *
 * Options are distinct entries; when the source workbook repeats a gloss for
 * two headwords the duplicated text is simply accepted under either letter at
 * grading time, because grading compares option *text*, not positions.
 *
 * @param seed - Quiz seed.
 * @param position - Zero-based question position.
 * @param kind - Whether options are headwords or definitions.
 * @param entryIndex - Dataset index of the tested entry.
 * @param entries - Testable vocabulary entries.
 * @returns Three distractor texts.
 */
function drawDistractors(
  seed: string,
  position: number,
  kind: 'word' | 'definition',
  entryIndex: number,
  entries: readonly TestableEntry[],
): string[] {
  const candidates = seededIndices(`${seed}|q${position}|${kind}`, entries.length, CHOICE_COUNT)
    .filter((candidate) => candidate !== entryIndex)
    .slice(0, CHOICE_COUNT - 1);
  return candidates.map((candidate) => {
    const entry = entries[candidate] as TestableEntry;
    return kind === 'word' ? entry.word : entry.definition;
  });
}

/**
 * Build one question for a vocabulary entry.
 *
 * @param seed - Quiz seed.
 * @param position - Zero-based question position.
 * @param entry - Tested vocabulary entry.
 * @param format - Question format.
 * @param entryIndex - Dataset index of the tested entry.
 * @param entries - Testable vocabulary entries.
 * @returns The question, without its answer.
 */
function buildQuestion(
  seed: string,
  position: number,
  entry: TestableEntry,
  format: DiagnosticFormat,
  entryIndex: number,
  entries: readonly TestableEntry[],
): DiagnosticQuestion {
  if (format === 'spelling') {
    return {
      index: position,
      entryId: entry.id,
      format,
      prompt: entry.definition,
      hint: `Starts with \u201c${entry.word.charAt(0)}\u201d, ${entry.word.length} letters.`,
      choices: null,
    };
  }
  const kind = format === 'meaning-choice' ? 'definition' : 'word';
  const correct = kind === 'definition' ? entry.definition : entry.word;
  const options = [...drawDistractors(seed, position, kind, entryIndex, entries), correct];
  shuffleInPlace(options, `${seed}|q${position}|order`);
  return {
    index: position,
    entryId: entry.id,
    format,
    prompt: kind === 'definition' ? entry.word : entry.definition,
    hint: null,
    choices: options,
  };
}

/** Options accepted by {@link buildQuiz}. */
export type BuildQuizOptions = {
  /** Seed string; identical seeds yield identical quizzes. */
  seed: string;
  /** Number of questions. */
  count: number;
  /** Formats to use; order is normalised to the canonical order. */
  formats: readonly DiagnosticFormat[];
};

/**
 * Build a deterministic quiz from the vocabulary dataset.
 *
 * @param options - Quiz options.
 * @returns The quiz, without answers.
 */
export function buildQuiz(options: BuildQuizOptions): DiagnosticQuiz {
  const entries = testableEntries();
  const formats = DIAGNOSTIC_FORMATS.filter((format) => options.formats.includes(format));
  const allocation = allocateFormats(options.count, formats);
  const slots: DiagnosticFormat[] = [];
  for (const format of formats) {
    for (let done = 0; done < allocation[format]; done += 1) {
      slots.push(format);
    }
  }
  shuffleInPlace(slots, `${options.seed}|slots`);
  const indices = seededIndices(`${options.seed}|entries`, entries.length, options.count);
  const questions = indices.map((entryIndex, position) => {
    const entry = entries[entryIndex] as TestableEntry;
    return buildQuestion(
      options.seed,
      position,
      entry,
      slots[position] as DiagnosticFormat,
      entryIndex,
      entries,
    );
  });
  return { seed: options.seed, count: questions.length, formats, questions };
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * @param correct - Number of successes.
 * @param total - Number of trials.
 * @returns The 95% interval bounds.
 */
export function wilsonInterval(correct: number, total: number): { lower: number; upper: number } {
  const trials = Math.max(0, Math.floor(total));
  const hits = Math.max(0, Math.min(trials, Math.floor(correct)));
  if (trials === 0) {
    return { lower: 0, upper: 0 };
  }
  const centre = hits / trials;
  const squared = WILSON_Z_95 * WILSON_Z_95;
  const denominator = 1 + squared / trials;
  const middle = centre + squared / (2 * trials);
  const margin = WILSON_Z_95 * Math.sqrt((centre * (1 - centre) + squared / (4 * trials)) / trials);
  return {
    lower: round4(Math.max(0, (middle - margin) / denominator)),
    upper: round4(Math.min(1, (middle + margin) / denominator)),
  };
}

/**
 * Rate an accuracy against the pass and excellence thresholds.
 *
 * @param accuracy - Proportion correct.
 * @returns The rating.
 */
export function rateAccuracy(accuracy: number): DiagnosticRating {
  if (accuracy >= EXCELLENT_THRESHOLD) {
    return 'excellent';
  }
  if (accuracy >= PASS_THRESHOLD) {
    return 'good';
  }
  return 'weak';
}

/** Normalise a spelling answer for comparison. */
function normaliseSpelling(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Per-format sub-score of a graded quiz. */
export type DiagnosticFormatScore = {
  /** Question format. */
  format: DiagnosticFormat;
  /** Questions answered correctly. */
  correct: number;
  /** Questions asked. */
  total: number;
  /** Proportion correct. */
  accuracy: number;
};

/** One graded answer. */
export type DiagnosticItemResult = {
  /** Zero-based question position. */
  index: number;
  /** Vocabulary entry identifier. */
  entryId: string;
  /** Tested headword. */
  word: string;
  /** Question format. */
  format: DiagnosticFormat;
  /** Whether the submitted answer was accepted. */
  correct: boolean;
  /** Expected answer: the correct letter, or the headword for spelling. */
  expected: string;
  /** Correct option text (choice formats) or the headword (spelling). */
  expectedText: string;
  /** Submitted answer, echoed verbatim. */
  received: string;
};

/** A graded quiz. */
export type DiagnosticReport = {
  /** Seed the quiz was rebuilt from. */
  seed: string;
  /** Questions asked. */
  total: number;
  /** Questions answered correctly. */
  score: number;
  /** Proportion correct. */
  accuracy: number;
  /** 95% Wilson score interval for the accuracy. */
  wilson95: { lower: number; upper: number };
  /** Overall rating. */
  rating: DiagnosticRating;
  /** Sub-scores by format. */
  perFormat: readonly DiagnosticFormatScore[];
  /** Per-question results. */
  items: readonly DiagnosticItemResult[];
  /** Teaching advice derived from the sub-scores. */
  advice: string[];
  /** Daily headword recommendation. */
  recommendation: { wordsPerDay: number; message: string };
};

/** Grade one choice answer by comparing option text. */
function gradeChoice(
  question: DiagnosticQuestion,
  entry: TestableEntry,
  received: string,
): { correct: boolean; expected: string; expectedText: string } {
  const options = question.choices as readonly string[];
  const expectedText = question.format === 'meaning-choice' ? entry.definition : entry.word;
  const position = options.indexOf(expectedText);
  const expected = CHOICE_LETTERS[position] as string;
  const letter = received.trim().toUpperCase();
  const picked = CHOICE_LETTERS.indexOf(letter as (typeof CHOICE_LETTERS)[number]);
  const correct = picked >= 0 && options[picked] === expectedText;
  return { correct, expected, expectedText };
}

/** Grade one spelling answer by normalised comparison. */
function gradeSpelling(
  entry: TestableEntry,
  received: string,
): { correct: boolean; expected: string; expectedText: string } {
  const correct = normaliseSpelling(received) === normaliseSpelling(entry.word);
  return { correct, expected: entry.word, expectedText: entry.word };
}

/** Daily headword recommendation for a rating. */
function recommendFor(rating: DiagnosticRating): { wordsPerDay: number; message: string } {
  if (rating === 'excellent') {
    return {
      wordsPerDay: 5,
      message: 'Hold your level with 5 new headwords a day and spend the freed time on timed practice.',
    };
  }
  if (rating === 'good') {
    return {
      wordsPerDay: 10,
      message: 'Consolidate with 10 new headwords a day, reviewing each one after 1, 3 and 7 days.',
    };
  }
  return {
    wordsPerDay: 15,
    message: 'Rebuild the foundation with 15 new headwords a day before attempting timed practice.',
  };
}

/** Options accepted by {@link evaluateQuiz}. */
export type EvaluateQuizOptions = {
  /** Seed the quiz was built from. */
  seed: string;
  /** Number of questions. */
  count: number;
  /** Formats used; order is normalised to the canonical order. */
  formats: readonly DiagnosticFormat[];
  /** Submitted answers in question order. */
  answers: readonly string[];
};

/**
 * Grade submitted answers against the quiz rebuilt from the seed.
 *
 * @param options - Evaluation options.
 * @returns The graded report.
 */
export function evaluateQuiz(options: EvaluateQuizOptions): DiagnosticReport {
  const quiz = buildQuiz({ seed: options.seed, count: options.count, formats: options.formats });
  if (options.answers.length !== quiz.questions.length) {
    throw badRequest(
      `Expected ${quiz.questions.length} answers but received ${options.answers.length}.`,
      {
        parameter: 'answers',
        expected: String(quiz.questions.length),
        received: String(options.answers.length),
      },
    );
  }
  const entries = testableEntries();
  const items = quiz.questions.map((question, position) => {
    const entry = entries.find((candidate) => candidate.id === question.entryId) as TestableEntry;
    const received = options.answers[position] as string;
    const graded =
      question.format === 'spelling'
        ? gradeSpelling(entry, received)
        : gradeChoice(question, entry, received);
    return {
      index: question.index,
      entryId: question.entryId,
      word: entry.word,
      format: question.format,
      correct: graded.correct,
      expected: graded.expected,
      expectedText: graded.expectedText,
      received,
    };
  });
  const score = items.filter((item) => item.correct).length;
  const accuracy = items.length === 0 ? 0 : round4(score / items.length);
  const rating = rateAccuracy(accuracy);
  const perFormat = quiz.formats.map((format) => {
    const group = items.filter((item) => item.format === format);
    const hits = group.filter((item) => item.correct).length;
    return {
      format,
      correct: hits,
      total: group.length,
      accuracy: group.length === 0 ? 0 : round4(hits / group.length),
    };
  });
  const weakest = [...perFormat].sort((left, right) => left.accuracy - right.accuracy)[0];
  const advice = [
    `You answered ${score} of ${items.length} correctly (${Math.round(accuracy * 100)}%).`,
    rating === 'excellent'
      ? 'Excellent: your recognition vocabulary is ready for timed practice.'
      : rating === 'good'
        ? 'Good: a pass, with one format usually dragging the total down.'
        : 'Weak: postpone timed practice until recognition is automatic.',
  ];
  if (weakest !== undefined && weakest.accuracy < 1) {
    advice.push(
      `Your weakest format was ${weakest.format} (${Math.round(weakest.accuracy * 100)}%): drill it with /v1/vocabulary/random before retaking this quiz.`,
    );
  }
  return {
    seed: quiz.seed,
    total: items.length,
    score,
    accuracy,
    wilson95: wilsonInterval(score, items.length),
    rating,
    perFormat,
    items,
    advice,
    recommendation: recommendFor(rating),
  };
}
