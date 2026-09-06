/**
 * Deterministic mock-paper blueprints assembled from the practice-test index.
 *
 * A computer-delivered test shell — such as `exam.html` in the open centre
 * <https://github.com/wanli4473/yysd-testcenter> — assembles timed papers
 * from a content manifest and lets teachers assign top-up drills by section
 * and question type (补弱). {@link buildBlueprint} is the stateless
 * equivalent: it ranks the indexed full tests by how densely they cover a set
 * of focus question types, deals a reproducible drill set from that ranking,
 * and wraps it in timing, coverage and scoring guidance. The seed *is* the
 * assignment; nothing is stored.
 */

import { practiceItems } from '../data/practiceTests.js';
import { QUESTION_TYPES } from '../data/questionTypes.js';
import { hashString, mulberry32 } from './rng.js';

import type { PracticeItem, QuestionTypeId } from '../types.js';

/** Skills a blueprint can target. */
export const BLUEPRINT_SKILLS = ['reading', 'listening'] as const;

/** One blueprint skill. */
export type BlueprintSkill = (typeof BLUEPRINT_SKILLS)[number];

/** Fewest papers a blueprint deals. */
export const BLUEPRINT_MIN_ITEMS = 1;

/** Most papers a blueprint deals. */
export const BLUEPRINT_MAX_ITEMS = 10;

/** Default drill-set size. */
export const BLUEPRINT_DEFAULT_ITEMS = 3;

/** Seed used when the caller does not supply one. */
export const BLUEPRINT_DEFAULT_SEED = 'ielts-blueprint';

/** Exam minutes for a 40-question paper, by skill. */
const PAPER_MINUTES: Record<BlueprintSkill, number> = { reading: 60, listening: 30 };

/** Answer-transfer minutes added to a listening sitting. */
const LISTENING_TRANSFER_MINUTES = 10;

/** Raw-score scale used to grade a paper, by skill. */
const SCORING_SCALE: Record<BlueprintSkill, string> = {
  reading: 'academic-reading',
  listening: 'listening',
};

/** Canonical type names, keyed by identifier. */
const TYPE_NAMES = Object.fromEntries(QUESTION_TYPES.map((type) => [type.id, type.name])) as Record<
  QuestionTypeId,
  string
>;

/** Canonical types of one skill, in taxonomy order. */
function canonicalFor(skill: BlueprintSkill): QuestionTypeId[] {
  return QUESTION_TYPES.filter((type) => type.skills.includes(skill)).map((type) => type.id);
}

/** Full-test candidates of one skill, in index order. */
function candidatesFor(skill: BlueprintSkill): PracticeItem[] {
  const collection = skill === 'reading' ? 'reading-full-test' : 'listening-full-test';
  return practiceItems().filter((item) => item.collection === collection);
}

/**
 * Rank weight of an item: focus-type questions, or all questions without a focus.
 *
 * @param item - Candidate item.
 * @param focus - Focus question types.
 * @returns The number of questions the item contributes.
 */
function focusScore(item: PracticeItem, focus: readonly QuestionTypeId[]): number {
  if (focus.length === 0) {
    return item.questions;
  }
  return focus.reduce((sum, type) => sum + (item.typeCounts[type] ?? 0), 0);
}

/**
 * Shuffle candidates with a seeded generator so tied ranks break reproducibly.
 *
 * @param items - Candidates to shuffle.
 * @param seed - Seed string.
 * @returns The shuffled candidates.
 */
function shuffleCandidates(items: PracticeItem[], seed: string): PracticeItem[] {
  const random = mulberry32(hashString(seed));
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const left = shuffled[index] as PracticeItem;
    const right = shuffled[other] as PracticeItem;
    shuffled[index] = right;
    shuffled[other] = left;
  }
  return shuffled;
}

/** One paper dealt into a blueprint. */
export type BlueprintPaper = {
  /** Item identifier. */
  id: string;
  /** Item title as published upstream. */
  title: string;
  /** API URL of the indexed item. */
  url: string;
  /** Total number of questions. */
  questions: number;
  /** Questions on the focus types (or all questions without a focus). */
  focusQuestions: number;
  /** Canonical question types present. */
  questionTypes: readonly QuestionTypeId[];
  /** Suggested time box in minutes. */
  suggestedMinutes: number;
  /** Flesch Reading Ease of the passages, or `null` for listening. */
  readingEase: number | null;
  /** Flesch-Kincaid grade of the passages, or `null` for listening. */
  fleschKincaidGrade: number | null;
};

/** One uncovered canonical type, with its study link. */
export type BlueprintGap = {
  /** Canonical question-type identifier. */
  id: QuestionTypeId;
  /** Canonical question-type name. */
  name: string;
  /** API URL of the question-type guidance. */
  url: string;
};

/** A deal of mock papers with timing, coverage and scoring guidance. */
export type Blueprint = {
  /** Seed the blueprint was dealt from. */
  seed: string;
  /** Targeted skill. */
  skill: BlueprintSkill;
  /** Focus question types, in taxonomy order. */
  focus: readonly QuestionTypeId[];
  /** Papers dealt, best focus coverage first. */
  papers: readonly BlueprintPaper[];
  /** Canonical types covered by the dealt papers. */
  covered: readonly QuestionTypeId[];
  /** Canonical types no dealt paper covers. */
  missing: readonly BlueprintGap[];
  /** Total questions across the dealt papers. */
  totalQuestions: number;
  /** Total suggested minutes across the dealt papers. */
  totalMinutes: number;
  /** Transfer minutes for a listening sitting, otherwise `null`. */
  transferMinutes: number | null;
  /** Mean Flesch Reading Ease of the dealt papers, or `null` for listening. */
  meanReadingEase: number | null;
  /** Raw-score scale used to grade the papers. */
  scoringScale: string;
  /** Scoring endpoint for the scale. */
  scoringUrl: string;
};

/** Options accepted by {@link buildBlueprint}. */
export type BuildBlueprintOptions = {
  /** Seed string; identical seeds deal identical blueprints. */
  seed: string;
  /** Targeted skill. */
  skill: BlueprintSkill;
  /** Focus question types; order is normalised to the taxonomy order. */
  focus: readonly QuestionTypeId[];
  /** How many papers to deal. */
  items: number;
};

/**
 * Deal a deterministic drill set from the indexed full tests.
 *
 * @param options - Blueprint options.
 * @returns The blueprint.
 */
export function buildBlueprint(options: BuildBlueprintOptions): Blueprint {
  const canonical = canonicalFor(options.skill);
  const focus = canonical.filter((type) => options.focus.includes(type));
  const ranked = shuffleCandidates(candidatesFor(options.skill), `${options.seed}|papers`)
    .map((item) => ({ item, score: focusScore(item, focus) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, options.items);
  const papers = ranked.map(({ item }) => {
    const readability = item.readability as { fleschReadingEase: number; fleschKincaidGrade: number };
    return {
      id: item.id,
      title: item.title,
      url: `/v1/tests/${item.id}`,
      questions: item.questions,
      focusQuestions: focusScore(item, focus),
      questionTypes: [...item.questionTypes],
      suggestedMinutes: Math.max(10, Math.round((item.questions / 40) * PAPER_MINUTES[options.skill])),
      readingEase: options.skill === 'reading' ? readability.fleschReadingEase : null,
      fleschKincaidGrade: options.skill === 'reading' ? readability.fleschKincaidGrade : null,
    };
  });
  const coveredSet = new Set(papers.flatMap((paper) => paper.questionTypes));
  const covered = canonical.filter((type) => coveredSet.has(type));
  const missing = canonical
    .filter((type) => !coveredSet.has(type))
    .map((type) => ({ id: type, name: TYPE_NAMES[type], url: `/v1/question-types/${type}` }));
  const totalQuestions = papers.reduce((sum, paper) => sum + paper.questions, 0);
  const totalMinutes = papers.reduce((sum, paper) => sum + paper.suggestedMinutes, 0);
  const meanReadingEase =
    options.skill === 'reading' && papers.length > 0
      ? Math.round(
          (papers.reduce((sum, paper) => sum + (paper.readingEase as number), 0) / papers.length) * 100,
        ) / 100
      : null;
  return {
    seed: options.seed,
    skill: options.skill,
    focus,
    papers,
    covered,
    missing,
    totalQuestions,
    totalMinutes,
    transferMinutes: options.skill === 'listening' ? LISTENING_TRANSFER_MINUTES : null,
    meanReadingEase,
    scoringScale: SCORING_SCALE[options.skill],
    scoringUrl: `/v1/scores/raw-tables?scale=${SCORING_SCALE[options.skill]}`,
  };
}
