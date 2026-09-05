import { describe, expect, it } from 'vitest';

import {
  firstSnippet,
  MAX_SNIPPET_LENGTH,
  runSearch,
  scoreFields,
  SEARCH_ADAPTERS,
  SEARCH_DATASET_IDS,
  snippetOf,
} from '../../src/lib/globalSearch.js';

describe('scoreFields', () => {
  it('ranks exact, prefix, substring and secondary matches in that order', () => {
    expect(scoreFields('essay', [], 'essay')).toBe(4);
    expect(scoreFields('essayist', [], 'essay')).toBe(3);
    expect(scoreFields('photo essay', [], 'essay')).toBe(2);
    expect(scoreFields('attempt', ['write an essay'], 'essay')).toBe(1);
    expect(scoreFields('novel', ['a short story'], 'essay')).toBe(0);
  });

  it('is case-insensitive on the item fields (queries are pre-normalised)', () => {
    expect(scoreFields('Essay', [], 'essay')).toBe(4);
    expect(scoreFields('Attempt', ['Write an ESSAY'], 'essay')).toBe(1);
  });

  it('skips missing secondary fields', () => {
    expect(scoreFields('attempt', [null, 'write an essay', undefined], 'essay')).toBe(1);
    expect(scoreFields('novel', [null, undefined], 'essay')).toBe(0);
  });
});

describe('firstSnippet', () => {
  it('returns the snippet of the first usable value', () => {
    expect(firstSnippet([null, undefined, '  ', 'an  analytic\ncomposition'])).toBe(
      'an analytic composition',
    );
  });

  it('returns null when every value is missing or empty', () => {
    expect(firstSnippet([null, undefined, '   ', ''])).toBeNull();
  });
});

describe('snippetOf', () => {
  it('returns null for empty input', () => {
    expect(snippetOf(null)).toBeNull();
    expect(snippetOf(undefined)).toBeNull();
    expect(snippetOf('   ')).toBeNull();
  });

  it('flattens whitespace to a single line', () => {
    expect(snippetOf('one\n\ntwo   three')).toBe('one two three');
  });

  it('clips long text with an ellipsis', () => {
    const clipped = snippetOf('x'.repeat(500));
    expect(clipped).not.toBeNull();
    expect(clipped?.length).toBeLessThanOrEqual(MAX_SNIPPET_LENGTH);
    expect(clipped?.endsWith('…')).toBe(true);
  });
});

describe('SEARCH_ADAPTERS', () => {
  it('registers every stated dataset in declaration order', () => {
    expect(SEARCH_DATASET_IDS).toEqual([
      'vocabulary',
      'writing-topics',
      'speaking-topics',
      'task-types',
      'question-types',
      'frameworks',
      'themes',
      'resources',
      'corpus',
      'materials',
      'tests',
    ]);
  });

  it('labels every dataset and points it at its browse endpoint', () => {
    for (const adapter of SEARCH_ADAPTERS) {
      expect(adapter.label.length).toBeGreaterThan(0);
      expect(adapter.endpoint).toMatch(/^\/v1\//);
    }
  });
});

describe('runSearch', () => {
  it('finds an exact vocabulary match and ranks it first', () => {
    const report = runSearch('essay', undefined, 5);
    const vocabulary = report.datasets.vocabulary;
    expect(vocabulary).toBeDefined();
    expect(vocabulary && vocabulary.total).toBeGreaterThan(0);
    const top = vocabulary?.items[0];
    expect(top?.title).toBe('essay');
    expect(top?.score).toBe(4);
    expect(top?.field).toBe('primary');
    expect(top?.url).toBe('/v1/vocabulary/essay');
    expect(top?.snippet).toContain('analytic');
  });

  it('finds the canonical question type and links to its endpoint', () => {
    const report = runSearch('multiple choice', ['question-types'], 5);
    const top = report.datasets['question-types']?.items[0];
    expect(top?.ref).toBe('multiple-choice');
    expect(top?.url).toBe('/v1/question-types/multiple-choice');
    expect(top?.score).toBe(4);
  });

  it('matches secondary fields and marks them as such', () => {
    const report = runSearch('tuition', ['themes'], 5);
    const top = report.datasets.themes?.items[0];
    expect(top?.field).toBe('secondary');
    expect(top?.score).toBe(1);
    expect(top?.url).toBe('/v1/topics/themes');
  });

  it('orders ties by stable identifier', () => {
    const report = runSearch('ielts reading practice', ['tests'], 3);
    const items = report.datasets.tests?.items ?? [];
    expect(items.length).toBe(3);
    expect(items[0]?.ref).toBe('rft-001');
    expect(items[0]?.url).toBe('/v1/tests/rft-001');
    expect(report.datasets.tests?.total).toBeGreaterThan(3);
  });

  it('restricts the search to the requested datasets', () => {
    const report = runSearch('essay', ['vocabulary'], 5);
    expect(Object.keys(report.datasets)).toEqual(['vocabulary']);
  });

  it('counts matches across every dataset', () => {
    const report = runSearch('education', undefined, 5);
    expect(report.matches).toBeGreaterThan(0);
    const summed = Object.values(report.datasets).reduce((total, dataset) => total + dataset.total, 0);
    expect(report.matches).toBe(summed);
  });

  it('is deterministic', () => {
    expect(runSearch('graph', undefined, 5)).toEqual(runSearch('graph', undefined, 5));
  });

  it('reports zero matches for unknown queries', () => {
    const report = runSearch('zzzzzz', undefined, 5);
    expect(report.matches).toBe(0);
    for (const dataset of Object.values(report.datasets)) {
      expect(dataset.items).toEqual([]);
    }
  });
});
