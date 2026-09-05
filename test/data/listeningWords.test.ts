import { describe, expect, it } from 'vitest';

import {
  PARAPHRASE_PARTS_OF_SPEECH,
  discourseClasses,
  findDiscourseClass,
  findParaphraseGroup,
  findParaphraseGroups,
  findScenario,
  findScenarios,
  listeningWordsMeta,
  paraphraseGroupsPage,
  paraphraseMechanisms,
  paraphraseStats,
  scenarioCategories,
  scenarioIds,
  scenarioStats,
} from '../../src/data/listeningWords.js';

import type { ListeningScenario } from '../../src/types.js';

describe('paraphrase dataset', () => {
  it('exposes the three part-of-speech sections', () => {
    expect(PARAPHRASE_PARTS_OF_SPEECH).toEqual(['verb', 'adj/adv', 'noun']);
  });

  it('carves the source sheet into fully glossed groups', () => {
    const stats = paraphraseStats();
    expect(stats.groups).toBe(79);
    expect(stats.terms).toBeGreaterThan(400);
    expect(stats.byPos).toEqual({ verb: 30, 'adj/adv': 30, noun: 19 });
    expect(listeningWordsMeta().glossCoverage).toEqual({ groups: 79, glossed: 79 });
  });

  it('keeps group identifiers unique and aligned with the source numbering', () => {
    const groups = findParaphraseGroups({});
    const ids = new Set(groups.map((group) => group.id));
    expect(ids.size).toBe(groups.length);
    for (const group of groups) {
      expect(group.id).toBe(`${group.pos}-${String(group.sourceNumber).padStart(2, '0')}`);
      expect(group.terms.length).toBeGreaterThan(0);
      expect(group.sense.length).toBeGreaterThan(0);
    }
  });

  it('records the source numbering gap among the verb groups', () => {
    // the verb numbering jumps from 29 straight to 39 in the source sheet
    expect(listeningWordsMeta().sourceIrregularities.verbNumberSequenceGaps).toEqual([39]);
  });

  it('filters by part of speech and by free text across terms', () => {
    const verbs = findParaphraseGroups({ pos: 'verb' });
    expect(verbs.every((group) => group.pos === 'verb')).toBe(true);
    expect(findParaphraseGroups({ pos: 'noun' })).toHaveLength(19);

    const booked = findParaphraseGroups({ query: 'reservation' });
    expect(booked.map((group) => group.id)).toContain('verb-01');

    const chinese = findParaphraseGroups({ query: '预定' });
    expect(chinese.map((group) => group.id)).toContain('verb-01');

    expect(findParaphraseGroups({ query: 'no such term xyzzy' })).toHaveLength(0);
  });

  it('paginates and sorts the groups', () => {
    const page = paraphraseGroupsPage({ limit: 5, offset: 0 });
    expect(page.items).toHaveLength(5);
    expect(page.total).toBe(79);
    expect(page.hasMore).toBe(true);

    const byTerms = paraphraseGroupsPage({ sort: 'terms', order: 'desc', limit: 3, offset: 0 });
    const sizes = byTerms.items.map((group) => group.terms.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(byTerms.items[0]?.terms.length).toBeGreaterThanOrEqual(10);

    const descending = paraphraseGroupsPage({ sort: 'id', order: 'desc', limit: 2, offset: 77 });
    expect(descending.items.map((group) => group.id)).toEqual(['adj/adv-02', 'adj/adv-01']);
    expect(descending.hasMore).toBe(false);
  });

  it('types every gloss as a plain string (the extractor enforces coverage)', () => {
    for (const group of findParaphraseGroups({})) {
      expect(typeof group.gloss).toBe('string');
    }
  });

  it('finds single groups and misses unknown identifiers', () => {
    const group = findParaphraseGroup('verb-01');
    expect(group?.gloss).toBe('to book; to reserve');
    expect(group?.terms).toContain('book');
    expect(findParaphraseGroup('does-not-exist')).toBeUndefined();
  });

  it('exposes the five paraphrase mechanisms', () => {
    const mechanisms = paraphraseMechanisms();
    expect(mechanisms.map((mechanism) => mechanism.id)).toEqual([
      'word-family',
      'cross-pos',
      'polarity',
      'hyponymy',
      'abstract-concrete',
    ]);
    for (const mechanism of mechanisms) {
      expect(mechanism.description.length).toBeGreaterThan(40);
      expect(mechanism.example.length).toBeGreaterThan(3);
    }
  });
});

describe('scenario dataset', () => {
  it('indexes twelve scenarios with stable identifiers', () => {
    expect(scenarioIds()).toEqual([
      'personal-details',
      'housing',
      'vehicles',
      'banking',
      'tourism',
      'transport',
      'places',
      'employment',
      'membership-sports-medical',
      'map-tasks',
      'course-assignment',
      'academic-lecture',
    ]);
    expect(scenarioStats().scenarioTerms).toBeGreaterThan(700);
  });

  it('every scenario carries non-empty categories and terms', () => {
    for (const scenario of findScenarios()) {
      expect(scenario.categories.length).toBeGreaterThan(0);
      for (const category of scenario.categories) {
        expect(category.nameZh.length).toBeGreaterThan(0);
        expect(category.name.length).toBeGreaterThan(0);
      }
      const withTerms = scenario.categories.filter((category) => category.terms.length > 0);
      expect(withTerms.length).toBeGreaterThan(0);
    }
  });

  it('maps scenarios onto the listening sections they typically occur in', () => {
    const sectionOne = findScenarios({ section: 1 });
    expect(sectionOne.map((scenario) => scenario.id)).toContain('personal-details');
    expect(sectionOne.every((scenario) => scenario.typicalSections.includes(1))).toBe(true);
    expect(findScenarios({ section: 4 }).map((scenario) => scenario.id)).toEqual(['academic-lecture']);
  });

  it('searches scenario names and terms', () => {
    const hits = findScenarios({ query: 'rent' });
    expect(hits.map((scenario) => scenario.id)).toContain('housing');
    const chinese = findScenarios({ query: '银行' });
    expect(chinese.map((scenario) => scenario.id)).toContain('banking');
    expect(findScenarios({ query: 'xyzzy-nothing' })).toHaveLength(0);
  });

  it('filters the categories of one scenario by free text', () => {
    const housing = findScenario('housing');
    expect(housing).toBeDefined();
    const scenario = housing as ListeningScenario;
    expect(scenarioCategories(scenario)).toHaveLength(scenario.categories.length);
    const rent = scenarioCategories(scenario, 'payment');
    expect(rent.map((category) => category.name)).toContain('rent and payment');
    expect(scenarioCategories(scenario, 'xyzzy-nothing')).toHaveLength(0);
  });

  it('finds single scenarios and misses unknown identifiers', () => {
    expect(findScenario('banking')?.name).toBe('Banking');
    expect(findScenario('nope')).toBeUndefined();
  });
});

describe('discourse markers dataset', () => {
  it('indexes the eight discourse-relation classes', () => {
    const classes = discourseClasses();
    expect(classes.map((entry) => entry.id)).toEqual([
      'adversative',
      'concessive',
      'causal',
      'additive',
      'sequential',
      'enumerative',
      'explanatory',
      'conclusive',
    ]);
    expect(classes.reduce((sum, entry) => sum + entry.markers.length, 0)).toBe(54);
    for (const entry of classes) {
      expect(entry.markers.length).toBeGreaterThan(0);
      expect(entry.nameZh.length).toBeGreaterThan(0);
      expect(entry.pattern.length).toBeGreaterThan(0);
    }
  });

  it('keeps the joined wrapped marker intact and preserves source quirks', () => {
    const adversative = findDiscourseClass('adversative');
    expect(adversative?.markers).toContain('by contrast');
    expect(adversative?.markers).toContain('despite on');
  });

  it('finds single classes and misses unknown identifiers', () => {
    expect(findDiscourseClass('causal')?.pattern).toBe('A because B');
    expect(findDiscourseClass('nope')).toBeUndefined();
  });
});
