import { describe, expect, it } from 'vitest';

import {
  PRACTICE_COLLECTIONS,
  PRACTICE_LEVELS,
  PRACTICE_META,
  PRACTICE_SKILLS,
  PRACTICE_STRATEGIES,
  PRACTICE_UNITS,
  STUDY_FRAMEWORK_STEPS,
  findPracticeStrategy,
  findPracticeUnit,
  getStrategiesBySkill,
  practiceStats,
  randomPracticeUnits,
  searchPracticeUnits,
} from '../../src/data/practice.js';

describe('practice dataset', () => {
  it('builds exactly 1,852 practice units with correct structure and collections', () => {
    expect(PRACTICE_UNITS).toHaveLength(1852);

    const readingBasic = PRACTICE_UNITS.filter((u) => u.collection === 'reading-basic');
    expect(readingBasic).toHaveLength(1232);
    expect(readingBasic.filter((u) => u.level === 'A1_A2')).toHaveLength(198);
    expect(readingBasic.filter((u) => u.level === 'B1_B2')).toHaveLength(374);
    expect(readingBasic.filter((u) => u.level === 'C1_C2')).toHaveLength(660);

    const readingFull = PRACTICE_UNITS.filter((u) => u.collection === 'reading-full');
    expect(readingFull).toHaveLength(314);
    expect(readingFull.find((u) => u.unitNumber === 105)).toBeUndefined(); // Test 105 missing

    const listeningBasic = PRACTICE_UNITS.filter((u) => u.collection === 'listening-basic');
    expect(listeningBasic).toHaveLength(102);
    expect(listeningBasic.filter((u) => u.level === 'Basic')).toHaveLength(34);
    expect(listeningBasic.filter((u) => u.level === 'Intermediate')).toHaveLength(34);
    expect(listeningBasic.filter((u) => u.level === 'Advanced')).toHaveLength(34);

    const listeningFull = PRACTICE_UNITS.filter((u) => u.collection === 'listening-full');
    expect(listeningFull).toHaveLength(204);

    // Audio checks
    const missingAudio = listeningFull.filter((u) => !u.hasAudio);
    expect(missingAudio.map((u) => u.unitNumber)).toEqual([83, 85, 88]);
  });

  it('exposes metadata describing inventory, missing units and license', () => {
    expect(PRACTICE_META.totalUnits).toBe(1852);
    expect(PRACTICE_META.declaredUnits).toBe(1853);
    expect(PRACTICE_META.missingUnits).toBe(1);
    expect(PRACTICE_META.collections).toBe(PRACTICE_COLLECTIONS.length);
    expect(PRACTICE_LEVELS).toHaveLength(7);
    expect(PRACTICE_SKILLS).toEqual(['reading', 'listening']);
    expect(PRACTICE_META.license).toBe('CC BY 4.0');
    expect(PRACTICE_META.sourceUrl).toContain('UPGRADE-YOUR-IELTS-SKILLS');
  });

  it('looks up a practice unit by id (case-insensitive)', () => {
    const unitA = findPracticeUnit('reading-basic-a1-a2-001');
    expect(unitA).toBeDefined();
    expect(unitA?.title).toBe('Reading Basic Lesson 1 (A1-A2)');
    expect(unitA?.skill).toBe('reading');

    const unitAUpper = findPracticeUnit('READING-BASIC-A1-A2-001');
    expect(unitAUpper).toEqual(unitA);

    expect(findPracticeUnit('invalid-id')).toBeUndefined();
  });

  it('searches practice units by query, skill, collection, level, hasAudio, and unitNumber', () => {
    const all = searchPracticeUnits({ limit: 50, offset: 0 });
    expect(all.total).toBe(1852);

    const reading = searchPracticeUnits({ limit: 10, offset: 0, skill: 'reading' });
    expect(reading.total).toBe(1546);
    reading.items.forEach((u) => expect(u.skill).toBe('reading'));

    const listeningAdv = searchPracticeUnits({
      limit: 10,
      offset: 0,
      collection: 'listening-basic',
      level: 'Advanced',
    });
    expect(listeningAdv.total).toBe(34);

    const audioMissing = searchPracticeUnits({
      limit: 10,
      offset: 0,
      collection: 'listening-full',
      hasAudio: false,
    });
    expect(audioMissing.total).toBe(3);

    const specificNumber = searchPracticeUnits({
      limit: 10,
      offset: 0,
      collection: 'reading-full',
      unitNumber: 12,
    });
    expect(specificNumber.total).toBe(1);
    expect(specificNumber.items[0]?.id).toBe('reading-full-012');

    const queried = searchPracticeUnits({ limit: 10, offset: 0, query: 'Intermediate' });
    expect(queried.total).toBe(34);
  });

  it('returns deterministic random samples with optional skill and collection filtering', () => {
    const sampleA = randomPracticeUnits('seed-practice', 5);
    const sampleB = randomPracticeUnits('seed-practice', 5);
    expect(sampleA).toHaveLength(5);
    expect(sampleA).toEqual(sampleB);

    const readingSample = randomPracticeUnits('seed-practice', 5, 'reading', 'reading-basic');
    expect(readingSample).toHaveLength(5);
    readingSample.forEach((u) => {
      expect(u.skill).toBe('reading');
      expect(u.collection).toBe('reading-basic');
    });
  });

  it('exposes 17 task family strategies and looks them up by skill and id', () => {
    expect(PRACTICE_STRATEGIES).toHaveLength(17);

    const readingStrategies = getStrategiesBySkill('reading');
    expect(readingStrategies).toHaveLength(11);

    const listeningStrategies = getStrategiesBySkill('listening');
    expect(listeningStrategies).toHaveLength(6);

    const tfng = findPracticeStrategy('reading', 'true-false-not-given');
    expect(tfng).toBeDefined();
    expect(tfng?.name).toContain('True / False / Not Given');
    expect(tfng?.recommendedSteps.length).toBeGreaterThan(0);
    expect(tfng?.tips.length).toBeGreaterThan(0);
    expect(tfng?.pitfalls.length).toBeGreaterThan(0);

    expect(findPracticeStrategy('reading', 'nonexistent')).toBeUndefined();
  });

  it('exposes the 6-step study framework', () => {
    expect(STUDY_FRAMEWORK_STEPS).toHaveLength(6);
    STUDY_FRAMEWORK_STEPS.forEach((step, index) => {
      expect(step.step).toBe(index + 1);
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.objective.length).toBeGreaterThan(0);
      expect(step.actions.length).toBeGreaterThan(0);
      expect(step.output.length).toBeGreaterThan(0);
    });
  });

  it('computes aggregate practice statistics', () => {
    const stats = practiceStats();
    expect(stats.totalUnits).toBe(1852);
    expect(stats.declaredUnits).toBe(1853);
    expect(stats.missingUnits).toBe(1);
    expect(stats.bySkill.reading).toBe(1546);
    expect(stats.bySkill.listening).toBe(306);
    expect(stats.byCollection['reading-basic']).toBe(1232);
    expect(stats.byCollection['reading-full']).toBe(314);
    expect(stats.byCollection['listening-basic']).toBe(102);
    expect(stats.byCollection['listening-full']).toBe(204);
    expect(stats.audioAvailability.withAudio).toBe(303);
    expect(stats.audioAvailability.missingAudio).toBe(3);
    expect(stats.audioAvailability.notApplicable).toBe(1546);
    expect(stats.strategiesCount).toBe(17);
    expect(stats.studyFrameworkSteps).toBe(6);
  });
});
