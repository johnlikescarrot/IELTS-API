import { describe, expect, it } from 'vitest';

import {
  findPracticeItem,
  practice,
  practiceFacets,
  practiceItemTypes,
  practiceItems,
  practiceMeta,
  practiceSeries,
  practiceStats,
  searchPractice,
} from '../../src/data/practice.js';

const query = (overrides: Partial<Parameters<typeof searchPractice>[0]> = {}) =>
  searchPractice({ limit: 10, offset: 0, ...overrides });

describe('the practice index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = practiceMeta();
    expect(meta.repository).toBe('https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.note).toContain('not redistributed');
    expect(meta.note).toContain('personal data');
    expect(meta.tool).toBe('scripts/extract_practice.py');
    expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(practice().items).toBe(practiceItems());
  });

  it('reports statistics for the whole upstream corpus', () => {
    const stats = practiceStats();
    expect(stats.items).toBe(1804);
    expect(stats.bySeries).toEqual({
      'listening-102': 102,
      'listening-204': 201,
      'reading-1232': 1232,
      'reading-315': 269,
    });
    expect(stats.bySkill).toEqual({ listening: 303, reading: 1501 });
    expect(stats.questions.total).toBe(15558);
    expect(stats.levels['C1-C2']).toBe(660);
    expect(stats.words.min).toBe(96);
    expect(stats.normalisedTypeLabels).toBe(49);
  });

  it('records the graded reading length gradient per CEFR band', () => {
    const byLevel = practiceStats().wordsByLevel;
    expect(byLevel['A1-A2']!.count).toBe(198);
    expect(byLevel['B1-B2']!.count).toBe(374);
    expect(byLevel['C1-C2']!.count).toBe(660);
    // The corpus is not monotone in length by level: an honest finding.
    expect(byLevel['B1-B2']!.mean).toBeLessThan(byLevel['A1-A2']!.mean);
    expect(byLevel['C1-C2']!.mean).toBeGreaterThan(byLevel['A1-A2']!.mean);
  });

  it('exposes a length histogram in 50-word buckets', () => {
    const histogram = practiceStats().wordsHistogram;
    expect(histogram['250']).toBeGreaterThan(400);
    const total = Object.values(histogram).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(practiceStats().words.count);
  });

  it('keeps the series with their coverage and availability facts', () => {
    const series = practiceSeries();
    expect(series).toHaveLength(4);
    const [l102, l204, r1232, r315] = series;
    expect(l102!.name).toContain('Listening 102');
    expect(l102!.published).toBe(102);
    expect(l102!.gaps).toEqual([]);
    expect(l102!.meanQuestions).toBeNull();
    expect(l204!.gaps).toEqual([3, 34, 51]);
    expect(l204!.withAudio).toBe(198);
    expect(r1232!.meanWords).toBeCloseTo(263.65, 2);
    expect(r315!.published).toBe(269);
    expect(r315!.gaps).toHaveLength(42);
    expect(r315!.withProcessed).toBe(108);
    for (const row of series) {
      expect(row.description.length).toBeGreaterThan(10);
      expect(row.home).toContain('ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS');
    }
  });

  it('indexes every item with its upstream file', () => {
    for (const item of practiceItems()) {
      expect(
        item.sourceUrl.startsWith('https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/main/'),
      ).toBe(true);
      expect(item.upstreamPath.length).toBeGreaterThan(0);
    }
    const lesson = practiceItems().find((item) => item.id === 'reading_a1_a2_001');
    expect(lesson).toBeDefined();
    expect(lesson!.series).toBe('reading-1232');
    expect(lesson!.words).toBe(321);
    expect(lesson!.types).toEqual(['multiple_choice', 'sentence_completion', 'true_false_not_given']);
    expect(lesson!.flags).toEqual({ audio: false, processed: false, strategies: false });
    const audio = practiceItems().find((item) => item.id === 'listening-102-advanced-1');
    expect(audio!.flags.audio).toBe(true);
    expect(audio!.questions).toBeNull();
  });

  it('joins the curated item-type taxonomy with occurrence data', () => {
    const taxonomy = practiceItemTypes();
    expect(taxonomy).toHaveLength(14);
    const ids = new Set(taxonomy.map((entry) => entry.id));
    expect(ids.size).toBe(taxonomy.length);
    expect(ids).toEqual(new Set(Object.keys(practice().itemTypeFacts)));
    const mc = taxonomy.find((entry) => entry.id === 'multiple-choice')!;
    expect(mc.occurrences).toBe(4116);
    expect(mc.aliases).toContain('multiple_choice');
    expect(mc.skills).toContain('listening');
    for (const entry of taxonomy) {
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.aliases.length).toBeGreaterThan(0);
    }
  });
});

describe('practiceFacets', () => {
  it('lists the facet values in order', () => {
    expect(practiceFacets('series')).toEqual([
      'listening-102',
      'listening-204',
      'reading-1232',
      'reading-315',
    ]);
    expect(practiceFacets('level')).toEqual(['A1-A2', 'Advanced', 'B1-B2', 'Basic', 'C1-C2', 'Intermediate']);
    const types = practiceFacets('type');
    expect(types.length).toBe(49);
    expect(types).toContain('multiple_choice');
    expect(types).toContain('true_false_not_given');
  });
});

describe('searchPractice', () => {
  it('paginates the unfiltered index in stable order', () => {
    const page = query();
    expect(page.total).toBe(1804);
    expect(page.items[0]!.id).toBe('listening-102-advanced-1');
    expect(page.hasMore).toBe(true);
  });

  it('returns nothing past the end', () => {
    const page = searchPractice({ limit: 10, offset: 2000 });
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it('matches free text over identifier, path and level', () => {
    expect(query({ query: 'advanced' }).total).toBeGreaterThan(0);
    expect(query({ query: 'lesson_001.json' }).total).toBeGreaterThan(0);
    expect(query({ query: 'does-not-exist' }).total).toBe(0);
  });

  it('filters by series, level, type, skill and kind', () => {
    expect(query({ series: ['reading-1232'] }).total).toBe(1232);
    expect(query({ levels: ['A1-A2'] }).total).toBe(198);
    expect(query({ types: ['matching_headings'] }).total).toBeGreaterThan(0);
    expect(query({ skill: 'listening' }).total).toBe(303);
    expect(query({ kind: 'full-test' }).total).toBe(470);
    // An empty filter list disables the filter rather than excluding all rows.
    expect(query({ series: [] }).total).toBe(1804);
  });

  it('combines filters', () => {
    const page = query({ series: ['reading-1232'], levels: ['C1-C2'], types: ['multiple_choice'], limit: 1 });
    expect(page.total).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(item.level).toBe('C1-C2');
      expect(item.types).toContain('multiple_choice');
    }
  });

  it('sorts by every supported key', () => {
    expect(query({ sort: 'id', order: 'desc' }).items[0]!.id).toBe('reading_c1_c2_660');
    const bySeries = query({ sort: 'series', limit: 1804 });
    expect(bySeries.items[0]!.series).toBe('listening-102');
    expect(bySeries.items.at(-1)!.series).toBe('reading-315');
    expect(query({ sort: 'level', limit: 1 }).items[0]!.level).toBeNull();
    expect(query({ sort: 'number', order: 'desc', limit: 1 }).items[0]!.number).toBe(660);
    expect(query({ sort: 'questions', order: 'desc', limit: 1 }).items[0]!.questions).toBeGreaterThanOrEqual(
      40,
    );
    expect(query({ sort: 'words', order: 'desc', limit: 1 }).items[0]!.words).toBeGreaterThanOrEqual(3765);
    expect(query({ sort: 'words', limit: 1 }).items[0]!.words ?? 0).toBe(0);
  });
});

describe('findPracticeItem', () => {
  it('finds an item case-insensitively by its stable id', () => {
    expect(findPracticeItem('READING_a1_a2_001')!.series).toBe('reading-1232');
    expect(findPracticeItem('listening-204-test-1')!.kind).toBe('full-test');
  });

  it('returns undefined for unknown identifiers', () => {
    expect(findPracticeItem('nope')).toBeUndefined();
  });
});
