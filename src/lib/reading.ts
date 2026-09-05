/** Strict, deterministic reading feedback. No fuzzy matching and no IELTS band prediction. */

import { badRequest } from './errors.js';
import { readingEntry } from '../data/reading.js';

import type { ReadingAnswer, ReadingFeedback, ReadingGrade, ReadingSubmission } from '../reading-types.js';

/** Maximum submitted answer length, in Unicode code points. */
export const MAX_READING_ANSWER_LENGTH = 256;

/** Normalise only canonical Unicode, letter case and whitespace; preserve punctuation and accents. */
export function normalizeReadingAnswer(answer: string): string {
  return answer.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** Narrow untrusted JSON objects without accepting null or arrays. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate the whole submission before awarding any marks. Unknown or duplicate IDs are errors. */
export function parseReadingSubmission(body: unknown, questionIds: readonly string[]): ReadingSubmission {
  if (
    !isRecord(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'answers') ||
    !Array.isArray(body.answers)
  ) {
    throw badRequest('Expected an object containing only an answers array.');
  }
  if (body.answers.length > questionIds.length) {
    throw badRequest('There are more submitted answers than questions.');
  }
  const seen = new Set<string>();
  const answers: ReadingAnswer[] = [];
  for (const item of body.answers) {
    if (
      !isRecord(item) ||
      Object.keys(item).length !== 2 ||
      !Object.hasOwn(item, 'questionId') ||
      !Object.hasOwn(item, 'answer') ||
      typeof item.questionId !== 'string' ||
      typeof item.answer !== 'string'
    ) {
      throw badRequest('Each answer must contain only string questionId and answer fields.');
    }
    if (!questionIds.includes(item.questionId)) {
      throw badRequest('An answer refers to an unknown question.');
    }
    if (seen.has(item.questionId)) {
      throw badRequest('Each question can be answered at most once.');
    }
    if ([...item.answer].length > MAX_READING_ANSWER_LENGTH) {
      throw badRequest(`Answers must not exceed ${MAX_READING_ANSWER_LENGTH} characters.`);
    }
    seen.add(item.questionId);
    answers.push({ questionId: item.questionId, answer: item.answer });
  }
  return { answers };
}

/**
 * Grade an untrusted submission against the versioned original collection.
 * Each question is worth one mark. Missing/blank answers receive no mark.
 * Short answers must respect the whitespace-delimited word limit. Feedback
 * includes accepted variants and paragraph evidence, but never echoes input.
 */
export function gradeReading(id: string, body: unknown): ReadingGrade {
  const { exercise, solutions } = readingEntry(id);
  const submission = parseReadingSubmission(
    body,
    exercise.questions.map((question) => question.id),
  );
  const answers = new Map(
    submission.answers.map(({ questionId, answer }) => [questionId, normalizeReadingAnswer(answer)]),
  );
  const feedback: ReadingFeedback[] = exercise.questions.map((question) => {
    const solution = solutions.find((candidate) => candidate.questionId === question.id)!;
    const answer = answers.get(question.id) ?? '';
    let outcome: ReadingFeedback['outcome'];
    if (answer.length === 0) {
      outcome = 'unanswered';
    } else if (question.type === 'short-answer' && answer.split(' ').length > question.maxWords) {
      outcome = 'word-limit-exceeded';
    } else {
      outcome = solution.acceptedAnswers.some((candidate) => normalizeReadingAnswer(candidate) === answer)
        ? 'correct'
        : 'incorrect';
    }
    return { ...solution, outcome };
  });
  const correct = feedback.filter((result) => result.outcome === 'correct').length;
  const unanswered = feedback.filter((result) => result.outcome === 'unanswered').length;
  return {
    exerciseId: id,
    correct,
    incorrect: feedback.length - correct - unanswered,
    unanswered,
    total: feedback.length,
    percentage: Math.round((correct / feedback.length) * 10000) / 100,
    feedback,
  };
}
