/**
 * Deterministic study planning.
 *
 * {@link buildStudyPlan} turns a target band, an optional set of current
 * component scores and a time budget into a week-by-week schedule that reuses
 * every other dataset in the API: gaps are weighted into weekly hours, themes
 * come from `/v1/topics/themes`, reading and listening weeks practice canonical
 * question types from `/v1/question-types`, writing weeks draw a Task 2
 * category from `/v1/topics/writing`, speaking weeks draw a part topic from
 * `/v1/topics/speaking`, and vocabulary workload is derived from the Cambridge
 * headword list.
 *
 * The plan is a pure function of its inputs: all random selections are seeded
 * from the canonical input string, so identical requests produce byte-identical
 * schedules on every replica.
 */

import { cefrForBand } from '../data/bands.js';
import { QUESTION_TYPES } from '../data/questionTypes.js';
import { ESSAY_QUESTION_TYPES, SPEAKING_TOPICS, WRITING_CATEGORIES } from '../data/topics.js';
import { EXAM_THEMES } from '../data/themes.js';
import { vocabularyStats } from '../data/vocabulary.js';
import { calculateOverall, SKILLS } from './band.js';
import { seededIndices } from './rng.js';
import { round1, round2 } from './textstats.js';

import type {
  ExamTheme,
  Skill,
  StudyActivity,
  StudyGap,
  StudyPhase,
  StudyPlan,
  StudyWeek,
} from '../types.js';

/** Inputs accepted by {@link buildStudyPlan}; all values are pre-validated. */
export interface StudyPlanOptions {
  /** Target overall band (4-9, 0.5 steps). */
  target: number;
  /** Current component scores, with defaults already applied. */
  components: Record<Skill, number>;
  /** Components explicitly supplied by the caller. */
  provided: readonly Skill[];
  /** Plan length in weeks (1-52). */
  weeks: number;
  /** Study hours available per week (1-80). */
  hoursPerWeek: number;
  /** New headwords to learn per day (1-50). */
  wordsPerDay: number;
}

/** Share of the plan spent on technique and language building. */
const FOUNDATION_SHARE = 0.4;
/** Share of the plan spent on timed practice. */
const PRACTICE_SHARE = 0.4;

const PHASE_EMPHASIS: Record<StudyPhase['name'], string> = {
  foundation:
    'Technique and language building: learn the task formats, build topic vocabulary and grammar control.',
  practice: 'Timed practice: full sections under exam conditions, error logs and targeted review.',
  polish: 'Peak and polish: full mocks, weak-point review and exam-day routines.',
};

/** Split the plan length into contiguous phase lengths. */
function splitPhases(weeks: number): Record<StudyPhase['name'], number> {
  const foundation = Math.max(1, Math.ceil(weeks * FOUNDATION_SHARE));
  const practice = Math.max(0, Math.round(weeks * PRACTICE_SHARE));
  return { foundation, practice, polish: weeks - foundation - practice };
}

/** Phase a week belongs to, given the phase lengths. */
function phaseOf(week: number, lengths: Record<StudyPhase['name'], number>): StudyPhase['name'] {
  if (week <= lengths.foundation) {
    return 'foundation';
  }
  return week <= lengths.foundation + lengths.practice ? 'practice' : 'polish';
}

/** Graded-reading CEFR level suggested for a reading band. */
function gradedLevelFor(band: number): 'a1-a2' | 'b1-b2' | 'c1-c2' {
  if (band <= 4.5) {
    return 'a1-a2';
  }
  return band <= 6.5 ? 'b1-b2' : 'c1-c2';
}

/** Question types for one receptive skill, in taxonomy order. */
function typesForSkill(skill: 'reading' | 'listening'): { id: string; name: string }[] {
  return QUESTION_TYPES.filter((type) => type.skills.includes(skill)).map((type) => ({
    id: type.id,
    name: type.name,
  }));
}

/** Drill two canonical question types of one receptive skill, seeded by week. */
function drillQuestionTypes(seed: string, week: number, skill: 'reading' | 'listening'): StudyActivity[] {
  const candidates = typesForSkill(skill);
  const picks = seededIndices(`${seed}|wk${week}|qt`, candidates.length, 2);
  return picks.map((index) => {
    const type = candidates[index] as { id: string; name: string };
    return {
      kind: 'question-type' as const,
      name: `Drill: ${type.name}`,
      url: `/v1/question-types/${type.id}`,
    };
  });
}

/** Practice activities for a reading week. */
function readingPractice(seed: string, week: number, readingBand: number): StudyActivity[] {
  const level = gradedLevelFor(readingBand);
  return [
    ...drillQuestionTypes(seed, week, 'reading'),
    {
      kind: 'practice-index' as const,
      name: `Graded reading lessons (${level})`,
      url: `/v1/tests/items?collection=graded-reading&level=${level}`,
    },
  ];
}

/** Practice activities for a listening week. */
function listeningPractice(seed: string, week: number): StudyActivity[] {
  return [
    ...drillQuestionTypes(seed, week, 'listening'),
    {
      kind: 'practice-index' as const,
      name: 'Full listening tests',
      url: '/v1/tests/items?collection=listening-full-test',
    },
  ];
}

/** Practice activities for a writing week. */
function writingPractice(seed: string, week: number): StudyActivity[] {
  const categoryIndex = seededIndices(
    `${seed}|wk${week}|category`,
    WRITING_CATEGORIES.length,
    1,
  )[0] as number;
  const typeIndex = seededIndices(
    `${seed}|wk${week}|essay-type`,
    ESSAY_QUESTION_TYPES.length,
    1,
  )[0] as number;
  const category = WRITING_CATEGORIES[categoryIndex] as string;
  const essayType = ESSAY_QUESTION_TYPES[typeIndex] as string;
  return [
    {
      kind: 'writing-task' as const,
      name: `${category} — ${essayType} essay`,
      url: `/v1/topics/writing?category=${encodeURIComponent(category)}&type=${essayType}`,
    },
  ];
}

/** Practice activities for a speaking week. */
function speakingPractice(seed: string, week: number): StudyActivity[] {
  const part = (((week - 1) % 3) + 1) as 1 | 2 | 3;
  const pool = SPEAKING_TOPICS.filter((topic) => topic.part === part);
  const index = seededIndices(`${seed}|wk${week}|topic|${part}`, pool.length, 1)[0] as number;
  const topic = pool[index] as (typeof SPEAKING_TOPICS)[number];
  return [
    {
      kind: 'speaking-part' as const,
      name: `Part ${part}: ${topic.topic}`,
      url: `/v1/topics/speaking?part=${part}`,
    },
  ];
}

/**
 * Build a deterministic study plan.
 *
 * @param options - Pre-validated inputs.
 */
export function buildStudyPlan(options: StudyPlanOptions): StudyPlan {
  const { target, weeks, hoursPerWeek, wordsPerDay, provided } = options;
  const components = options.components;
  const defaulted = SKILLS.filter((skill) => !provided.includes(skill));

  const seed = `study-plan|t${target}|w${weeks}|h${hoursPerWeek}|d${wordsPerDay}|${SKILLS.map(
    (skill) => `${skill[0]}${components[skill]}`,
  ).join('|')}`;

  // Gap analysis and weekly-hour weighting.
  const gaps = SKILLS.map((skill) => ({
    skill,
    from: components[skill],
    to: target,
    gap: Math.max(0, round2(target - components[skill])),
  }));
  const totalGap = round2(gaps.reduce((sum, gap) => sum + gap.gap, 0));
  const shares: Record<Skill, number> =
    totalGap === 0
      ? { listening: 0.25, reading: 0.25, writing: 0.25, speaking: 0.25 }
      : (Object.fromEntries(gaps.map((gap) => [gap.skill, round2(gap.gap / totalGap)])) as Record<
          Skill,
          number
        >);
  const hours = Object.fromEntries(
    SKILLS.map((skill) => [skill, round1(hoursPerWeek * shares[skill])]),
  ) as Record<Skill, number>;
  const gapRows: StudyGap[] = gaps.map((gap) => ({
    ...gap,
    share: shares[gap.skill],
    hoursPerWeek: hours[gap.skill],
  }));

  // Focus rotation: largest gap first, stable ties in report order.
  const gapOf = Object.fromEntries(gaps.map((gap) => [gap.skill, gap.gap])) as Record<Skill, number>;
  const rotation = [...SKILLS].sort(
    (left, right) => gapOf[right] - gapOf[left] || SKILLS.indexOf(left) - SKILLS.indexOf(right),
  );

  // Phase structure.
  const lengths = splitPhases(weeks);
  const phases: StudyPhase[] = [];
  let cursor = 1;
  for (const name of ['foundation', 'practice', 'polish'] as const) {
    const count = lengths[name];
    if (count > 0) {
      phases.push({ name, fromWeek: cursor, toWeek: cursor + count - 1, emphasis: PHASE_EMPHASIS[name] });
    }
    cursor += count;
  }

  // Themes available per skill.
  const themesBySkill: Record<Skill, ExamTheme[]> = { listening: [], reading: [], writing: [], speaking: [] };
  for (const theme of EXAM_THEMES) {
    for (const skill of theme.skills) {
      themesBySkill[skill].push(theme);
    }
  }

  // Week-by-week schedule.
  const mockInterval = Math.max(1, Math.round(weeks / 4));
  const weekly: StudyWeek[] = [];
  for (let week = 1; week <= weeks; week += 1) {
    const phase = phaseOf(week, lengths);
    const focus = rotation[(week - 1) % rotation.length] as Skill;
    const pool = themesBySkill[focus];
    const themePicks = seededIndices(`${seed}|wk${week}|themes|${focus}`, pool.length, 2);
    const focusPractice =
      focus === 'reading'
        ? readingPractice(seed, week, components.reading)
        : focus === 'listening'
          ? listeningPractice(seed, week)
          : focus === 'writing'
            ? writingPractice(seed, week)
            : speakingPractice(seed, week);
    const isFinal = week === weeks;
    const isMock = !isFinal && week % mockInterval === 0;
    weekly.push({
      week,
      phase,
      focus,
      hours,
      themes: themePicks.map((index) => {
        const theme = pool[index] as ExamTheme;
        return { id: theme.id, group: theme.group, name: theme.name };
      }),
      practice: focusPractice,
      vocabulary: { newWords: wordsPerDay * 5, reviewWords: wordsPerDay * 2 },
      checkpoint: isFinal
        ? {
            type: 'final-review',
            detail:
              'Final week: one last full mock early in the week, then light review of the error log and rest before test day.',
          }
        : isMock
          ? {
              type: 'full-mock',
              detail:
                'Sit a full mock of all four components, score it with /v1/scores/overall and log every miss by question type.',
            }
          : null,
    });
  }

  // Whole-plan vocabulary workload.
  const headwordsAvailable = vocabularyStats().words;
  const wordsPerWeek = wordsPerDay * 7;

  const notes = [
    `Components not supplied default to ${round2(target - 1.5)} (target − 1.5 bands); supply listening, reading, writing and speaking for an exact plan.`,
    'Weekly hours are rounded to 0.1 h, so the four components may differ from the weekly target by at most 0.2 h.',
    'Reading-level suggestions follow the corpus calibration reported by /v1/tests/stats: C1-C2 graded lessons are harder than the real papers.',
    'The plan is a pure function of its inputs: identical requests always produce the identical schedule.',
    'Themes, question types, task categories and speaking topics link back to the endpoints that publish them.',
  ];
  if (defaulted.length === 0) {
    notes.shift();
    notes.unshift('All four components were supplied; no default baseline was applied.');
  }
  if (totalGap === 0) {
    notes.push(
      'Current components already meet the target in every skill; hours are split evenly for maintenance training.',
    );
  }

  const current = calculateOverall(components, cefrForBand);
  return {
    inputs: {
      target,
      weeks,
      hoursPerWeek,
      wordsPerDay,
      providedComponents: [...provided],
      defaultedComponents: defaulted,
    },
    current: { components, overall: current.overall, cefr: cefrForBand(current.overall) },
    target: { band: target, cefr: cefrForBand(target) },
    gaps: gapRows,
    phases,
    weekly,
    vocabulary: {
      headwordsAvailable,
      wordsPerDay,
      wordsPerWeek,
      headwordsOverPlan: Math.min(headwordsAvailable, weeks * wordsPerWeek),
    },
    notes,
  };
}
