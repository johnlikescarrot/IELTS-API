import { describe, expect, it } from 'vitest';
import {
  buildReviewQueue,
  createReviewCard,
  parseReviewCard,
  REVIEW_POLICY,
  scheduleReview,
} from '../../src/lib/review.js';
import type { ReviewCard } from '../../src/types.js';

const fresh = () => createReviewCard('w00001', '2026-09-07');
const learned = (overrides: Partial<ReviewCard> = {}): ReviewCard => ({
  ...fresh(),
  repetitions: 2,
  intervalDays: 6,
  lastReviewedOn: '2026-09-01',
  dueOn: '2026-09-07',
  ...overrides,
});

describe('versioned SM-2 transitions', () => {
  it('publishes immutable policy metadata so consumers cannot alter subsequent computations', () => {
    expect(Reflect.set(REVIEW_POLICY, 'algorithm', 'tampered')).toBe(false);
    expect(Reflect.set(REVIEW_POLICY.grades, '0', { grade: 99 })).toBe(false);
    expect(Reflect.set(REVIEW_POLICY.grades[0]!, 'grade', 99)).toBe(false);
    expect(scheduleReview(fresh(), 4, '2026-09-07').card.algorithm).toBe('sm2-v1');
  });

  it('creates and validates a minimal, copyable client-owned state', () => {
    expect(fresh()).toEqual({
      id: 'w00001',
      algorithm: 'sm2-v1',
      repetitions: 0,
      lapses: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      lastReviewedOn: null,
      dueOn: '2026-09-07',
    });
    const card = fresh();
    expect(parseReviewCard(card)).toEqual(card);
    expect(parseReviewCard(card)).not.toBe(card);
    expect(REVIEW_POLICY.storage).toBe('client-owned');
  });

  it.each([
    [0, 1.7, 0, 1, true, 'lapse'],
    [1, 1.96, 0, 1, true, 'lapse'],
    [2, 2.18, 0, 1, true, 'lapse'],
    [3, 2.36, 1, 0, true, 'first-success'],
    [4, 2.5, 1, 0, false, 'first-success'],
    [5, 2.6, 1, 0, false, 'first-success'],
  ])(
    'applies grade %i with its exact ease update and outcome',
    (grade, easeFactor, repetitions, lapses, repeatToday, reason) => {
      const input = Object.freeze(fresh());
      const output = scheduleReview(input, grade as number, '2026-09-07');
      expect(output).toMatchObject({
        grade,
        on: '2026-09-07',
        repeatToday,
        reason,
        intervalCapped: false,
        easeClamped: false,
        card: {
          easeFactor,
          repetitions,
          lapses,
          intervalDays: 1,
          dueOn: '2026-09-08',
          lastReviewedOn: '2026-09-07',
        },
      });
      expect(input).toEqual(fresh());
      expect(output.card).not.toBe(input);
    },
  );

  it('matches a hand-calculated successful trajectory using the OLD ease and rounding up', () => {
    let card = fresh();
    const actual = [];
    for (const grade of [5, 5, 5, 4, 3]) {
      const result = scheduleReview(card, grade, card.dueOn);
      card = result.card;
      actual.push([card.lastReviewedOn, card.intervalDays, card.dueOn, card.easeFactor, result.reason]);
    }
    expect(actual).toEqual([
      ['2026-09-07', 1, '2026-09-08', 2.6, 'first-success'],
      ['2026-09-08', 6, '2026-09-14', 2.7, 'second-success'],
      ['2026-09-14', 17, '2026-10-01', 2.8, 'expanded'],
      ['2026-10-01', 48, '2026-11-18', 2.8, 'expanded'],
      ['2026-11-18', 135, '2027-04-02', 2.66, 'expanded'],
    ]);
  });

  it('restarts a lapsed mature card without resetting its adjusted ease to 2.5', () => {
    const result = scheduleReview(learned(), 2, '2026-09-07');
    expect(result.card).toMatchObject({ repetitions: 0, lapses: 1, easeFactor: 2.18, intervalDays: 1 });
    const restart = scheduleReview(result.card, 4, '2026-09-08');
    expect(restart.card).toMatchObject({ repetitions: 1, lapses: 1, easeFactor: 2.18, intervalDays: 1 });
    expect(scheduleReview(restart.card, 4, '2026-09-09').card.intervalDays).toBe(6);
  });

  it('retains grade-3 success while signalling a local same-day drill, not another daily transition', () => {
    const result = scheduleReview(learned(), 3, '2026-09-07');
    expect(result.repeatToday).toBe(true);
    expect(result.card.repetitions).toBe(3);
    expect(() => scheduleReview(result.card, 4, '2026-09-07')).toThrow('cannot precede');
  });

  it('anchors late reviews to the actual date and rejects premature reviews', () => {
    const result = scheduleReview(learned(), 4, '2026-09-10');
    expect(result.card).toMatchObject({
      intervalDays: 15,
      dueOn: '2026-09-25',
      lastReviewedOn: '2026-09-10',
    });
    expect(() => scheduleReview(learned(), 4, '2026-09-06')).toThrow('cannot precede');
  });

  it('exposes both ease bounds and the interval guardrail without numeric overflow', () => {
    const lower = scheduleReview(learned({ easeFactor: 1.3 }), 0, '2026-09-07');
    expect(lower.card.easeFactor).toBe(1.3);
    expect(lower.easeClamped).toBe(true);
    const upper = scheduleReview(learned({ easeFactor: 10 }), 5, '2026-09-07');
    expect(upper.card.easeFactor).toBe(10);
    expect(upper.easeClamped).toBe(true);
    const long = learned({ intervalDays: 20000, lastReviewedOn: '1900-01-01', dueOn: '1954-10-05' });
    const result = scheduleReview(long, 4, '2026-09-07');
    expect(result.card.intervalDays).toBe(36500);
    expect(result.intervalCapped).toBe(true);
    expect(result.card.dueOn).toBe('2126-08-14');
  });

  it.each([
    ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-01'],
    ['2026-12-31', '2027-01-01'],
    ['2026-03-08', '2026-03-09'],
    ['2026-11-01', '2026-11-02'],
    ['0001-01-01', '0001-01-02'],
  ])('adds one UTC day to %s regardless of the process timezone', (on, expected) => {
    expect(scheduleReview(createReviewCard('item', on), 4, on).card.dueOn).toBe(expected);
  });

  it('rejects extended-year results and overflowing review counters', () => {
    expect(() => scheduleReview(createReviewCard('end', '9999-12-31'), 4, '9999-12-31')).toThrow('year 9999');
    expect(() => scheduleReview(learned({ repetitions: 1_000_000 }), 4, '2026-09-07')).toThrow('repetitions');
    expect(() => scheduleReview(learned({ lapses: 1_000_000 }), 2, '2026-09-07')).toThrow('lapses');
  });

  it('round-trips every generated state across varied histories without mutation', () => {
    for (let start = 0; start < 6; start += 1) {
      let card = createReviewCard(`sequence:${start}`, '2000-01-01');
      for (let index = 0; index < 150; index += 1) {
        const input = JSON.parse(JSON.stringify(card)) as ReviewCard;
        const grade = (start + index * 5) % 6;
        const output = scheduleReview(card, grade, card.dueOn);
        expect(card).toEqual(input);
        expect(output.card.intervalDays).toBeGreaterThanOrEqual(1);
        expect(output.card.dueOn > card.dueOn).toBe(true);
        expect(parseReviewCard(JSON.parse(JSON.stringify(output.card)))).toEqual(output.card);
        expect(scheduleReview(input, grade, input.dueOn)).toEqual(output);
        card = output.card;
      }
    }
  });

  it.each([-1, 6, 1.5, NaN, Infinity, '4', null, undefined])(
    'rejects invalid grade %s without coercion',
    (grade) => {
      expect(() => scheduleReview(fresh(), grade as number, '2026-09-07')).toThrow('grade');
    },
  );
});

describe('card state validation', () => {
  it.each([
    ['id', ''],
    ['id', 'x'.repeat(65)],
    ['id', 'some person'],
    ['id', '../word'],
    ['id', 'été'],
    ['algorithm', 'sm2-v2'],
    ['repetitions', -1],
    ['repetitions', 1.5],
    ['repetitions', '2'],
    ['lapses', Infinity],
    ['intervalDays', 36501],
    ['easeFactor', 1.29],
    ['easeFactor', 10.01],
    ['easeFactor', 2.345],
    ['easeFactor', NaN],
    ['dueOn', '2026-02-30'],
    ['dueOn', '2026-13-01'],
    ['dueOn', '2026-09-07T00:00:00Z'],
    ['dueOn', '0000-01-01'],
    ['dueOn', null],
    ['lastReviewedOn', undefined],
    ['unexpected', 'do not silently accept'],
  ])('rejects a malformed field %s=%s', (key, value) => {
    expect(() => parseReviewCard({ ...fresh(), [key]: value })).toThrow();
  });

  it.each([null, undefined, [], 2, 'card'])('rejects a non-object state %s', (value) => {
    expect(() => parseReviewCard(value)).toThrow('object');
  });

  it.each([{ repetitions: 1 }, { lapses: 1 }, { intervalDays: 1 }, { easeFactor: 2.6 }])(
    'rejects a contradictory new state %j',
    (overrides) => {
      expect(() => parseReviewCard({ ...fresh(), ...overrides })).toThrow('new card');
    },
  );

  it.each([{ intervalDays: 0 }, { repetitions: 0, lapses: 0 }, { dueOn: '2026-09-08' }])(
    'rejects an inconsistent reviewed state %j',
    (overrides) => {
      expect(() => parseReviewCard(learned(overrides))).toThrow('reviewed card');
    },
  );

  it('rejects unknown and prototype-looking JSON properties without echoing their contents', () => {
    const input = { ...fresh(), privateNotes: 'never reflect this sentence' };
    try {
      parseReviewCard(input);
      expect.fail('expected validation to reject unknown fields');
    } catch (error) {
      expect(String(error)).not.toContain('never reflect this sentence');
      expect(String(error)).toContain('unsupported');
    }
    expect(() => parseReviewCard(JSON.parse('{"__proto__":{"polluted":true}}'))).toThrow('unsupported');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});

describe('budgeted due queue', () => {
  const states = [
    createReviewCard('new-b', '2026-09-01'),
    learned({ id: 'due-today' }),
    learned({ id: 'late-b', lastReviewedOn: '2026-08-31', dueOn: '2026-09-06', lapses: 1 }),
    learned({ id: 'late-a', lastReviewedOn: '2026-08-31', dueOn: '2026-09-06', lapses: 1 }),
    learned({ id: 'late-lapsed', lastReviewedOn: '2026-08-31', dueOn: '2026-09-06', lapses: 2 }),
    createReviewCard('new-a', '2026-09-01'),
    createReviewCard('future', '2026-09-08'),
  ];

  it('prioritises due reviews (including mature cards) before old or new unreviewed cards', () => {
    const queue = buildReviewQueue(states, '2026-09-07');
    expect(queue.items.map((item) => [item.card.id, item.status, item.overdueDays])).toEqual([
      ['late-lapsed', 'overdue', 1],
      ['late-a', 'overdue', 1],
      ['late-b', 'overdue', 1],
      ['due-today', 'due', 0],
      ['new-a', 'new', 6],
      ['new-b', 'new', 6],
    ]);
    expect(queue.counts).toEqual({ total: 7, overdue: 3, due: 1, new: 2, scheduled: 1 });
    expect(queue.remaining).toBe(0);
    expect(buildReviewQueue([...states].reverse(), '2026-09-07')).toEqual(queue);
  });

  it('applies both budgets after counting, without substituting future items or mutating input', () => {
    const before = structuredClone(states);
    const queue = buildReviewQueue(states, '2026-09-07', 5, 1);
    expect(queue.items).toHaveLength(5);
    expect(queue.remaining).toBe(1);
    expect(queue.counts).toEqual({ total: 7, overdue: 3, due: 1, new: 2, scheduled: 1 });
    expect(buildReviewQueue(states, '2026-09-07', 3, 50).items).toHaveLength(3);
    expect(buildReviewQueue(states, '2026-09-07', 100, 0).items).toHaveLength(4);
    queue.items[0]!.card.lapses = 100;
    expect(states).toEqual(before);
  });

  it('does not lose a long-interval card after repeated success', () => {
    const card = learned({
      repetitions: 100,
      intervalDays: 100,
      lastReviewedOn: '2026-05-30',
      dueOn: '2026-09-07',
    });
    expect(buildReviewQueue([card], '2026-09-07').items[0]?.card).toEqual(card);
    expect(buildReviewQueue([card], '2026-09-06').counts.scheduled).toBe(1);
  });

  it('handles empty and maximum-size input, with a default bounded output', () => {
    expect(buildReviewQueue([], '2026-09-07')).toEqual({
      on: '2026-09-07',
      limit: 20,
      newLimit: 10,
      counts: { total: 0, overdue: 0, due: 0, new: 0, scheduled: 0 },
      items: [],
      remaining: 0,
    });
    const maximum = Array.from({ length: 500 }, (_, i) => createReviewCard(`word-${i}`, '2026-09-07'));
    expect(buildReviewQueue(maximum, '2026-09-07').items).toHaveLength(10);
    expect(buildReviewQueue(maximum, '2026-09-07').remaining).toBe(490);
    expect(() => buildReviewQueue([...maximum, fresh()], '2026-09-07')).toThrow('500');
  });

  it('validates budgets, every card, duplicates and dates even for empty selections', () => {
    expect(() => buildReviewQueue({} as ReviewCard[], '2026-09-07')).toThrow('array');
    expect(() => buildReviewQueue([fresh(), fresh()], '2026-09-07')).toThrow('only once');
    expect(() => buildReviewQueue([learned({ algorithm: 'bad' as 'sm2-v1' })], '2026-09-07', 1, 0)).toThrow(
      'algorithm',
    );
    expect(() => buildReviewQueue([], '2026-02-29')).toThrow('calendar');
    expect(() => buildReviewQueue([], '2026-09-07', 101)).toThrow('limit');
    expect(() => buildReviewQueue([], '2026-09-07', 10, 51)).toThrow('newLimit');
  });
});
