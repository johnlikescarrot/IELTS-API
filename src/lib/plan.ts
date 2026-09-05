/**
 * Study-plan generation.
 *
 * `buildStudyPlan` turns a band gap into an auditable weekly schedule. It is
 * a transparent heuristic, not a black box: every allocation rule is listed in
 * the response's `assumptions`, and the plan points at real dataset items
 * (Writing prompts, Speaking cards, graded reading passages, strategy cards)
 * so the plan can be executed against the API itself. The design goal is that
 * a researcher can reproduce, criticise or modify the allocation in a paper;
 * the heuristics are deliberately simple enough to re-implement in one page of
 * pseudocode (documented in RESEARCH.md §7).
 *
 * Allocation model:
 *
 * - each skill's demand is `max(0.5, gap + priority bonus)`, where the bonus
 *   applies to skills flagged as weak; hours are split proportionally and
 *   rounded to half hours, with a fixed review share;
 * - the weekly focus skill rotates through the skills ordered by demand, so
 *   the weakest skill is always in week one;
 * - vocabulary load grows with the gap and the available hours;
 * - reading material is selected at the target band's CEFR level, falling
 *   back to the whole dataset when that level has no passage;
 * - mock-test milestones land every fourth week, plus a closing review week.
 */

import { cefrForBand } from '../data/bands.js';
import { READING_PASSAGES } from '../data/reading.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../data/topics.js';
import { strategiesFor } from '../data/strategies.js';
import { SKILLS } from './band.js';
import { badRequest } from './errors.js';

import type { Skill, StudyPlan, StudyPlanWeek } from '../types.js';

/** Validated input for {@link buildStudyPlan}. */
export type StudyPlanRequest = {
  /** Current overall band (0-9, half-band steps). */
  current: number;
  /** Target overall band (0-9, half-band steps). */
  target: number;
  /** Plan length in weeks. */
  weeks: number;
  /** Total hours a candidate can study per week. */
  hoursPerWeek: number;
  /** Skills the candidate self-reports as weak. */
  focus?: readonly string[];
};

/** Proportion of weekly hours reserved for review and feedback. */
const REVIEW_SHARE = 0.25;

/** Priority bonus applied to flagged weak skills, in bands. */
const FOCUS_BONUS = 0.5;

/** Round to the nearest half hour. */
function roundHalf(hours: number): number {
  return Math.round(hours * 2) / 2;
}

/**
 * Build a deterministic weekly plan between two band scores.
 *
 * @param request - Validated plan request.
 * @throws {HttpError} `400` when the target band is below the current band.
 */
export function buildStudyPlan(request: StudyPlanRequest): StudyPlan {
  if (request.target < request.current) {
    throw badRequest('"target" must be greater than or equal to "current".', {
      parameter: 'target',
      received: String(request.target),
    });
  }
  const gap = request.target - request.current;
  const focus = new Set(request.focus ?? []);
  const demands = SKILLS.map((skill) => ({
    skill,
    demand: Math.max(0.5, gap + (focus.has(skill) ? FOCUS_BONUS : 0)),
  }));
  const totalDemand = demands.reduce((sum, entry) => sum + entry.demand, 0);
  const reviewHours = Math.max(0.5, roundHalf(request.hoursPerWeek * REVIEW_SHARE));
  const teachable = Math.max(0.5, request.hoursPerWeek - reviewHours);
  const byDemand = [...demands].sort(
    (left, right) => right.demand - left.demand || (left.skill < right.skill ? -1 : 1),
  );
  const targetCefr = cefrForBand(request.target);
  const passagesForTarget = READING_PASSAGES.filter((passage) => passage.cefrLevel === targetCefr);
  const wordsPerWeek = Math.min(60, 12 + Math.round(gap * 6) + Math.round(request.hoursPerWeek / 2));

  const weekly: StudyPlanWeek[] = [];
  for (let week = 1; week <= request.weeks; week += 1) {
    const focusSkill = byDemand[(week - 1) % byDemand.length] as { skill: Skill };
    const skillCards = strategiesFor(focusSkill.skill);
    const readingPool = passagesForTarget.length > 0 ? passagesForTarget : [...READING_PASSAGES];
    const milestone =
      week % 4 === 0
        ? 'Mock test under timed conditions. Compare component bands with the plan and re-weight next month’s hours.'
        : week === request.weeks
          ? 'Final review: retake a full mock test; sit the exam when three consecutive mocks reach the target.'
          : null;
    weekly.push({
      week,
      focusSkill: focusSkill.skill,
      hours: Object.fromEntries(
        demands.map((entry) => [entry.skill, roundHalf((teachable * entry.demand) / totalDemand)]),
      ) as Record<Skill, number>,
      reviewHours,
      vocabularyWords: wordsPerWeek,
      materials: {
        writingTopicId: (WRITING_TOPICS[(week - 1) % WRITING_TOPICS.length] as { id: string }).id,
        speakingTopicId: (SPEAKING_TOPICS[(week - 1) % SPEAKING_TOPICS.length] as { id: string }).id,
        readingPassageId: (readingPool[(week - 1) % readingPool.length] as { id: string }).id,
        strategyIds: [
          (skillCards[(week - 1) % skillCards.length] as { id: string }).id,
          (skillCards[week % skillCards.length] as { id: string }).id,
        ],
      },
      milestone,
    });
  }

  return {
    current: request.current,
    target: request.target,
    gap,
    weeks: request.weeks,
    hoursPerWeek: request.hoursPerWeek,
    targetCefr,
    focus: [...focus],
    weekly,
    assumptions: [
      `Skills are weighted by max(0.5, target - current${focus.size > 0 ? ` + ${FOCUS_BONUS} for flagged weak skills` : ''}); hours are split proportionally to those weights.`,
      `A fixed ${REVIEW_SHARE * 100}% of weekly hours (minimum 0.5) is reserved for review and feedback; per-skill hours are rounded to half hours, so they may not sum exactly to the remainder.`,
      `Vocabulary load is min(60, 12 + 6 x gap + hours/2) new words per week; spacing and retrieval practice are assumed (see the strategy bank).`,
      'Reading material is drawn at the target band’s indicative CEFR level, falling back to the whole passage set when the level has no passage.',
      'The plan is a study heuristic, not official advice from the IELTS partners; band gains per hour are individual and evidence on their size is mixed.',
    ],
  };
}
