/**
 * Mock-exam session routes (`/v1/mock`).
 *
 * A research-grade re-implementation of the YYSD IELTS online mock-exam test
 * center's exam model (`wanli4473/yysd-testcenter`): indicative raw-to-band
 * conversions with partial-paper scaling, deterministic answer grading from
 * caller-supplied keys, computer-delivered timing blueprints for practice and
 * exam modes, and a catalogue of stable full-suite mocks assembled from the
 * practice-test index and the writing task banks. No upstream passage,
 * question, answer key or recording is served: keys travel in the request,
 * papers are referenced by their index identifiers.
 */

import {
  LISTENING_SUITE_MINUTES,
  MOCK_CONTROLS,
  MOCK_MODES,
  MOCK_SESSION_SKILLS,
  MOCK_SKILLS,
  MOCK_SUITE_COUNT,
  RAW_BAND_TABLES,
  READING_SUITE_MINUTES,
  WRITING_SUITE_MINUTES,
} from '../data/mock.js';
import { badRequest, notFound } from '../lib/errors.js';
import {
  buildMockSuite,
  buildSessionPlan,
  findMockSuite,
  gradeResponses,
  mockSuites,
  rawToBand,
} from '../lib/mock.js';
import { getEnum, getInt, getString, requireString, toParams } from '../lib/query.js';
import { paginate } from '../lib/search.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { MockSkill } from '../types.js';

/** Catalogue metadata, table provenance and the timing constants. */
function index(): HandlerResult {
  return {
    data: {
      skills: [...MOCK_SKILLS],
      sessionSkills: [...MOCK_SESSION_SKILLS],
      modes: [...MOCK_MODES],
      tables: MOCK_SKILLS.map((skill) => ({
        skill,
        name: RAW_BAND_TABLES[skill].name,
        rows: RAW_BAND_TABLES[skill].rows.length,
        source: RAW_BAND_TABLES[skill].source,
        provenance: RAW_BAND_TABLES[skill].provenance,
      })),
      suites: {
        count: MOCK_SUITE_COUNT,
        totalMinutes: LISTENING_SUITE_MINUTES + READING_SUITE_MINUTES + WRITING_SUITE_MINUTES,
        timing: {
          listening: LISTENING_SUITE_MINUTES,
          reading: READING_SUITE_MINUTES,
          writing: WRITING_SUITE_MINUTES,
        },
        example: buildMockSuite(1).id,
      },
      controls: [...MOCK_CONTROLS],
    },
    meta: {
      note: 'Raw-to-band conversions are indicative: live versions are equated, so cut scores move by about one raw mark between volumes.',
      relatedWork:
        'Operational model informed by the YYSD IELTS online mock-exam test center (wanli4473/yysd-testcenter): threshold-table band lookup with scaling of partial papers, practice vs exam sittings, and full L→R→W suites.',
    },
  };
}

/** Convert a raw mark to its indicative band. */
function rawBand(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', MOCK_SKILLS);
  if (skill === undefined) {
    throw badRequest('Parameter "skill" is required.', {
      parameter: 'skill',
      allowed: MOCK_SKILLS.join(','),
    });
  }
  const raw = getInt(params, 'raw', 0, 40, -1);
  if (raw < 0) {
    throw badRequest('Parameter "raw" is required.', { parameter: 'raw' });
  }
  const total = getInt(params, 'total', 1, 40, 40);
  const result = rawToBand(skill as MockSkill, raw, total);
  const table = RAW_BAND_TABLES[skill as MockSkill];
  return {
    data: result,
    meta: { table: table.name, source: table.source, note: table.note },
  };
}

/** Grade a response sheet against a caller-supplied answer key. */
function grade(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', MOCK_SKILLS);
  if (skill === undefined) {
    throw badRequest('Parameter "skill" is required.', {
      parameter: 'skill',
      allowed: MOCK_SKILLS.join(','),
    });
  }
  const key = requireString(params, 'key');
  const responses = getString(params, 'responses') ?? '';
  return {
    data: gradeResponses(skill as MockSkill, key, responses),
    meta: {
      method:
        'Answers are NFC-normalised, lower-cased and stripped of decorative punctuation, then matched exactly against the key alternatives; no stemming or fuzzy matching is applied.',
      keyFormat:
        'Semicolon-separated "<number>:<answer>" entries; alternatives in one entry are "|" separated.',
      disclaimer: 'The band is indicative (see /v1/mock/raw-to-band); writing is never auto-scored.',
    },
  };
}

/** Build the timing blueprint of a computer-delivered sitting. */
function sessionPlan(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const skill = getEnum(params, 'skill', MOCK_SESSION_SKILLS);
  if (skill === undefined) {
    throw badRequest('Parameter "skill" is required.', {
      parameter: 'skill',
      allowed: MOCK_SESSION_SKILLS.join(','),
    });
  }
  const mode = getEnum(params, 'mode', MOCK_MODES) ?? 'practice';
  return {
    data: buildSessionPlan(skill, mode),
    meta: {
      delivery: 'Timing assumes computer delivery (2-minute listening review; no answer-transfer window).',
    },
  };
}

/** Paginated catalogue of stable full-suite mocks. */
function suites(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const limit = getInt(params, 'limit', 1, 100, 20);
  const offset = getInt(params, 'offset', 0, 10000, 0);
  const page = paginate(mockSuites(), limit, offset);
  return {
    data: page.items,
    meta: {
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      note: 'Suites reference practice-test items and writing prompts by identifier; no upstream content is embedded.',
    },
  };
}

/** One stable full-suite mock. */
function suite(context: RouteContext): HandlerResult {
  const id = context.params['id'] as string;
  const found = findMockSuite(id);
  if (found === undefined) {
    throw notFound(`No mock suite with id "${id}".`, { id });
  }
  return {
    data: found,
    meta: {
      scoring:
        'Grade the receptive papers with /v1/mock/grade and map the raw marks with /v1/mock/raw-to-band; assess writing against /v1/bands/descriptors.',
    },
  };
}

/** Mock-exam session routes. */
export const mockRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/mock',
    versioned: true,
    summary: 'Mock-exam catalogue metadata, conversion-table provenance and timing constants.',
    handler: index,
  },
  {
    method: 'GET',
    path: '/v1/mock/raw-to-band',
    versioned: true,
    summary: 'Map a Listening/Reading raw mark to its indicative band (partial papers scale to /40).',
    handler: rawBand,
  },
  {
    method: 'GET',
    path: '/v1/mock/grade',
    versioned: true,
    summary: 'Grade a response sheet against a caller-supplied answer key with an indicative band.',
    handler: grade,
  },
  {
    method: 'GET',
    path: '/v1/mock/session-plan',
    versioned: true,
    summary: 'Computer-delivered timing blueprint for a paper or full suite, in practice or exam mode.',
    handler: sessionPlan,
  },
  {
    method: 'GET',
    path: '/v1/mock/suites',
    versioned: true,
    summary: 'Stable full-suite mocks assembled from the practice-test index and the writing banks.',
    handler: suites,
  },
  {
    method: 'GET',
    path: '/v1/mock/suites/:id',
    versioned: true,
    summary: 'One stable full-suite mock (mock-001 … mock-024).',
    handler: suite,
  },
];
