import { describe, expect, it } from 'vitest';

import {
  blueprintFacets,
  blueprintGroups,
  blueprintMeta,
  blueprintScenes,
  blueprintStats,
  blueprintTests,
  blueprintTypes,
  blueprintVolumes,
  findBlueprintGroup,
  findBlueprintTest,
  groupsOfTest,
  searchBlueprintGroups,
} from '../../src/data/blueprints.js';

const page = (overrides: Partial<Parameters<typeof searchBlueprintGroups>[0]> = {}) =>
  searchBlueprintGroups({ limit: 10, offset: 0, ...overrides });

describe('the blueprint index', () => {
  it('documents its provenance and its limitations', () => {
    const meta = blueprintMeta();
    expect(meta.repository).toBe('https://github.com/wanli4473/yysd-testcenter');
    expect(meta.note).toContain('Annotation metadata only');
    expect(meta.note).toContain('Cambridge University Press');
    expect(meta.sources).toHaveLength(2);
    for (const source of meta.sources) {
      expect(source.sha1).toMatch(/^[0-9a-f]{40}$/);
      expect(source.url).toContain(source.path);
      expect(source.groups).toBeGreaterThan(0);
    }
  });

  it('reports aggregate statistics that agree with the groups', () => {
    const stats = blueprintStats();
    const groups = blueprintGroups();
    expect(stats.annotatedGroups).toBe(groups.length);
    expect(stats.annotatedQuestions).toBe(groups.reduce((total, group) => total + group.questions, 0));
    expect(stats.tests).toBe(blueprintTests().length);
    expect(stats.volumeRange).toEqual([5, 21]);
    expect(stats.volumes).toHaveLength(17);
    expect(stats.ratedRatio).toBeGreaterThan(0.9);
    expect(stats.unratedGroups).toBe(groups.filter((group) => group.difficulty === null).length);
    expect(stats.approximateGroups).toBe(groups.filter((group) => group.approximate).length);
    expect(Object.values(stats.bySkill).reduce((a, b) => a + b, 0)).toBe(groups.length);
    expect(Object.values(stats.byPart).reduce((a, b) => a + b, 0)).toBe(groups.length);
    expect(Object.values(stats.byQuestionType).reduce((a, b) => a + b, 0)).toBe(groups.length);
  });

  it('gives every group a well-formed, unique identifier', () => {
    const groups = blueprintGroups();
    const ids = new Set(groups.map((group) => group.id));
    expect(ids.size).toBe(groups.length);
    for (const group of groups) {
      expect(group.id).toBe(
        `${group.skill}-cam${group.volume}-t${group.test}-q${group.firstQuestion}-${group.lastQuestion}`,
      );
      expect(group.questions).toBe(group.lastQuestion - group.firstQuestion + 1);
      expect(group.firstQuestion).toBeLessThanOrEqual(group.lastQuestion);
      expect(group.volume).toBeGreaterThanOrEqual(5);
      expect(group.volume).toBeLessThanOrEqual(21);
      expect(group.test).toBeGreaterThanOrEqual(1);
      expect(group.test).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the Reading and Listening scene vocabularies apart', () => {
    for (const group of blueprintGroups()) {
      if (group.scene !== null) {
        expect(group.scene.startsWith(`${group.skill}-`)).toBe(true);
      }
    }
    const scenes = blueprintScenes();
    const reading = scenes.filter((scene) => scene.skill === 'reading');
    const listening = scenes.filter((scene) => scene.skill === 'listening');
    expect(reading).toHaveLength(8);
    expect(listening).toHaveLength(16);
    // The two papers each carry a health scene, written differently upstream.
    const health = scenes.filter((scene) => scene.label === 'Health and medicine');
    expect(health).toHaveLength(2);
    expect(new Set(health.map((scene) => scene.sourceLabel)).size).toBe(2);
  });

  it('flags approximate mappings and explains them', () => {
    const types = blueprintTypes();
    const approximate = types.filter((type) => type.approximate);
    expect(approximate.length).toBeGreaterThan(0);
    for (const type of approximate) {
      expect(type.note).not.toBeNull();
    }
    const identification = types.find((type) => type.questionType === 'true-false-not-given');
    expect(identification?.note).toContain('yes/no/not given');
    const completion = types.find((type) => type.questionType === 'sentence-completion');
    expect(completion?.approximate).toBe(true);
  });

  it('publishes annotation gaps rather than hiding them', () => {
    const tests = blueprintTests();
    const incomplete = tests.filter((test) => !test.complete);
    expect(incomplete.length).toBeGreaterThan(0);
    expect(tests.filter((test) => test.complete).length).toBe(blueprintStats().completeTests);
    for (const test of incomplete) {
      const flagged =
        test.missingQuestions.length + test.duplicatedQuestions.length + test.outOfRangeQuestions.length;
      expect(flagged).toBeGreaterThan(0);
    }
    for (const test of tests.filter((test) => test.complete)) {
      expect(test.annotatedQuestions).toBe(40);
      expect(test.missingQuestions).toEqual([]);
      expect(test.duplicatedQuestions).toEqual([]);
    }
  });

  it('summarises every Cambridge volume', () => {
    const volumes = blueprintVolumes();
    expect(volumes).toHaveLength(17);
    for (const volume of volumes) {
      expect(volume.tests).toBe(8);
      expect(volume.completeTests).toBeLessThanOrEqual(volume.tests);
      expect(volume.meanGroupSize).toBeGreaterThan(0);
      expect(Object.keys(volume.questionTypesBySkill).sort()).toEqual(['listening', 'reading']);
    }
  });

  it('exposes the searchable facets', () => {
    expect(blueprintFacets('skill')).toEqual(['listening', 'reading']);
    expect(blueprintFacets('difficulty')).toEqual(['easy', 'hard', 'medium']);
    expect(blueprintFacets('questionType')).toContain('matching-headings');
    expect(blueprintFacets('scene')).toContain('reading-society-humanities');
  });
});

describe('looking a blueprint up', () => {
  it('finds a paper and its groups, case-insensitively', () => {
    const test = findBlueprintTest('READING-CAM16-T2');
    expect(test?.id).toBe('reading-cam16-t2');
    const groups = groupsOfTest('reading-cam16-t2');
    expect(groups.length).toBe(test?.groups);
    // Groups arrive in question order.
    const starts = groups.map((group) => group.firstQuestion);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('finds a single group', () => {
    expect(findBlueprintGroup('listening-cam5-t1-q1-4')?.part).toBe(1);
    expect(findBlueprintGroup('LISTENING-CAM5-T1-Q1-4')?.skill).toBe('listening');
  });

  it('returns undefined for unknown identifiers', () => {
    expect(findBlueprintTest('reading-cam99-t1')).toBeUndefined();
    expect(findBlueprintGroup('nope')).toBeUndefined();
    expect(groupsOfTest('nope')).toEqual([]);
  });
});

describe('searching the question groups', () => {
  it('paginates', () => {
    const first = page({ limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.total).toBe(blueprintStats().annotatedGroups);
    expect(first.hasMore).toBe(true);
    const second = page({ limit: 5, offset: 5 });
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it('filters by skill, type, scene, difficulty, volume and part', () => {
    expect(page({ skills: ['reading'] }).total).toBe(blueprintStats().bySkill['reading']);
    expect(
      page({ questionTypes: ['matching-headings'] }).items.every(
        (group) => group.questionType === 'matching-headings',
      ),
    ).toBe(true);
    expect(
      page({ scenes: ['listening-insurance'] }).items.every((group) => group.scene === 'listening-insurance'),
    ).toBe(true);
    expect(page({ difficulties: ['hard'] }).items.every((group) => group.difficulty === 'hard')).toBe(true);
    expect(page({ volumes: [21] }).items.every((group) => group.volume === 21)).toBe(true);
    expect(page({ part: 4 }).items.every((group) => group.part === 4)).toBe(true);
  });

  it('ignores empty filters', () => {
    const all = page({ limit: 1 }).total;
    expect(page({ limit: 1, skills: [], scenes: [], difficulties: [], volumes: [] }).total).toBe(all);
  });

  it('excludes unannotated groups from scene and difficulty filters', () => {
    const unrated = blueprintGroups().filter((group) => group.difficulty === null);
    expect(unrated.length).toBeGreaterThan(0);
    const ids = new Set(
      page({ limit: 100, difficulties: ['easy', 'medium', 'hard'] }).items.map((group) => group.id),
    );
    for (const group of unrated.slice(0, 5)) {
      expect(ids.has(group.id)).toBe(false);
    }
  });

  it('searches free text over identifiers and labels', () => {
    expect(page({ query: 'Society and humanities' }).total).toBeGreaterThan(0);
    expect(page({ query: 'reading-cam9-t2' }).items.every((g) => g.testId === 'reading-cam9-t2')).toBe(true);
    expect(page({ query: 'zzzz-no-such-thing' }).total).toBe(0);
  });

  it('sorts by every supported key', () => {
    const ids = page({ sort: 'id', limit: 3 }).items.map((group) => group.id);
    expect([...ids].sort()).toEqual(ids);

    const sizes = page({ sort: 'questions', order: 'desc', limit: 3 }).items.map((group) => group.questions);
    expect(sizes[0]).toBeGreaterThanOrEqual(sizes[2] ?? 0);

    const types = page({ sort: 'questionType', limit: 3 }).items.map((group) => group.questionType);
    expect([...types].sort()).toEqual(types);

    // Difficulty sorts easy < medium < hard, with unrated groups last.
    const hardest = page({ sort: 'difficulty', order: 'desc', limit: 1 }).items[0];
    expect(hardest?.difficulty).toBeNull();
    const easiest = page({ sort: 'difficulty', limit: 1 }).items[0];
    expect(easiest?.difficulty).toBe('easy');

    const byVolume = page({ sort: 'volume', limit: 3 }).items;
    expect(byVolume[0]?.volume).toBe(5);
  });
});
