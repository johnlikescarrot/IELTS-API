/**
 * A deterministic, day-level SM-2 adaptation. No clock, database, user account,
 * random number or mutable singleton is involved. See docs/REVIEW.md for the
 * exact policy, operational bounds and same-day practice convention.
 */
import { badRequest } from './errors.js';
import { readDate, readNumber, readObject, readString } from './input.js';
import type { ReviewCard, ReviewQueue, ReviewQueueItem, ReviewResult } from '../types.js';

const DAY_MS = 86_400_000;
const MAX_COUNTER = 1_000_000;
const MAX_INTERVAL = 36_500;
const MAX_EASE = 10;
const MAX_CARDS = 500;

/** Versioned policy shared by the scheduler and its discovery endpoint. */
export const REVIEW_POLICY = Object.freeze({
  algorithm: 'sm2-v1',
  name: 'Bounded day-level SM-2 adaptation',
  sourceUrl: 'https://super-memory.com/english/ol/sm2.htm',
  initialEaseFactor: 2.5,
  minimumEaseFactor: 1.3,
  maximumEaseFactor: MAX_EASE,
  maximumIntervalDays: MAX_INTERVAL,
  maximumCounter: MAX_COUNTER,
  maximumQueueCards: MAX_CARDS,
  grades: Object.freeze(
    [
      { grade: 0, recall: 'No recall, even after seeing the answer.' },
      { grade: 1, recall: 'Incorrect; the answer is familiar when revealed.' },
      { grade: 2, recall: 'Incorrect; the revealed answer now seems easy.' },
      { grade: 3, recall: 'Correct, but with substantial effort.' },
      { grade: 4, recall: 'Correct after a little hesitation.' },
      { grade: 5, recall: 'Correct and readily recalled.' },
    ].map((grade) => Object.freeze(grade)),
  ),
  intervals: 'Successful repetitions: 1 day, 6 days, then ceil(previous interval × previous ease).',
  easeUpdate: 'EF + 0.1 - (5 - grade) × (0.08 + (5 - grade) × 0.02), rounded to two decimals.',
  lapse: 'Grades below 3 reset repetitions to 0, add one lapse and schedule 1 day; updated ease is retained.',
  sameDay: 'Grades below 4 request local practice today. Do not submit those drills as scheduled reviews.',
  calendar: 'Explicit UTC dates only. Review on or after dueOn; the next interval starts on the review date.',
  queueOrder:
    'Previously reviewed cards first: dueOn ascending, lapses descending, then ASCII id ascending. New cards last.',
  storage: 'client-owned',
  note: 'A transparent scheduling baseline, not a prediction of memory retention, mastery or an IELTS band.',
} as const);

/** Add whole UTC days without local-time/DST dependence or extended-year date strings. */
function addDays(on: string, days: number): string {
  const result = new Date(Date.parse(`${on}T00:00:00.000Z`) + days * DAY_MS).toISOString();
  if (result.startsWith('+')) {
    throw badRequest('The next due date would exceed year 9999.', { field: 'on' });
  }
  return result.slice(0, 10);
}

/** Validate and copy a serialised card. A scheduling state is not an attestation of learner progress. */
export function parseReviewCard(value: unknown): ReviewCard {
  const card = readObject(value, 'card', [
    'id',
    'algorithm',
    'repetitions',
    'lapses',
    'intervalDays',
    'easeFactor',
    'lastReviewedOn',
    'dueOn',
  ]);
  const id = readString(card.id, 'card.id', 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw badRequest('Field "card.id" must be an ASCII identifier, not learner information.', {
      field: 'card.id',
    });
  }
  if (card.algorithm !== REVIEW_POLICY.algorithm) {
    throw badRequest('Unsupported review algorithm; use sm2-v1.', { field: 'card.algorithm' });
  }
  const repetitions = readNumber(card.repetitions, 'card.repetitions', 0, MAX_COUNTER);
  const lapses = readNumber(card.lapses, 'card.lapses', 0, MAX_COUNTER);
  const intervalDays = readNumber(card.intervalDays, 'card.intervalDays', 0, MAX_INTERVAL);
  const easeFactor = readNumber(card.easeFactor, 'card.easeFactor', 1.3, MAX_EASE, false);
  if (Math.round(easeFactor * 100) / 100 !== easeFactor) {
    throw badRequest('Field "card.easeFactor" must have at most two decimal places.', {
      field: 'card.easeFactor',
    });
  }
  const dueOn = readDate(card.dueOn, 'card.dueOn');
  const lastReviewedOn =
    card.lastReviewedOn === null ? null : readDate(card.lastReviewedOn, 'card.lastReviewedOn');
  if (lastReviewedOn === null) {
    if (repetitions !== 0 || lapses !== 0 || intervalDays !== 0 || easeFactor !== 2.5) {
      throw badRequest('A new card must have zero counters and interval, and easeFactor 2.5.', {
        field: 'card',
      });
    }
  } else if (
    intervalDays === 0 ||
    (repetitions === 0 && lapses === 0) ||
    addDays(lastReviewedOn, intervalDays) !== dueOn
  ) {
    throw badRequest(
      'A reviewed card must have a positive interval, review history and a consistent dueOn.',
      { field: 'card' },
    );
  }
  return { id, algorithm: 'sm2-v1', repetitions, lapses, intervalDays, easeFactor, lastReviewedOn, dueOn };
}

/** Create an unreviewed card due on the explicit date. IDs may refer to vocabulary entries or local cards. */
export function createReviewCard(id: string, on: string): ReviewCard {
  return parseReviewCard({
    id,
    algorithm: 'sm2-v1',
    repetitions: 0,
    lapses: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lastReviewedOn: null,
    dueOn: on,
  });
}

/**
 * Compute one scheduled review. The previous state is neither mutated nor saved.
 * Replaying the same input returns the same result; resubmitting the updated
 * state before its due date is rejected. Local same-day drills do not advance it.
 */
export function scheduleReview(state: ReviewCard, grade: number, on: string): ReviewResult {
  const card = parseReviewCard(state);
  readNumber(grade, 'grade', 0, 5);
  readDate(on, 'on');
  if (on < card.dueOn) {
    throw badRequest('A scheduled review cannot precede card.dueOn.', { field: 'on' });
  }
  let interval = 1;
  let reason: ReviewResult['reason'];
  let repetitions = card.repetitions + 1;
  let lapses = card.lapses;
  if (grade < 3) {
    repetitions = 0;
    lapses += 1;
    reason = 'lapse';
  } else if (card.repetitions === 0) {
    reason = 'first-success';
  } else if (card.repetitions === 1) {
    interval = 6;
    reason = 'second-success';
  } else {
    // Integer hundredths avoid spurious ceil() jumps caused by binary floating point.
    interval = Math.ceil((card.intervalDays * Math.round(card.easeFactor * 100)) / 100);
    reason = 'expanded';
  }
  const ease = Math.round((card.easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)) * 100) / 100;
  const intervalDays = Math.min(MAX_INTERVAL, interval);
  const easeFactor = Math.max(1.3, Math.min(MAX_EASE, ease));
  const updated = parseReviewCard({
    ...card,
    repetitions,
    lapses,
    intervalDays,
    easeFactor,
    lastReviewedOn: on,
    dueOn: addDays(on, intervalDays),
  });
  return {
    card: updated,
    grade,
    on,
    reason,
    repeatToday: grade < 4,
    intervalCapped: interval !== intervalDays,
    easeClamped: ease !== easeFactor,
  };
}

/**
 * Select an oldest-due-first queue from at most 500 client-owned states.
 * Mature cards never disappear merely because they have been recalled before.
 * Counts cover the whole input, before either budget is applied.
 */
export function buildReviewQueue(
  states: readonly ReviewCard[],
  on: string,
  limit = 20,
  newLimit = 10,
): ReviewQueue {
  readDate(on, 'on');
  readNumber(limit, 'limit', 1, 100);
  readNumber(newLimit, 'newLimit', 0, 50);
  if (!Array.isArray(states) || states.length > MAX_CARDS) {
    throw badRequest('Field "cards" must be an array of at most 500 cards.', { field: 'cards' });
  }
  const ids = new Set<string>();
  const candidates: ReviewQueueItem[] = [];
  const counts = { total: states.length, overdue: 0, due: 0, new: 0, scheduled: 0 };
  for (const state of states) {
    const card = parseReviewCard(state);
    if (ids.has(card.id)) {
      throw badRequest('Each card id must occur only once in a queue.', { field: 'cards' });
    }
    ids.add(card.id);
    if (card.dueOn > on) {
      counts.scheduled += 1;
      continue;
    }
    const status = card.lastReviewedOn === null ? 'new' : card.dueOn === on ? 'due' : 'overdue';
    counts[status] += 1;
    const overdueDays = (Date.parse(on) - Date.parse(card.dueOn)) / DAY_MS;
    candidates.push({ card, status, overdueDays });
  }
  candidates.sort(
    (a, b) =>
      Number(a.status === 'new') - Number(b.status === 'new') ||
      Date.parse(a.card.dueOn) - Date.parse(b.card.dueOn) ||
      b.card.lapses - a.card.lapses ||
      (a.card.id < b.card.id ? -1 : 1),
  );
  let newSelected = 0;
  const items = candidates
    .filter((item) => {
      if (item.status !== 'new') return true;
      newSelected += 1;
      return newSelected <= newLimit;
    })
    .slice(0, limit);
  return { on, limit, newLimit, counts, items, remaining: candidates.length - items.length };
}
