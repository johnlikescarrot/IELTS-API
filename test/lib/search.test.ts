import { describe, expect, it } from 'vitest';

import {
  matchesAny,
  matchesFilter,
  matchesQuery,
  paginate,
  parseList,
  sortBy,
} from '../../src/lib/search.js';
import { HttpError } from '../../src/lib/errors.js';

describe('matchesQuery', () => {
  it('matches case-insensitively across fields', () => {
    expect(matchesQuery(['Environment', 'the natural world'], 'environment')).toBe(true);
    expect(matchesQuery(['Environment'], 'ENV')).toBe(true);
    expect(matchesQuery(['Environment'], 'missing')).toBe(false);
  });

  it('ignores null, undefined and non-string fields', () => {
    expect(matchesQuery([null, undefined, 42], '42')).toBe(true);
    expect(matchesQuery([null, undefined], 'anything')).toBe(false);
  });
});

describe('matchesFilter', () => {
  it('accepts everything when the filter is disabled', () => {
    expect(matchesFilter('noun', undefined)).toBe(true);
    expect(matchesFilter('noun', [])).toBe(true);
  });

  it('filters by membership', () => {
    expect(matchesFilter('noun', ['noun', 'verb'])).toBe(true);
    expect(matchesFilter('adverb', ['noun', 'verb'])).toBe(false);
  });
});

describe('matchesAny', () => {
  it('accepts everything when the filter is disabled', () => {
    expect(matchesAny(['noun'], undefined)).toBe(true);
    expect(matchesAny(['noun'], [])).toBe(true);
  });

  it('matches when at least one value is allowed', () => {
    expect(matchesAny(['noun', 'verb'], ['verb'])).toBe(true);
    expect(matchesAny(['noun', 'verb'], ['adjective'])).toBe(false);
  });
});

describe('parseList', () => {
  it('returns undefined when absent or empty', () => {
    expect(parseList(undefined, 'pos')).toBeUndefined();
    expect(parseList(' , ', 'pos')).toBeUndefined();
  });

  it('splits and lower-cases tokens', () => {
    expect(parseList('Noun, Verb', 'pos')).toEqual(['noun', 'verb']);
  });

  it('validates tokens against an allow-list', () => {
    expect(parseList('noun', 'pos', ['noun', 'verb'])).toEqual(['noun']);
    expect(() => parseList('noun,nope', 'pos', ['noun', 'verb'])).toThrow(HttpError);
    expect(() => parseList('noun,nope', 'pos', ['noun', 'verb'])).toThrow(/Unknown value/);
  });

  it('canonicalises mixed-case allow-list values case-insensitively', () => {
    expect(parseList('b1-b2', 'level', ['A1-A2', 'B1-B2', 'C1-C2'])).toEqual(['B1-B2']);
    expect(parseList('C1-C2', 'level', ['A1-A2', 'B1-B2', 'C1-C2'])).toEqual(['C1-C2']);
    expect(() => parseList('z9', 'level', ['A1-A2', 'B1-B2', 'C1-C2'])).toThrow(HttpError);
  });
});

describe('paginate', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('slices and reports the remainder', () => {
    const page = paginate(items, 3, 0);
    expect(page.items).toEqual(['a', 'b', 'c']);
    expect(page.total).toBe(4);
    expect(page.hasMore).toBe(true);
    expect(page.limit).toBe(3);
    expect(page.offset).toBe(0);
  });

  it('reports the last page', () => {
    const page = paginate(items, 3, 3);
    expect(page.items).toEqual(['d']);
    expect(page.hasMore).toBe(false);
  });

  it('returns an empty page past the end', () => {
    expect(paginate(items, 3, 99).items).toEqual([]);
  });
});

describe('sortBy', () => {
  const items = [
    { name: 'beta', size: 2 },
    { name: 'alpha', size: 3 },
    { name: 'alpha', size: 1 },
  ];

  it('sorts ascending', () => {
    expect(sortBy(items, (item) => item.name, 'asc').map((item) => item.size)).toEqual([3, 1, 2]);
  });

  it('sorts descending', () => {
    expect(sortBy(items, (item) => item.name, 'desc').map((item) => item.size)).toEqual([2, 3, 1]);
  });

  it('leaves equal keys in their original order', () => {
    expect(sortBy([{ k: 1 }, { k: 1 }], (item) => item.k, 'asc')).toEqual([{ k: 1 }, { k: 1 }]);
  });
});
