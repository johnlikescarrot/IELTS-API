/**
 * The retention calculations.
 *
 * Everything here is pure and deterministic: identical arguments produce
 * byte-identical output, which is what lets a paper cite a URL rather than a
 * screenshot. No wall-clock time is read; when a calculation needs a date, the
 * caller supplies it.
 */

import { EBBINGHAUS_CURVE, MINUTES_PER_DAY, round4 } from '../data/retention.js';

import type {
  MasteryRule,
  MasteryStep,
  RetentionCurveModel,
  RetentionPoint,
  RetentionProfile,
  ReviewSchedule,
  ScheduleDivergence,
  ScheduleStage,
  VocabularyLibrary,
  WorkloadDay,
  WorkloadSimulation,
} from '../types.js';

/** Round to two decimal places. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ebbinghaus's retention function, as a fraction in `(0, 1]`.
 *
 * `b = k / ((log10 t)^c + k)`, the published equation divided by 100. Times
 * below one minute are clamped to one minute, where the equation returns 1:
 * `log10 1 = 0`, and the curve is not defined for shorter gaps because
 * Ebbinghaus never measured any.
 *
 * @param minutes - Time since the material was last seen.
 * @param model - Curve constants; defaults to Ebbinghaus's own.
 * @returns Predicted retention (savings) in `(0, 1]`.
 */
export function ebbinghausRetention(minutes: number, model: RetentionCurveModel = EBBINGHAUS_CURVE): number {
  const clamped = Math.max(1, minutes);
  return model.k / (Math.log10(clamped) ** model.c + model.k);
}

/** One observation checked against the curve. */
export type CurveResidual = {
  /** Time since learning, in minutes. */
  minutes: number;
  /** How the source labels the observation. */
  label: string;
  /** Savings Ebbinghaus measured, as a percentage. */
  observed: number;
  /** Savings the equation predicts, as a percentage. */
  predicted: number;
  /** `predicted - observed`, in percentage points. */
  residual: number;
};

/** Goodness of fit of the curve against the observations it was fitted to. */
export type CurveFit = {
  /** Per-observation residuals. */
  residuals: readonly CurveResidual[];
  /** Root-mean-square error, in percentage points. */
  rmse: number;
  /** Largest absolute residual, in percentage points. */
  maxAbsoluteResidual: number;
};

/**
 * Re-check the published equation against the published observations.
 *
 * This is the reproducibility check the curve is usually quoted without: the
 * equation and the data both come from Ebbinghaus, and either they agree or the
 * transcription is wrong.
 *
 * @param model - Curve to check.
 */
export function curveFit(model: RetentionCurveModel = EBBINGHAUS_CURVE): CurveFit {
  const residuals = model.observations.map((observation) => {
    const predicted = ebbinghausRetention(observation.minutes, model) * 100;
    return {
      minutes: observation.minutes,
      label: observation.label,
      observed: observation.savings,
      predicted: round4(predicted),
      residual: round4(predicted - observation.savings),
    };
  });
  const squared = residuals.reduce((total, point) => total + (point.predicted - point.observed) ** 2, 0);
  return {
    residuals,
    rmse: round4(Math.sqrt(squared / residuals.length)),
    maxAbsoluteResidual: round4(Math.max(...residuals.map((point) => Math.abs(point.residual)))),
  };
}

/**
 * Expand a schedule to a fixed number of reviews.
 *
 * Published interval lists are short and the terminal rule is what carries a
 * learner past the end of them, so a comparison over a common horizon has to
 * apply the terminal rule explicitly rather than pretend the schedule stops.
 *
 * @param schedule - Schedule to expand.
 * @param reviews - Number of reviews to produce (at least one).
 * @param mastery - Mastery score used by mastery-scaled terminals.
 * @returns Interval before each review, in minutes.
 */
export function intervalsFor(schedule: ReviewSchedule, reviews: number, mastery: number): number[] {
  const published = schedule.intervalsMinutes;
  const intervals: number[] = [];
  for (let index = 0; index < reviews; index += 1) {
    if (index < published.length) {
      intervals.push(published[index] as number);
      continue;
    }
    const previous = intervals[index - 1] as number;
    switch (schedule.terminal.kind) {
      case 'repeat-last':
        intervals.push(previous);
        break;
      case 'multiply':
        intervals.push(round4(previous * schedule.terminal.factor));
        break;
      default:
        intervals.push(round4(schedule.terminal.baseMinutes * (1 + mastery / 100)));
        break;
    }
  }
  return intervals;
}

/**
 * Turn a schedule into a table of reviews with cumulative timings.
 *
 * @param schedule - Schedule to expand.
 * @param reviews - Number of reviews to produce.
 * @param mastery - Mastery score used by mastery-scaled terminals.
 */
export function scheduleStages(schedule: ReviewSchedule, reviews: number, mastery: number): ScheduleStage[] {
  let elapsed = 0;
  return intervalsFor(schedule, reviews, mastery).map((intervalMinutes, review) => {
    elapsed = round4(elapsed + intervalMinutes);
    const calendarDay = Math.floor(elapsed / MINUTES_PER_DAY);
    return {
      review,
      intervalMinutes,
      elapsedMinutes: elapsed,
      elapsedDays: round2(elapsed / MINUTES_PER_DAY),
      calendarDay,
      sameDay: calendarDay === 0,
    };
  });
}

/**
 * Score a schedule against the forgetting curve.
 *
 * Retention is evaluated at each review, on the gap since the previous review,
 * with the gap divided by a consolidation factor that grows geometrically with
 * the number of successful reviews already made. The headline number is not the
 * mean but the **coefficient of variation**: a schedule built around a constant
 * target retention — which is what SuperMemo and every algorithm descended from
 * it is built around — drives it towards zero, while a schedule assembled from
 * round numbers does not.
 *
 * @param schedule - Schedule to score.
 * @param reviews - Number of reviews to score.
 * @param growth - Stability multiplier applied by each successful review.
 * @param mastery - Mastery score used by mastery-scaled terminals.
 */
export function retentionProfile(
  schedule: ReviewSchedule,
  reviews: number,
  growth: number,
  mastery: number,
): RetentionProfile {
  const stages = scheduleStages(schedule, reviews, mastery);
  const points: RetentionPoint[] = stages.map((stage) => {
    const stabilityFactor = growth ** stage.review;
    return {
      review: stage.review,
      intervalMinutes: stage.intervalMinutes,
      elapsedMinutes: stage.elapsedMinutes,
      stabilityFactor: round4(stabilityFactor),
      retention: round4(ebbinghausRetention(stage.intervalMinutes / stabilityFactor)),
    };
  });
  const values = points.map((point) => point.retention);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / mean;
  return {
    scheduleId: schedule.id,
    stabilityGrowth: growth,
    points,
    floor: round4(Math.min(...values)),
    ceiling: round4(Math.max(...values)),
    mean: round4(mean),
    standardDeviation: round4(standardDeviation),
    coefficientOfVariation: round4(coefficientOfVariation),
    uniformity: round4(Math.max(0, Math.min(1, 1 - coefficientOfVariation))),
  };
}

/** One dated review in a learner's calendar. */
export type CalendarEntry = ScheduleStage & {
  /** Instant of the review, to the second, in UTC. */
  at: string;
  /** Calendar date of the review. */
  date: string;
};

/**
 * Add whole minutes to an ISO date at midnight UTC.
 *
 * @param startDate - ISO date (`YYYY-MM-DD`).
 * @param minutes - Minutes to add; fractions are rounded to the nearest second.
 */
export function instantAfter(startDate: string, minutes: number): Date {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return new Date(start + Math.round(minutes * 60) * 1000);
}

/**
 * Date a schedule against a learning date.
 *
 * @param schedule - Schedule to date.
 * @param startDate - ISO date on which the item is first learned.
 * @param reviews - Number of reviews to produce.
 * @param mastery - Mastery score used by mastery-scaled terminals.
 */
export function reviewCalendar(
  schedule: ReviewSchedule,
  startDate: string,
  reviews: number,
  mastery: number,
): CalendarEntry[] {
  return scheduleStages(schedule, reviews, mastery).map((stage) => {
    const at = instantAfter(startDate, stage.elapsedMinutes);
    return { ...stage, at: at.toISOString().replace(/\.\d{3}Z$/, 'Z'), date: at.toISOString().slice(0, 10) };
  });
}

/**
 * Calendar index of the nth study day.
 *
 * Study days are placed on the first `daysPerWeek` days of each seven-day
 * block, which is the only placement that is both deterministic and independent
 * of the calendar the learner happens to start on.
 *
 * @param n - One-based study-day number.
 * @param daysPerWeek - Study days per week.
 * @returns Zero-based calendar day index.
 */
export function studyDayIndex(n: number, daysPerWeek: number): number {
  return 7 * Math.floor((n - 1) / daysPerWeek) + ((n - 1) % daysPerWeek);
}

/** Number of study days inside a horizon. */
export function studyDaysWithin(days: number, daysPerWeek: number): number {
  return daysPerWeek * Math.floor(days / 7) + Math.min(days % 7, daysPerWeek);
}

/** Add whole days to an ISO date. */
export function addDays(startDate: string, days: number): string {
  return new Date(Date.parse(`${startDate}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Arguments to {@link simulateWorkload}. */
export type WorkloadOptions = {
  /** New words introduced per study day. */
  newPerDay: number;
  /** Study days per week. */
  daysPerWeek: number;
  /** Horizon in days. */
  days: number;
  /** Reviews each word receives. */
  reviews: number;
  /** Mastery score used by mastery-scaled terminals. */
  mastery: number;
  /** ISO date of day zero. */
  startDate: string;
};

/**
 * Simulate the daily load a schedule produces.
 *
 * The question a schedule never answers is the one that decides whether a
 * learner abandons it: *how many cards will I see on a Tuesday in week six?*
 * Twenty new words a day is a modest commitment; twenty new words a day under
 * an eight-review schedule is a hundred and eighty cards a day once the
 * pipeline fills, and the schedule does not say so anywhere.
 *
 * The simulation is exact rather than sampled — the load on day `d` is the sum
 * over stages of the words introduced on `d - offset` — so it costs
 * `O(days x reviews)` regardless of how many words are involved.
 *
 * @param schedule - Schedule to simulate.
 * @param options - Simulation parameters.
 */
export function simulateWorkload(schedule: ReviewSchedule, options: WorkloadOptions): WorkloadSimulation {
  const { newPerDay, daysPerWeek, days, reviews, mastery, startDate } = options;
  const offsets = scheduleStages(schedule, reviews, mastery).map((stage) => stage.calendarDay);
  const isStudyDay = (day: number): boolean => day % 7 < daysPerWeek;
  const newOn = (day: number): number => (day >= 0 && isStudyDay(day) ? newPerDay : 0);

  const timeline: WorkloadDay[] = [];
  for (let day = 0; day < days; day += 1) {
    const newWords = newOn(day);
    const dailyReviews = offsets.reduce((total, offset) => total + newOn(day - offset), 0);
    timeline.push({
      day,
      date: addDays(startDate, day),
      studyDay: isStudyDay(day),
      newWords,
      reviews: dailyReviews,
      total: newWords + dailyReviews,
    });
  }

  const totalNewWords = timeline.reduce((total, entry) => total + entry.newWords, 0);
  const totalReviews = timeline.reduce((total, entry) => total + entry.reviews, 0);
  const peakEntry = timeline.reduce((best, entry) => (entry.total > best.total ? entry : best));
  const steadyStateDay = Math.max(...offsets);
  return {
    scheduleId: schedule.id,
    newPerDay,
    daysPerWeek,
    days,
    timeline,
    totalNewWords,
    totalReviews,
    peak: { day: peakEntry.day, date: peakEntry.date, total: peakEntry.total },
    meanDailyTotal: round2((totalNewWords + totalReviews) / days),
    reviewsPerWord: reviews,
    steadyStateDailyTotal: round2((newPerDay * daysPerWeek * (1 + reviews)) / 7),
    steadyStateDay: steadyStateDay < days ? steadyStateDay : null,
  };
}

/** Result of comparing two schedules. */
export type ScheduleComparison = {
  /** Identifier of the first schedule. */
  a: string;
  /** Identifier of the second schedule. */
  b: string;
  /** Per-review divergence over the union of the two published lists. */
  divergences: readonly ScheduleDivergence[];
  /** Reviews at which both schedules publish an interval. */
  comparableReviews: number;
  /** Comparable reviews at which the two land on the same calendar day. */
  agreements: number;
  /** {@link agreements} as a percentage of {@link comparableReviews}. */
  agreementRate: number;
  /** Largest absolute difference in calendar days across comparable reviews. */
  maxDifferenceDays: number;
  /** Calendar day of the last published review of each schedule. */
  horizonDays: { a: number; b: number };
};

/**
 * Compare two schedules review by review, over their published intervals only.
 *
 * Terminal rules are deliberately not applied: extending a two-interval
 * publication to eight reviews would compare an assumption with a fact. Where
 * one schedule has published an interval and the other has not, the row records
 * `null` rather than a guess, and the agreement rate is computed only over the
 * rows where both have.
 *
 * @param a - First schedule.
 * @param b - Second schedule.
 * @param mastery - Mastery score used by mastery-scaled terminals.
 */
export function compareSchedules(a: ReviewSchedule, b: ReviewSchedule, mastery: number): ScheduleComparison {
  const stagesA = scheduleStages(a, a.intervalsMinutes.length, mastery);
  const stagesB = scheduleStages(b, b.intervalsMinutes.length, mastery);
  const horizon = Math.max(stagesA.length, stagesB.length);
  const divergences: ScheduleDivergence[] = [];
  for (let review = 0; review < horizon; review += 1) {
    const dayA = stagesA[review]?.calendarDay ?? null;
    const dayB = stagesB[review]?.calendarDay ?? null;
    const both = dayA !== null && dayB !== null;
    divergences.push({
      review,
      a: dayA,
      b: dayB,
      difference: both ? dayA - dayB : null,
      agrees: both && dayA === dayB,
    });
  }
  const comparable = divergences.filter((row) => row.difference !== null);
  const agreements = comparable.filter((row) => row.agrees).length;
  return {
    a: a.id,
    b: b.id,
    divergences,
    comparableReviews: comparable.length,
    agreements,
    agreementRate: round2((agreements / comparable.length) * 100),
    maxDifferenceDays: Math.max(...comparable.map((row) => Math.abs(row.difference as number))),
    horizonDays: {
      a: (stagesA.at(-1) as ScheduleStage).calendarDay,
      b: (stagesB.at(-1) as ScheduleStage).calendarDay,
    },
  };
}

/** Arguments to {@link coverLibrary}. */
export type CoverageOptions = {
  /** New words introduced per study day. */
  newPerDay: number;
  /** Study days per week. */
  daysPerWeek: number;
  /** Reviews each word receives. */
  reviews: number;
  /** Mastery score used by mastery-scaled terminals. */
  mastery: number;
  /** Optional deadline, in days from the first study day. */
  deadline: number | undefined;
};

/** How long a word list takes under a schedule. */
export type CoverageReport = {
  /** Library covered. */
  library: { id: string; name: string; englishName: string; words: number };
  /** Schedule applied. */
  scheduleId: string;
  /** New words introduced per study day. */
  newPerDay: number;
  /** Study days per week. */
  daysPerWeek: number;
  /** Study days needed to introduce every word once. */
  studyDaysNeeded: number;
  /** Calendar days from the first study day to the last new word. */
  firstPassDays: number;
  /** Calendar days until the last word has completed every review. */
  maturityDays: number;
  /** Total review events the schedule demands for the whole list. */
  totalReviewEvents: number;
  /** Reviews each word receives. */
  reviewsPerWord: number;
  /** Daily load once the pipeline is full. */
  steadyStateDailyTotal: number;
  /** Deadline analysis, when a deadline was supplied. */
  deadline: {
    days: number;
    studyDaysAvailable: number;
    requiredNewPerDay: number;
    feasibleAtRequestedRate: boolean;
    maturityWithinDeadline: boolean;
  } | null;
};

/**
 * Analyse a word list against a deadline.
 *
 * `studyDaysWithin` never returns zero for a deadline of at least one day, so
 * the required rate is always finite.
 *
 * @param words - Headwords to cover.
 * @param deadline - Days until the test.
 * @param options - Coverage parameters.
 * @param maturityDays - Days until the last word finishes its reviews.
 */
function deadlineReport(
  words: number,
  deadline: number,
  options: CoverageOptions,
  maturityDays: number,
): NonNullable<CoverageReport['deadline']> {
  const available = studyDaysWithin(deadline, options.daysPerWeek);
  return {
    days: deadline,
    studyDaysAvailable: available,
    requiredNewPerDay: Math.ceil(words / available),
    feasibleAtRequestedRate: Math.ceil(words / options.newPerDay) <= available,
    maturityWithinDeadline: maturityDays <= deadline,
  };
}

/**
 * Work out how long a word list takes under a schedule.
 *
 * Two numbers matter and preparation guides publish neither: the day the last
 * new word is introduced, and the day the last word finishes its reviews. The
 * gap between them is the schedule's tail, and for the longer schedules it is
 * measured in months — which is why a candidate who starts a 4,000-word list
 * eight weeks before the test never reaches the end of it under any schedule in
 * the catalogue.
 *
 * @param library - Word list to cover.
 * @param schedule - Schedule to apply.
 * @param options - Coverage parameters.
 */
export function coverLibrary(
  library: VocabularyLibrary,
  schedule: ReviewSchedule,
  options: CoverageOptions,
): CoverageReport {
  const { newPerDay, daysPerWeek, reviews, mastery, deadline } = options;
  const stages = scheduleStages(schedule, reviews, mastery);
  const tail = (stages.at(-1) as ScheduleStage).calendarDay;
  const studyDaysNeeded = Math.ceil(library.words / newPerDay);
  const lastNewDay = studyDayIndex(studyDaysNeeded, daysPerWeek);
  const maturityDays = lastNewDay + tail + 1;
  return {
    library: {
      id: library.id,
      name: library.name,
      englishName: library.englishName,
      words: library.words,
    },
    scheduleId: schedule.id,
    newPerDay,
    daysPerWeek,
    studyDaysNeeded,
    firstPassDays: lastNewDay + 1,
    maturityDays,
    totalReviewEvents: library.words * reviews,
    reviewsPerWord: reviews,
    steadyStateDailyTotal: round2((newPerDay * daysPerWeek * (1 + reviews)) / 7),
    deadline: deadline === undefined ? null : deadlineReport(library.words, deadline, options, maturityDays),
  };
}

/** A traced run of the deployed mastery rule. */
export type MasteryTrace = {
  /** Rule that was applied. */
  ruleId: string;
  /** Mastery before the first answer. */
  initial: number;
  /** Mastery after the last answer. */
  final: number;
  /** Per-answer breakdown. */
  steps: readonly MasteryStep[];
  /** Answers that were correct. */
  correct: number;
  /** Answers that were wrong. */
  wrong: number;
  /** Total points lost to clamping at either end of the range. */
  clamped: number;
  /**
   * Break-even accuracy: the proportion of correct answers at which mastery
   * neither rises nor falls, `penalty / (penalty + reward)`. It does not depend
   * on the confidence a learner reports, only on the ratio of the two terms.
   */
  breakEvenAccuracy: number;
};

/**
 * Apply the deployed mastery rule to a sequence of answers.
 *
 * @param rule - Rule to apply.
 * @param answers - Whether each answer was correct.
 * @param confidences - Self-reported confidence for each answer.
 * @param initial - Mastery before the first answer.
 */
export function masteryTrace(
  rule: MasteryRule,
  answers: readonly boolean[],
  confidences: readonly number[],
  initial: number,
): MasteryTrace {
  const [floor, ceiling] = rule.masteryRange;
  let mastery = initial;
  const steps: MasteryStep[] = answers.map((correct, index) => {
    const confidence = confidences[index] as number;
    const change = correct ? confidence * rule.rewardPerConfidence : -confidence * rule.penaltyPerConfidence;
    const before = mastery;
    const unclamped = before + change;
    const after = round2(Math.max(floor, Math.min(ceiling, unclamped)));
    mastery = after;
    return {
      step: index + 1,
      correct,
      confidence,
      before,
      change,
      after,
      clamped: round2(unclamped - after),
    };
  });
  return {
    ruleId: rule.id,
    initial,
    final: mastery,
    steps,
    correct: steps.filter((step) => step.correct).length,
    wrong: steps.filter((step) => !step.correct).length,
    clamped: round2(steps.reduce((total, step) => total + Math.abs(step.clamped), 0)),
    breakEvenAccuracy: round4(
      rule.penaltyPerConfidence / (rule.penaltyPerConfidence + rule.rewardPerConfidence),
    ),
  };
}
