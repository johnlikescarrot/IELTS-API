import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_PHASES,
  ACTIVITY_SKILLS,
  STUDY_ACTIVITIES,
  activityStats,
  activitiesFor,
  findActivity,
} from '../../src/data/activities.js';

import type { PlanPhase, Skill } from '../../src/types.js';

const TESTED_SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking'];
const BANDS: number[] = [];
for (let band = 0; band <= 9; band += 0.5) {
  BANDS.push(band);
}

describe('the study-activity catalogue', () => {
  it('is a substantial catalogue of original activities', () => {
    expect(STUDY_ACTIVITIES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(STUDY_ACTIVITIES.map((activity) => activity.id)).size).toBe(STUDY_ACTIVITIES.length);
  });

  it('keeps every row within documented bounds', () => {
    for (const activity of STUDY_ACTIVITIES) {
      expect(activity.minutes).toBeGreaterThanOrEqual(5);
      expect(activity.minBand).toBeGreaterThanOrEqual(0);
      expect(activity.maxBand).toBeLessThanOrEqual(9);
      expect(activity.minBand).toBeLessThanOrEqual(activity.maxBand);
      expect(ACTIVITY_SKILLS).toContain(activity.skill);
      expect(['technique', 'drill', 'experience']).toContain(activity.category);
      expect(activity.steps.length).toBeGreaterThan(0);
      expect(activity.phases.length).toBeGreaterThan(0);
      for (const phase of activity.phases) {
        expect(ACTIVITY_PHASES).toContain(phase);
      }
      if (activity.endpoint !== null) {
        expect(activity.endpoint.startsWith('/v1/')).toBe(true);
      }
    }
  });

  it('references only endpoints the API itself serves', () => {
    for (const activity of STUDY_ACTIVITIES) {
      if (activity.endpoint === null) {
        continue;
      }
      const path = activity.endpoint.split('?')[0] as string;
      expect(path).toMatch(/^\/v1\/(quiz|vocabulary|tests|topics|tasks|question-types|bands)/);
      const placeholders = activity.endpoint.match(/\{[^}]*\}/g) ?? [];
      for (const placeholder of placeholders) {
        expect(['{seed}', '{date}']).toContain(placeholder);
      }
    }
  });

  it('covers every skill at every band in every phase', () => {
    for (const skill of TESTED_SKILLS) {
      for (const band of BANDS) {
        for (const phase of ACTIVITY_PHASES as readonly PlanPhase[]) {
          expect(activitiesFor(skill, band, phase).length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('offers a diverse pool where the plan engine picks activities', () => {
    for (const skill of TESTED_SKILLS) {
      for (const band of [0, 4.5, 6.5, 8]) {
        for (const phase of ACTIVITY_PHASES) {
          expect(activitiesFor(skill, band, phase).length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('provides the two experience anchors the plan engine relies on', () => {
    const review = findActivity('error-log-review');
    expect(review).toBeDefined();
    expect(review?.skill).toBe('general');
    expect(review?.category).toBe('experience');
    expect(review?.minutes).toBe(15);
    const mock = findActivity('full-mock-test');
    expect(mock?.minutes).toBe(180);
  });

  it('returns nothing for impossible filters', () => {
    expect(findActivity('does-not-exist')).toBeUndefined();
    expect(activitiesFor('general', 3, 'foundation')).toHaveLength(1);
    expect(activitiesFor('listening', 3, 'assessment-taper').every((a) => a.skill === 'listening')).toBe(
      true,
    );
  });

  it('aggregates catalogue statistics', () => {
    const stats = activityStats();
    expect(stats.activities).toBe(STUDY_ACTIVITIES.length);
    const skillTotal = Object.values(stats.bySkill).reduce((sum, count) => sum + count, 0);
    expect(skillTotal).toBe(STUDY_ACTIVITIES.length);
    expect(stats.bySkill.general).toBe(2);
    expect(stats.byCategory.experience).toBe(2);
    expect(stats.withEndpoint).toBe(STUDY_ACTIVITIES.filter((activity) => activity.endpoint !== null).length);
    expect(stats.withEndpoint).toBeGreaterThan(STUDY_ACTIVITIES.length / 2);
  });
});
