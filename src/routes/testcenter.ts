/**
 * Mock-exam test-centre routes (`/v1/testcenter`).
 *
 * The upstream repository declares no licence, so these routes publish
 * derived, non-substitutive metadata only: catalogue facts, the Cambridge
 * holdings matrix, the hand-tagged question-group taxonomy, the scene
 * vocabulary and the platform's score calibration. No exam HTML, question
 * text, answer key, audio or vocabulary entry is served.
 */

import {
  TESTCENTER_DIFFICULTIES,
  TESTCENTER_PAPERS,
  TESTCENTER_TAGGED_PAPERS,
  buildDrill,
  findCatalogItem,
  findScoringRow,
  findTestcenterVolume,
  searchCatalog,
  searchGroups,
  testcenterCatalogFacets,
  testcenterGroupFacets,
  testcenterGroups,
  testcenterMeta,
  testcenterScenes,
  testcenterScoring,
  testcenterStats,
  testcenterTiming,
  testcenterVolumes,
} from '../data/testcenter.js';
import { QUESTION_TYPE_IDS } from '../data/questionTypes.js';
import { badRequest, notFound } from '../lib/errors.js';
import { parseList } from '../lib/search.js';
import { getEnum, getInt, getString, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

const CATALOG_SORT_KEYS = ['title', 'subject', 'duration', 'added'] as const;
const GROUP_SORT_KEYS = ['volume', 'questions', 'type', 'scene'] as const;
const ORDERS = ['asc', 'desc'] as const;

/** Facet values for the catalogue, for response metadata. */
function catalogFacetsView(): Record<string, string[]> {
  return {
    zone: testcenterCatalogFacets('zone'),
    subject: testcenterCatalogFacets('subject'),
    paper: testcenterCatalogFacets('paper'),
  };
}

/** Facet values for the question groups, for response metadata. */
function groupFacetsView(): Record<string, string[]> {
  return {
    paper: [...TESTCENTER_TAGGED_PAPERS],
    type: testcenterGroupFacets('type'),
    scene: testcenterGroupFacets('scene'),
    difficulty: [...TESTCENTER_DIFFICULTIES],
  };
}

/** Read the required tagged-paper parameter shared by `/scoring` and `/drill`. */
function requirePaper(context: RouteContext): 'listening' | 'reading' {
  const paper = getEnum(toParams(context.url), 'paper', TESTCENTER_TAGGED_PAPERS);
  if (paper === undefined) {
    throw badRequest('Parameter "paper" is required and must be one of: listening, reading.', {
      parameter: 'paper',
      allowed: TESTCENTER_TAGGED_PAPERS.join(','),
    });
  }
  return paper;
}

/** Test-centre metadata, statistics and timing budgets. */
function index(): HandlerResult {
  return {
    data: { meta: testcenterMeta(), stats: testcenterStats(), timing: testcenterTiming() },
    meta: { facets: { catalog: catalogFacetsView(), groups: groupFacetsView() } },
  };
}

/** Aggregate statistics only. */
function stats(): HandlerResult {
  return { data: testcenterStats(), meta: { note: testcenterMeta().note } };
}

/** Search the paper catalogue. */
function catalog(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 1000, 0);
  const sort = getEnum(params, 'sort', CATALOG_SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const zones = parseList(getString(params, 'zone'), 'zone', testcenterCatalogFacets('zone'));
  const subjects = parseList(getString(params, 'subject'), 'subject', testcenterCatalogFacets('subject'));
  const papers = parseList(getString(params, 'paper'), 'paper', TESTCENTER_PAPERS);
  const volume = getInt(params, 'volume', 3, 21, -1);
  const page = searchCatalog({
    limit,
    offset,
    query,
    ...(zones === undefined ? {} : { zones }),
    ...(subjects === undefined ? {} : { subjects }),
    ...(papers === undefined ? {} : { papers }),
    ...(volume < 0 ? {} : { volume }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      sort: sort ?? 'title',
      order: order ?? 'asc',
      facets: catalogFacetsView(),
      note: testcenterMeta().note,
    },
  };
}

/** One catalogue paper, with its tagged question groups when it has any. */
function catalogItem(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findCatalogItem(id);
  if (found === undefined) {
    throw notFound(`No catalogue paper with id "${id}" in the test-centre index.`, { id });
  }
  const groups = testcenterGroups().filter((group) => group.parentId === found.upstreamId);
  return {
    data: { ...found, groups },
    meta: {
      taggedGroups: groups.length,
      repository: testcenterMeta().repository,
      license: testcenterMeta().license,
      note: testcenterMeta().note,
    },
  };
}

/** The Cambridge holdings matrix. */
function volumes(): HandlerResult {
  return {
    data: testcenterVolumes(),
    meta: {
      count: testcenterVolumes().length,
      note: 'One row per hosted Cambridge IELTS volume; the holdings analysis is in RESEARCH.md Part VII.',
    },
  };
}

/** One Cambridge holdings row. */
function volume(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const number = Number.parseInt(id, 10);
  const found = Number.isInteger(number) ? findTestcenterVolume(number) : undefined;
  if (found === undefined) {
    throw notFound(`No Cambridge IELTS volume "${id}" in the test-centre index.`, { id });
  }
  return { data: found, meta: { note: testcenterMeta().note } };
}

/** Search the hand-tagged question groups. */
function groups(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', GROUP_SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const papers = parseList(getString(params, 'paper'), 'paper', TESTCENTER_TAGGED_PAPERS);
  const types = parseList(getString(params, 'type'), 'type', QUESTION_TYPE_IDS);
  const scenes = parseList(getString(params, 'scene'), 'scene', testcenterGroupFacets('scene'));
  const difficulties = parseList(getString(params, 'difficulty'), 'difficulty', TESTCENTER_DIFFICULTIES);
  const volume = getInt(params, 'volume', 3, 21, -1);
  const test = getInt(params, 'test', 1, 4, -1);
  const page = searchGroups({
    limit,
    offset,
    query,
    ...(papers === undefined ? {} : { papers }),
    ...(types === undefined ? {} : { types }),
    ...(scenes === undefined ? {} : { scenes }),
    ...(difficulties === undefined ? {} : { difficulties }),
    ...(volume < 0 ? {} : { volume }),
    ...(test < 0 ? {} : { test }),
    ...(sort === undefined ? {} : { sort }),
    ...(order === undefined ? {} : { order }),
  });
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      query: query.length > 0 ? query : null,
      sort: sort ?? 'volume',
      order: order ?? 'asc',
      facets: groupFacetsView(),
      note: testcenterMeta().note,
    },
  };
}

/** The teaching-scene vocabulary of both tagged papers. */
function scenes(): HandlerResult {
  const listening = testcenterScenes('listening');
  const reading = testcenterScenes('reading');
  return {
    data: { listening, reading },
    meta: {
      count: listening.length + reading.length,
      note: 'Teaching scenes are the platform\u2019s own vocabulary; themeGroup maps each scene onto the /v1/topics/themes groups.',
    },
  };
}

/** The production raw-score-to-band calibration, optionally with a lookup. */
function scoring(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const paper = getEnum(params, 'paper', TESTCENTER_TAGGED_PAPERS);
  const rawScore = getString(params, 'raw');
  if (rawScore !== undefined && paper === undefined) {
    throw badRequest('Parameter "paper" is required when "raw" is given.', {
      parameter: 'paper',
      allowed: TESTCENTER_TAGGED_PAPERS.join(','),
    });
  }
  if (paper === undefined) {
    return { data: testcenterScoring(), meta: { note: testcenterScoring().note } };
  }
  if (rawScore === undefined) {
    return {
      data: { [paper]: testcenterScoring()[paper] },
      meta: { paper, note: testcenterScoring().note },
    };
  }
  if (!/^[+-]?\d+$/.test(rawScore)) {
    throw badRequest('Parameter "raw" must be an integer between 0 and 40.', {
      parameter: 'raw',
      received: rawScore,
    });
  }
  const score = Number.parseInt(rawScore, 10);
  const row = findScoringRow(paper, score);
  if (row === undefined) {
    throw notFound(`No calibration row covers raw score ${score}.`, { paper, raw: String(score) });
  }
  return {
    data: {
      paper,
      raw: score,
      band: row.band,
      level: row.level,
      rawRange: { from: row.rawFrom, to: row.rawTo },
    },
    meta: { paper, lookup: true, note: testcenterScoring().note },
  };
}

/** Compose a deterministic drill from the hand-tagged groups. */
function drill(context: RouteContext): HandlerResult {
  const paper = requirePaper(context);
  const params = toParams(context.url);
  const questions = getInt(params, 'questions', 1, 40, 10);
  const minutes = getInt(params, 'minutes', 1, 180, -1);
  const type = getEnum(params, 'type', QUESTION_TYPE_IDS);
  const scene = getEnum(params, 'scene', testcenterGroupFacets('scene'));
  const difficulty = getEnum(params, 'difficulty', TESTCENTER_DIFFICULTIES);
  const volume = getInt(params, 'volume', 3, 21, -1);
  const test = getInt(params, 'test', 1, 4, -1);
  const plan = buildDrill({
    paper,
    questions,
    ...(minutes < 0 ? {} : { minutes }),
    ...(type === undefined ? {} : { type }),
    ...(scene === undefined ? {} : { scene }),
    ...(difficulty === undefined ? {} : { difficulty }),
    ...(volume < 0 ? {} : { volume }),
    ...(test < 0 ? {} : { test }),
  });
  const overshoot = plan.totals.questions - questions;
  return {
    data: plan,
    meta: {
      count: plan.totals.groups,
      deterministic: true,
      ...(overshoot > 0
        ? { note: `The last group overshoots the requested question count by ${overshoot}.` }
        : {}),
    },
  };
}

/** Test-centre routes. Literal paths precede parameterised ones. */
export const testcenterRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/testcenter',
    versioned: true,
    summary: 'Provenance, statistics and timing budgets for the indexed mock-exam test centre.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/stats',
    versioned: true,
    summary: 'Test-centre statistics: catalogue, taxonomies and raw-label mappings.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/catalog',
    versioned: true,
    summary:
      'Search the self-marking paper catalogue by zone, subject, paper, Cambridge volume or free text.',
    handler: catalog,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/catalog/:id',
    versioned: true,
    summary: 'One catalogue paper, with its tagged question groups when it has any.',
    handler: catalogItem,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/volumes',
    versioned: true,
    summary: 'The Cambridge holdings matrix: one row per volume hosted by the test centre.',
    handler: volumes,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/volumes/:id',
    versioned: true,
    summary: 'One Cambridge holdings row.',
    handler: volume,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/groups',
    versioned: true,
    summary: 'Search the hand-tagged question groups by paper, type, scene, difficulty, volume or test.',
    handler: groups,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/scenes',
    versioned: true,
    summary: 'The teaching-scene vocabulary of both tagged papers, crosswalked to the themes.',
    handler: scenes,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/scoring',
    versioned: true,
    summary: 'The production raw-score-to-band calibration, with optional band lookup (`paper`, `raw`).',
    handler: scoring,
  },
  {
    method: 'GET',
    path: '/v1/testcenter/drill',
    versioned: true,
    summary:
      'Compose a deterministic timed drill from tagged groups (`paper` required; `type`, `scene`, `difficulty`, `volume`, `test`, `questions`, `minutes`).',
    handler: drill,
  },
];
