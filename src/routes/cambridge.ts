/**
 * Cambridge IELTS test-structure routes (`/v1/cambridge`).
 *
 * The index publishes derived metadata only: the structure of every test,
 * canonical question types, answer forms, readability, audio durations,
 * writing task families and the upstream editorial labels. No passage,
 * question, answer key, prompt text, image or audio is served.
 */

import {
  CAMBRIDGE_DIFFICULTIES,
  CAMBRIDGE_SKILLS,
  cambridgeFacets,
  cambridgeMeta,
  cambridgeQuestionTypes,
  cambridgeScenes,
  cambridgeStats,
  cambridgeTaskFamilies,
  cambridgeTypeFrequencies,
  cambridgeVolumes,
  findCambridgeTest,
  findCambridgeVolume,
  meanReadingEase,
  searchCambridgeTests,
  totalAudioSeconds,
} from '../data/cambridge.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, getNumber, getString, toParams } from '../lib/query.js';
import { parseList } from '../lib/search.js';

import type { HandlerResult, RouteContext, RouteDefinition } from '../lib/route.js';
import type { CambridgeSkill, QuestionTypeId } from '../types.js';

const SORT_KEYS = ['id', 'volume', 'reading-ease', 'audio', 'questions'] as const;
const ORDERS = ['asc', 'desc'] as const;
const FREQUENCY_SKILLS = ['reading', 'listening'] as const;

/** Parse a comma-separated list of Cambridge volume numbers (3-21). */
function parseVolumes(raw: string | undefined): number[] | undefined {
  const tokens = parseList(raw, 'volume');
  if (tokens === undefined) {
    return undefined;
  }
  return tokens.map((token) => {
    const volume = /^\d{1,2}$/.test(token) ? Number.parseInt(token, 10) : Number.NaN;
    if (!Number.isInteger(volume) || volume < 3 || volume > 21) {
      throw badRequest('Parameter "volume" must list Cambridge IELTS volumes between 3 and 21.', {
        parameter: 'volume',
        received: token,
      });
    }
    return volume;
  });
}

/** Index metadata, statistics, the volume table and the facets. */
function index(): HandlerResult {
  return {
    data: { meta: cambridgeMeta(), stats: cambridgeStats(), volumes: cambridgeVolumes() },
    meta: { facets: cambridgeFacets() },
  };
}

/** Statistics only. */
function stats(): HandlerResult {
  return { data: cambridgeStats(), meta: { note: cambridgeMeta().note } };
}

/** The volume table. */
function volumes(): HandlerResult {
  const rows = cambridgeVolumes();
  return {
    data: rows,
    meta: {
      count: rows.length,
      complete: rows.filter((row) => row.complete).length,
      note: 'One row per Cambridge IELTS volume: the tests indexed per skill, completeness, mean passage readability and recovered listening audio.',
    },
  };
}

/** One volume row. */
function volume(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const number = /^\d{1,2}$/.test(id) ? Number.parseInt(id, 10) : Number.NaN;
  const found = Number.isInteger(number) ? findCambridgeVolume(number) : undefined;
  if (found === undefined) {
    throw notFound(`No Cambridge IELTS volume "${id}" in the test-structure index.`, { id });
  }
  const tests = searchCambridgeTests({ volumes: [found.volume], limit: 100, offset: 0 }).items.map(
    (item) => ({
      id: item.id,
      skill: item.skill,
      test: item.test,
      questions: item.questions,
      meanReadingEase: meanReadingEase(item),
      audioSeconds: totalAudioSeconds(item),
    }),
  );
  return { data: { ...found, indexed: tests }, meta: { note: cambridgeMeta().note } };
}

/** Question-type frequencies over the Cambridge tests. */
function questionTypes(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', FREQUENCY_SKILLS);
  const rows = cambridgeTypeFrequencies(skill);
  return {
    data: rows,
    meta: {
      count: rows.length,
      skill: skill ?? 'all',
      questions: rows.reduce((sum, row) => sum + row.questions, 0),
      agreementWithUpstream: cambridgeStats().upstreamTypeAgreement,
      note: 'Canonical types are derived from the upstream question-group kind and instruction wording; compare with /v1/question-types for the practice corpus.',
    },
  };
}

/** Search the index. */
function items(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const query = getString(params, 'q') ?? '';
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const sort = getEnum(params, 'sort', SORT_KEYS);
  const order = getEnum(params, 'order', ORDERS);
  const skills = parseList(getString(params, 'skill'), 'skill', CAMBRIDGE_SKILLS);
  const volumes = parseVolumes(getString(params, 'volume'));
  const test = getInt(params, 'test', 1, 4, -1);
  const types = parseList(getString(params, 'type'), 'type', cambridgeQuestionTypes());
  const scenes = parseList(getString(params, 'scene'), 'scene', cambridgeScenes());
  const difficulty = getEnum(params, 'difficulty', CAMBRIDGE_DIFFICULTIES);
  const task1Family = getEnum(params, 'task1', cambridgeTaskFamilies('task1'));
  const task2Family = getEnum(params, 'task2', cambridgeTaskFamilies('task2'));
  const minReadingEase = getNumber(params, 'minReadingEase', -1000, 1000);
  const maxReadingEase = getNumber(params, 'maxReadingEase', -1000, 1000);

  const page = searchCambridgeTests({
    limit,
    offset,
    query,
    ...(skills === undefined ? {} : { skills: skills as CambridgeSkill[] }),
    ...(volumes === undefined ? {} : { volumes }),
    ...(test < 0 ? {} : { test }),
    ...(types === undefined ? {} : { types: types as QuestionTypeId[] }),
    ...(scenes === undefined ? {} : { scenes }),
    ...(difficulty === undefined ? {} : { difficulty }),
    ...(task1Family === undefined ? {} : { task1Family }),
    ...(task2Family === undefined ? {} : { task2Family }),
    ...(minReadingEase === undefined ? {} : { minReadingEase }),
    ...(maxReadingEase === undefined ? {} : { maxReadingEase }),
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
      facets: cambridgeFacets(),
      note: cambridgeMeta().note,
    },
  };
}

/** One indexed test. */
function item(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findCambridgeTest(id);
  if (found === undefined) {
    throw notFound(`No indexed Cambridge test with id "${id}".`, { id });
  }
  return {
    data: { ...found, meanReadingEase: meanReadingEase(found), audioSeconds: totalAudioSeconds(found) },
    meta: {
      repository: cambridgeMeta().repository,
      license: cambridgeMeta().license,
      note: cambridgeMeta().note,
    },
  };
}

/** Cambridge test-structure routes. */
export const cambridgeRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/cambridge',
    versioned: true,
    summary:
      'Provenance, statistics, the volume table and facets of the Cambridge IELTS 3-21 test-structure index.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/stats',
    versioned: true,
    summary: 'Aggregate statistics only.',
    handler: stats,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/volumes',
    versioned: true,
    summary: 'One row per Cambridge IELTS volume: indexed tests per skill, completeness, readability, audio.',
    handler: volumes,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/volumes/:id',
    versioned: true,
    summary: 'One Cambridge IELTS volume row with its indexed tests.',
    handler: volume,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/question-types',
    versioned: true,
    summary: 'Question-type frequencies over the Cambridge tests, optionally by skill.',
    handler: questionTypes,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/tests',
    versioned: true,
    summary:
      'Search the Cambridge tests by skill, volume, test, question type, scene, difficulty, writing family or readability.',
    handler: items,
  },
  {
    method: 'GET',
    path: '/v1/cambridge/tests/:id',
    versioned: true,
    summary: 'One indexed Cambridge test with its full question-group structure.',
    handler: item,
  },
];
