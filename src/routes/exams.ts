/**
 * Exam-format reference routes (`/v1/exams`).
 */

import { EXAM_MODULES, EXAM_PAPER_IDS, EXAM_PAPERS, EXAM_SKILLS, findExamPaper } from '../data/exams.js';
import { notFound } from '../lib/errors.js';
import { getEnum, getString, toParams } from '../lib/query.js';
import { matchesQuery } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** The published format of every paper, filterable by skill, module and text. */
function index(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', EXAM_SKILLS);
  const module = getEnum(params, 'module', EXAM_MODULES);
  const query = getString(params, 'q') ?? '';
  const papers = EXAM_PAPERS.filter((paper) => {
    if (skill !== undefined && paper.skill !== skill) {
      return false;
    }
    // Listening and Speaking are shared papers: an Academic candidate sits
    // them too, so they match every module filter.
    if (module !== undefined && module !== 'both' && paper.module !== 'both' && paper.module !== module) {
      return false;
    }
    if (module === 'both' && paper.module !== 'both') {
      return false;
    }
    if (
      query.length > 0 &&
      !matchesQuery(
        [
          paper.id,
          paper.name,
          paper.summary,
          paper.marking,
          ...paper.sections.flatMap((section) => [section.name, section.detail]),
        ],
        query,
      )
    ) {
      return false;
    }
    return true;
  });
  return {
    data: papers,
    meta: {
      total: papers.length,
      skill: skill ?? null,
      module: module ?? null,
      skills: EXAM_SKILLS,
      modules: EXAM_MODULES,
      ids: EXAM_PAPER_IDS,
      crossLinks: {
        rawScores: '/v1/scores/tables',
        questionTypes: '/v1/question-types',
        descriptors: '/v1/bands/descriptors',
      },
    },
  };
}

/** One exam paper. */
function detail(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const paper = findExamPaper(id);
  if (paper === undefined) {
    throw notFound(`No exam paper with id "${id}".`, { id, allowed: EXAM_PAPER_IDS.join(',') });
  }
  return { data: paper, meta: { ids: EXAM_PAPER_IDS } };
}

/** Exam-format routes. */
export const examRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/exams',
    versioned: true,
    summary: 'Published format of every IELTS paper: timing, sections and marking.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/exams/:id',
    versioned: true,
    summary: 'One exam paper, with its sections, timing and scoring cross-links.',
    handler: detail,
  },
];
