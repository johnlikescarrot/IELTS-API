import { describe, expect, it } from 'vitest';

import { isRawResult, matchRoute, splitPath } from '../../src/lib/route.js';

import type { RouteDefinition } from '../../src/lib/route.js';

const route = (path: string): RouteDefinition => ({
  method: 'GET',
  path,
  versioned: true,
  summary: `summary for ${path}`,
  handler: () => ({ data: null }),
});

describe('splitPath', () => {
  it('drops empty segments', () => {
    expect(splitPath('/v1/vocabulary/')).toEqual(['v1', 'vocabulary']);
    expect(splitPath('/')).toEqual([]);
  });
});

describe('matchRoute', () => {
  const routes = [route('/v1/vocabulary/stats'), route('/v1/vocabulary/:word'), route('/v1/bands')];

  it('matches literal paths', () => {
    const match = matchRoute(routes, ['v1', 'bands']);
    expect(match?.route.path).toBe('/v1/bands');
    expect(match?.params).toEqual({});
  });

  it('captures path parameters', () => {
    const match = matchRoute(routes, ['v1', 'vocabulary', 'atmosphere']);
    expect(match?.route.path).toBe('/v1/vocabulary/:word');
    expect(match?.params.word).toBe('atmosphere');
  });

  it('decodes escaped path parameters', () => {
    const match = matchRoute(routes, ['v1', 'vocabulary', 'carbon%20dioxide']);
    expect(match?.params.word).toBe('carbon dioxide');
  });

  it('prefers literal routes registered first', () => {
    const match = matchRoute(routes, ['v1', 'vocabulary', 'stats']);
    expect(match?.route.path).toBe('/v1/vocabulary/stats');
  });

  it('rejects paths of a different length', () => {
    expect(matchRoute(routes, ['v1'])).toBeUndefined();
    expect(matchRoute(routes, ['v1', 'bands', 'extra'])).toBeUndefined();
  });

  it('rejects paths with a mismatched literal segment', () => {
    expect(matchRoute(routes, ['v2', 'bands'])).toBeUndefined();
  });

  it('returns undefined for an empty route table', () => {
    expect(matchRoute([], ['v1'])).toBeUndefined();
  });
});

describe('isRawResult', () => {
  it('distinguishes raw results from JSON results', () => {
    expect(isRawResult({ data: null })).toBe(false);
    expect(isRawResult({ raw: { contentType: 'text/html', body: '' } })).toBe(true);
  });
});
