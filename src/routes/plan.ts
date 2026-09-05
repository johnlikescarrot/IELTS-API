/**
 * Study-plan routes (`/v1/plan`).
 *
 * `GET /v1/plan` generates a deterministic, week-by-week preparation schedule;
 * `GET /v1/plan/activities` exposes the underlying activity catalogue; and
 * `GET /v1/plan/estimate` answers the "how long do I need" question on its
 * own. Like every endpoint in this service, all three are pure functions of
 * their query string — identical requests return byte-identical responses,
 * which is what makes a generated plan citable.
 */

import { SKILLS, assertBand, meanOf } from '../lib/band.js';
import { badRequest } from '../lib/errors.js';
import { buildStudyPlan, estimateFeasibility } from '../lib/plan.js';
import { getEnum, getInt, getIsoDate, getNumber, getString, requireString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';
import { ACTIVITY_PHASES, ACTIVITY_SKILLS, STUDY_ACTIVITIES, activityStats } from '../data/activities.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { QueryParams, Skill } from '../types.js';

/** Parse `current` (one band repeated, or four comma-separated bands). */
function parseCurrent(params: QueryParams): Record<Skill, number> {
  const raw = requireString(params, 'current');
  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length !== 1 && tokens.length !== SKILLS.length) {
    throw badRequest(
      'Parameter "current" must be one band or four comma-separated bands (listening, reading, writing, speaking).',
      { parameter: 'current', received: raw },
    );
  }
  const current = {} as Record<Skill, number>;
  for (const skill of SKILLS) {
    const key = `current${skill.charAt(0).toUpperCase()}${skill.slice(1)}`;
    const override = getNumber(params, key, 0, 9);
    if (override !== undefined) {
      current[skill] = assertBand(override, key);
      continue;
    }
    const token = tokens.length === 1 ? tokens[0] : tokens[SKILLS.indexOf(skill)];
    current[skill] = assertBand(Number(token), `current.${skill}`);
  }
  return current;
}

/** Common plan parameters shared by `/v1/plan` and `/v1/plan/estimate`. */
function parseCommon(params: QueryParams): {
  current: Record<Skill, number>;
  target: number;
  hoursPerWeek: number;
} {
  const current = parseCurrent(params);
  const target = assertBand(getNumber(params, 'target', 0, 9) ?? 7, 'target');
  const hoursPerWeek = getInt(params, 'hoursPerWeek', 1, 80, 10);
  return { current, target, hoursPerWeek };
}

/** Generate a full study plan. */
function generate(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const { current, target, hoursPerWeek } = parseCommon(params);
  const weeks = getInt(params, 'weeks', 1, 52, 8);
  const restDays = getInt(params, 'restDays', 0, 3, 0);
  const startDate = getIsoDate(params, 'startDate', new Date().toISOString().slice(0, 10));
  const seed = getString(params, 'seed');
  const plan = buildStudyPlan({
    current,
    target,
    weeks,
    hoursPerWeek,
    restDays,
    startDate,
    ...(seed === undefined ? {} : { seed }),
  });
  return {
    data: plan,
    meta: {
      seed: plan.seed,
      verdict: plan.feasibility.verdict,
      weeksRequired: plan.feasibility.weeksRequired,
      sessions: plan.totals.sessions,
      minutes: plan.totals.minutes,
      deterministic: true,
    },
  };
}

/** Feasibility estimate without a full schedule. */
function estimate(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const { current, target, hoursPerWeek } = parseCommon(params);
  const weeks = getInt(params, 'weeks', 1, 104, 12);
  const overall = estimateFeasibility(meanOf(current), target, weeks, hoursPerWeek);
  const skills = SKILLS.map((skill) => ({
    skill,
    ...estimateFeasibility(current[skill] as number, target, weeks, hoursPerWeek),
  }));
  return {
    data: { overall, skills },
    meta: {
      note: 'Indicative planning heuristic derived from published preparation guidance; not a score prediction.',
      weeks,
      hoursPerWeek,
    },
  };
}

/** The activity catalogue behind generated plans. */
function activities(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', ACTIVITY_SKILLS);
  const phase = getEnum(params, 'phase', ACTIVITY_PHASES);
  const band = getNumber(params, 'band', 0, 9);
  const query = getString(params, 'q') ?? '';
  const filtered = STUDY_ACTIVITIES.filter(
    (activity) =>
      (skill === undefined || activity.skill === skill) &&
      (phase === undefined || activity.phases.includes(phase)) &&
      (band === undefined || (band >= activity.minBand && band <= activity.maxBand)) &&
      (query.length === 0 ||
        matchesQuery([activity.title, activity.summary, activity.id, ...activity.steps], query)),
  );
  return {
    data: filtered,
    meta: {
      count: filtered.length,
      total: STUDY_ACTIVITIES.length,
      skill: skill ?? null,
      phase: phase ?? null,
      band: band ?? null,
      bySkill: activityStats().bySkill,
    },
  };
}

/** Study-plan routes. */
export const planRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/plan',
    versioned: true,
    summary: 'Generate a deterministic, reproducible week-by-week study plan.',
    handler: generate,
  },
  {
    method: 'GET',
    path: '/v1/plan/activities',
    versioned: true,
    summary: 'The activity catalogue plans are built from (techniques, drills and exam-experience habits).',
    handler: activities,
  },
  {
    method: 'GET',
    path: '/v1/plan/estimate',
    versioned: true,
    summary: 'Estimate weeks and hours needed to reach a target band at a given study intensity.',
    handler: estimate,
  },
];
