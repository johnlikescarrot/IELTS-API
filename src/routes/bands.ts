/**
 * Band scale and descriptor routes (`/v1/bands`).
 */

import {
  BAND_SCALE,
  BAND_DESCRIPTORS,
  CRITERIA_BY_SET,
  bandScaleEntry,
  findDescriptors,
} from '../data/bands.js';
import { badRequest, notFound } from '../lib/errors.js';
import { getEnum, getInt, toParams } from '../lib/query.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';
import type { CriteriaSet, Criterion } from '../types.js';

const SETS = Object.keys(CRITERIA_BY_SET) as CriteriaSet[];
const CRITERIA = Object.values(CRITERIA_BY_SET).flat() as Criterion[];

/** List the whole band scale. */
function scale(): HandlerResult {
  return {
    data: BAND_SCALE,
    meta: { count: BAND_SCALE.length, min: 0, max: 9, step: 0.5 },
  };
}

/** Analytic descriptors, filterable by set, criterion and band. */
function descriptors(context: RouteContext): HandlerResult {
  const params = toParams(context.url);
  const set = getEnum(params, 'set', SETS) ?? 'speaking';
  const criterion = getEnum(params, 'criterion', [...new Set(CRITERIA)]);
  const band = getInt(params, 'band', 0, 9, -1);
  const rows = findDescriptors(set, criterion, band < 0 ? undefined : band);
  return {
    data: rows,
    meta: { count: rows.length, set, criterion: criterion ?? null, band: band < 0 ? null : band },
  };
}

/** One band level, with the descriptors that bracket it. */
function bandDetail(context: RouteContext): HandlerResult {
  const raw = context.params.band as string;
  if (!/^\d(\.\d)?$/.test(raw)) {
    throw badRequest('Band must be a number between 0 and 9, optionally ending in .5.', { received: raw });
  }
  const band = Number.parseFloat(raw);
  const entry = bandScaleEntry(band);
  if (entry === undefined) {
    throw notFound(`No band scale entry for ${raw}.`, { band: raw });
  }
  const whole = Number.isInteger(band);
  const lower = Math.floor(band);
  const upper = Math.min(9, Math.ceil(band));
  const bracket = [...new Set([lower, upper])];
  return {
    data: {
      ...entry,
      descriptors: whole ? BAND_DESCRIPTORS.filter((row) => row.band === band) : [],
      bracketDescriptors: whole ? [] : BAND_DESCRIPTORS.filter((row) => bracket.includes(row.band)),
    },
    meta: {
      band,
      bracket,
      note: 'Descriptors are published for whole bands; half bands sit between two profiles.',
    },
  };
}

/** Band routes. */
export const bandRoutes: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/v1/bands',
    versioned: true,
    summary: 'The IELTS band scale with indicative CEFR levels.',
    handler: scale,
  },
  {
    method: 'GET',
    path: '/v1/bands/descriptors',
    versioned: true,
    summary: 'Condensed analytic band descriptors, filterable by set, criterion and band.',
    handler: descriptors,
  },
  {
    method: 'GET',
    path: '/v1/bands/:band',
    versioned: true,
    summary: 'One band level with the descriptors that bracket it.',
    handler: bandDetail,
  },
];
