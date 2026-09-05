/**
 * The study-plan engine.
 *
 * `buildStudyPlan` turns a small typed request into a full, deterministic,
 * week-by-week preparation schedule. Every modelling choice is intentionally
 * simple, public and testable:
 *
 * - weekly minutes are shared between the four skills in proportion to each
 *   skill's band gap, with a maintenance weight for skills already at target;
 * - minutes are conserved and quantised to five-minute granularity;
 * - feasibility uses an indicative hours-per-half-band heuristic that grows
 *   with the current band (diminishing marginal returns reported for test
 *   preparation); it is a planning aid, never a score prediction;
 * - activities are drawn from the original catalogue in `data/activities.ts`,
 *   which follows the four-skill-plus-exam-experience organisation found in
 *   open learner notebooks (e.g. `Oxidaner/ielts`); no third-party content is
 *   redistributed.
 *
 * The engine is pure: the same inputs always produce byte-identical plans, so
 * a plan can be cited, archived and re-derived from its seed.
 */

import { SKILLS, assertBand, meanOf } from './band.js';
import { badRequest } from './errors.js';
import { hashString, mulberry32 } from './rng.js';
import { activitiesFor, findActivity } from '../data/activities.js';

import type { PlanPhase, PlanSession, PlanWeek, Skill, StudyActivity, StudyPlan } from '../types.js';
import type { PlanFeasibility, SkillAllocation } from '../types.js';

/** Identifier of the weekly experience anchor. */
const REVIEW_ACTIVITY_ID = 'error-log-review';

/** Identifier of the end-of-plan mock examination. */
const MOCK_ACTIVITY_ID = 'full-mock-test';

/** Smallest scheduling granularity, in minutes. */
const MINUTE_GRANULARITY = 5;

/** Weekly budget weight kept for a skill that is already at the target band. */
const MAINTENANCE_WEIGHT = 0.25;

/** Nominal session length used to decide how many sessions a skill gets. */
const TARGET_SESSION_MINUTES = 40;

/** The four phases of a plan, in execution order. */
export const PLAN_PHASES: readonly PlanPhase[] = [
  'foundation',
  'skill-build',
  'exam-practice',
  'assessment-taper',
];

/** Request accepted by {@link buildStudyPlan}. */
export type StudyPlanInput = {
  /** Current component bands. */
  current: Record<Skill, number>;
  /** Target overall band. */
  target: number;
  /** Plan length in weeks (1-52). */
  weeks: number;
  /** Nominal study hours per week (1-80). */
  hoursPerWeek: number;
  /** First calendar date of the plan (ISO `YYYY-MM-DD`). */
  startDate: string;
  /** Full rest days dropped from each week (0-3, default 0). */
  restDays?: number;
  /** Seed; defaults to a canonical string of all other inputs. */
  seed?: string;
};

/** Validated, normalised plan input. */
type NormalizedPlan = {
  current: Record<Skill, number>;
  target: number;
  weeks: number;
  hoursPerWeek: number;
  restDays: number;
  startDate: string;
  seed: string;
  minutesPerWeek: number;
  studyDays: number;
};

/** Reject non-integers and out-of-range integers with a `400`-shaped error. */
function requireInteger(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw badRequest(`"${label}" must be an integer between ${min} and ${max}.`, {
      parameter: label,
      received: String(value),
    });
  }
  return value;
}

/**
 * Validate and normalise a plan request.
 *
 * @param input - Raw request.
 */
export function normalizeStudyPlanInput(input: StudyPlanInput): NormalizedPlan {
  const current = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    current[skill] = assertBand(input.current[skill], `current.${skill}`);
  }
  const target = assertBand(input.target, 'target');
  const weeks = requireInteger(input.weeks, 1, 52, 'weeks');
  const hoursPerWeek = requireInteger(input.hoursPerWeek, 1, 80, 'hoursPerWeek');
  const restDays = input.restDays === undefined ? 0 : requireInteger(input.restDays, 0, 3, 'restDays');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
    Number.isNaN(Date.parse(`${input.startDate}T00:00:00Z`))
  ) {
    throw badRequest('"startDate" must be a valid ISO date (YYYY-MM-DD).', {
      parameter: 'startDate',
      received: input.startDate,
    });
  }
  const minutesPerWeek = hoursPerWeek * 60;
  const seed =
    input.seed ??
    `studyplan:${input.startDate}:${meanOf(current)}->${target}:${weeks}w${hoursPerWeek}h${restDays}r`;
  return {
    current,
    target,
    weeks,
    hoursPerWeek,
    restDays,
    startDate: input.startDate,
    seed,
    minutesPerWeek,
    studyDays: 7 - restDays,
  };
}

/**
 * Indicative guided-study hours required per 0.5-band increase, given the
 * candidate's current overall band. Gains get slower as the target band
 * approaches native-like proficiency; the five tiers below are a planning
 * heuristic in the range commonly reported by preparation providers, not an
 * empirical claim about any individual candidate.
 *
 * @param currentMean - Mean of the current component bands.
 */
export function hoursPerHalfBand(currentMean: number): number {
  if (currentMean < 4.5) {
    return 100;
  }
  if (currentMean < 5.5) {
    return 140;
  }
  if (currentMean < 6.5) {
    return 200;
  }
  if (currentMean < 7.5) {
    return 280;
  }
  return 360;
}

/**
 * Judge whether a proposed schedule can bridge the band gap under the model.
 *
 * @param currentMean - Mean of the current component bands.
 * @param target - Target overall band.
 * @param weeks - Proposed plan length.
 * @param hoursPerWeek - Proposed weekly study time.
 */
export function estimateFeasibility(
  currentMean: number,
  target: number,
  weeks: number,
  hoursPerWeek: number,
): PlanFeasibility {
  const gap = Math.max(0, target - currentMean);
  const hours = hoursPerHalfBand(currentMean);
  const requiredHours = gap === 0 ? 0 : Math.ceil(gap / 0.5) * hours;
  const availableHours = weeks * hoursPerWeek;
  const weeksRequired = gap === 0 ? 0 : Math.ceil(requiredHours / hoursPerWeek);
  const projectedBand = currentMean + Math.floor(availableHours / hours) * 0.5;
  const projectedGain = Math.max(0, Math.min(target, projectedBand) - currentMean);
  let verdict: PlanFeasibility['verdict'];
  if (gap === 0) {
    verdict = 'at-target';
  } else if (availableHours >= requiredHours) {
    verdict = 'achievable';
  } else if (availableHours >= 0.6 * requiredHours) {
    verdict = 'ambitious';
  } else {
    verdict = 'insufficient-time';
  }
  return {
    currentMean,
    target,
    gap,
    hoursPerHalfBand: hours,
    requiredHours,
    weeksRequired,
    availableHours,
    projectedGain,
    verdict,
  };
}

/**
 * Split the weekly minute budget across the four skills in proportion to
 * their band gaps (maintenance skills keep a small weight so they are never
 * abandoned). The division is exact: the returned shares always sum to the
 * weekly budget, and each share is a multiple of five minutes.
 *
 * @param current - Validated component bands.
 * @param target - Validated target band.
 * @param minutesPerWeek - Weekly budget in minutes.
 */
export function skillAllocations(
  current: Record<Skill, number>,
  target: number,
  minutesPerWeek: number,
): SkillAllocation[] {
  const gaps = SKILLS.map((skill) => Math.max(0, target - current[skill]));
  const weights = gaps.map((gap) => (gap > 0 ? gap : MAINTENANCE_WEIGHT));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const units = minutesPerWeek / MINUTE_GRANULARITY;
  const shares = weights.map((weight) => (weight / weightTotal) * units);
  const unitCounts = shares.map((share) => Math.floor(share));
  const byFraction = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  let used = unitCounts.reduce((sum, count) => sum + count, 0);
  let cursor = 0;
  while (used < units) {
    const pick = byFraction[cursor % byFraction.length] as { index: number };
    unitCounts[pick.index] = (unitCounts[pick.index] as number) + 1;
    used += 1;
    cursor += 1;
  }
  return SKILLS.map((skill, index) => ({
    skill,
    current: current[skill] as number,
    gap: gaps[index] as number,
    weight: weights[index] as number,
    minutesPerWeek: (unitCounts[index] as number) * MINUTE_GRANULARITY,
  }));
}

/** Phase of the plan a given week sits in. */
function phaseFor(week: number, totalWeeks: number): PlanPhase {
  const position = (week - 1) / totalWeeks;
  if (position < 0.25) {
    return 'foundation';
  }
  if (position < 0.6) {
    return 'skill-build';
  }
  if (position < 0.85) {
    return 'exam-practice';
  }
  return 'assessment-taper';
}

/** Add whole days to an ISO date, staying in UTC. */
function addIsoDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Materialise an activity's endpoint template for one concrete session. */
function instantiateEndpoint(template: string | null, sessionSeed: string, date: string): string | null {
  if (template === null) {
    return null;
  }
  return template.replaceAll('{seed}', sessionSeed).replaceAll('{date}', date);
}

/** Explanation strings that ship with every plan. */
const METHODOLOGY: readonly string[] = [
  'Weekly minutes are shared between the four skills in proportion to each skill’s band gap; a skill already at the target keeps a maintenance weight of 0.25 so it is practised but not over-weighted.',
  'Minute shares are quantised to five-minute granularity with a largest-remainder method, so the scheduled minutes exactly equal hoursPerWeek × 60.',
  `Feasibility uses hours per half band of 100/140/200/280/360 for mean bands below 4.5/5.5/6.5/7.5 and at or above 7.5. This is an indicative planning heuristic drawn from the ranges preparation providers publish; it is not a score prediction.`,
  'Session activities are drawn from the original activity catalogue with a seeded PRNG, so identical inputs always produce byte-identical plans; cite the seed to reproduce a plan.',
  'Each week pays a 15-minute error-log review out of the largest skill budget; weeks in the assessment-taper phase additionally run a full mock examination when the budget can fund it.',
  'Sessions whose activity has an endpoint template carry a fully materialised, seeded API path (the {seed} placeholder embeds the week, day and session index), so every session can be executed against this API and re-fetched identically later.',
];

/**
 * Build a deterministic week-by-week study plan.
 *
 * @param input - Plan request; see {@link StudyPlanInput}.
 * @throws {HttpError} `400` when any field is outside its documented range.
 */
export function buildStudyPlan(input: StudyPlanInput): StudyPlan {
  const plan = normalizeStudyPlanInput(input);
  const currentMean = meanOf(plan.current);
  const feasibility = estimateFeasibility(currentMean, plan.target, plan.weeks, plan.hoursPerWeek);
  const allocations = skillAllocations(plan.current, plan.target, plan.minutesPerWeek);
  const review = findActivity(REVIEW_ACTIVITY_ID) as StudyActivity;
  const mock = findActivity(MOCK_ACTIVITY_ID) as StudyActivity;
  const random = mulberry32(hashString(plan.seed));
  const schedule: PlanWeek[] = [];
  const bySkill: Record<string, number> = {};
  let sessionCount = 0;
  let minuteTotal = 0;

  for (let week = 1; week <= plan.weeks; week += 1) {
    const phase = phaseFor(week, plan.weeks);
    const budget = allocations.map((allocation) => allocation.minutesPerWeek);
    const sessions: PlanSession[] = [];
    let dayCounter = 0;

    const pushSession = (activity: StudyActivity, skill: Skill | 'general', minutes: number, day: number) => {
      const date = addIsoDays(plan.startDate, (week - 1) * 7 + (day - 1));
      const sessionSeed = `${plan.seed}:w${week}:d${day}:a${activity.id}`;
      sessions.push({
        day,
        date,
        skill,
        activityId: activity.id,
        title: activity.title,
        minutes,
        endpoint: instantiateEndpoint(activity.endpoint, sessionSeed, date),
      });
      bySkill[skill] = (bySkill[skill] ?? 0) + minutes;
      sessionCount += 1;
      minuteTotal += minutes;
    };

    const largest = budget.indexOf(Math.max(...budget));
    if ((budget[largest] as number) >= review.minutes + MINUTE_GRANULARITY) {
      budget[largest] = (budget[largest] as number) - review.minutes;
      pushSession(review, 'general', review.minutes, plan.studyDays);
    }
    if (phase === 'assessment-taper') {
      const funded = budget.indexOf(Math.max(...budget));
      if ((budget[funded] as number) >= mock.minutes) {
        budget[funded] = (budget[funded] as number) - mock.minutes;
        pushSession(mock, 'general', mock.minutes, plan.studyDays);
      }
    }

    for (let skillIndex = 0; skillIndex < SKILLS.length; skillIndex += 1) {
      const minutes = budget[skillIndex] as number;
      if (minutes === 0) {
        continue;
      }
      const skill = SKILLS[skillIndex] as Skill;
      const count = Math.min(Math.max(1, Math.round(minutes / TARGET_SESSION_MINUTES)), plan.studyDays);
      const perSession = Math.max(
        MINUTE_GRANULARITY,
        Math.floor(minutes / count / MINUTE_GRANULARITY) * MINUTE_GRANULARITY,
      );
      const pool = activitiesFor(skill, plan.current[skill], phase);
      for (let index = 0; index < count; index += 1) {
        const sessionMinutes = index === count - 1 ? minutes - perSession * (count - 1) : perSession;
        const activity = pool[Math.floor(random() * pool.length)] as StudyActivity;
        const day = (dayCounter % plan.studyDays) + 1;
        dayCounter += 1;
        pushSession(activity, skill, sessionMinutes, day);
      }
    }

    sessions.sort((a, b) => a.day - b.day);
    const focus = allocations
      .filter((allocation) => allocation.gap > 0)
      .map((allocation) => allocation.skill);
    schedule.push({
      week,
      phase,
      focus: focus.length === 0 ? [...SKILLS] : focus,
      totalMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
      sessions,
    });
  }

  return {
    seed: plan.seed,
    startDate: plan.startDate,
    restDays: plan.restDays,
    studyDays: plan.studyDays,
    current: plan.current,
    currentMean,
    target: plan.target,
    durationWeeks: plan.weeks,
    hoursPerWeek: plan.hoursPerWeek,
    feasibility,
    allocations,
    schedule,
    totals: { sessions: sessionCount, minutes: minuteTotal, bySkill },
    methodology: [...METHODOLOGY],
  };
}
