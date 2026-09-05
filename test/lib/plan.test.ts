import { describe, expect, it } from 'vitest';

import { READING_PASSAGES } from '../../src/data/reading.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../../src/data/topics.js';
import { STRATEGIES } from '../../src/data/strategies.js';
import { buildStudyPlan } from '../../src/lib/plan.js';

import type { StudyPlanRequest } from '../../src/lib/plan.js';
import type { HttpError } from '../../src/lib/errors.js';

const request = (overrides: Partial<StudyPlanRequest> = {}): StudyPlanRequest => ({
  current: 5.5,
  target: 7,
  weeks: 8,
  hoursPerWeek: 10,
  ...overrides,
});

describe('buildStudyPlan', () => {
  it('produces one audited block per week', () => {
    const plan = buildStudyPlan(request());
    expect(plan.weekly).toHaveLength(8);
    expect(plan.gap).toBe(1.5);
    expect(plan.targetCefr).toBe('C1');
    expect(plan.assumptions.length).toBeGreaterThanOrEqual(4);
    for (const week of plan.weekly) {
      const hours = Object.values(week.hours);
      for (const value of hours) {
        expect((value * 2) % 1).toBe(0);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(week.reviewHours).toBe(2.5);
      expect(week.vocabularyWords).toBeGreaterThan(10);
      expect(week.vocabularyWords).toBeLessThanOrEqual(60);
      expect(WRITING_TOPICS.map((topic) => topic.id)).toContain(week.materials.writingTopicId);
      expect(SPEAKING_TOPICS.map((topic) => topic.id)).toContain(week.materials.speakingTopicId);
      expect(READING_PASSAGES.map((passage) => passage.id)).toContain(week.materials.readingPassageId);
      for (const id of week.materials.strategyIds) {
        const card = STRATEGIES.find((strategy) => strategy.id === id);
        expect(card?.skill).toBe(week.focusSkill);
      }
    }
  });

  it('rotates the focus so each skill recurs', () => {
    const plan = buildStudyPlan(request({ focus: ['writing', 'speaking'] }));
    expect(plan.focus).toEqual(['writing', 'speaking']);
    const skills = plan.weekly.map((week) => week.focusSkill);
    expect(new Set(skills).size).toBe(4);
    expect(['writing', 'speaking']).toContain(skills[0]);
    expect(plan.assumptions[0]).toContain('flagged weak skills');
  });

  it('omits the focus clause when no skills are flagged', () => {
    const plan = buildStudyPlan(request({ weeks: 1 }));
    expect(plan.assumptions[0]).not.toContain('flagged');
    expect(plan.focus).toEqual([]);
  });

  it('selects reading material at the target CEFR level', () => {
    const plan = buildStudyPlan(request({ target: 6.5 }));
    expect(plan.targetCefr).toBe('B2');
    const levels = new Set(
      plan.weekly.map(
        (week) =>
          READING_PASSAGES.find((passage) => passage.id === week.materials.readingPassageId)?.cefrLevel,
      ),
    );
    expect([...levels]).toEqual(['B2']);
  });

  it('falls back to the whole passage set when the level has none', () => {
    const plan = buildStudyPlan(request({ target: 8.5, weeks: 3 }));
    expect(plan.targetCefr).toBe('C2');
    for (const week of plan.weekly) {
      expect(READING_PASSAGES.map((passage) => passage.id)).toContain(week.materials.readingPassageId);
    }
  });

  it('schedules mock tests every fourth week and a final review', () => {
    const long = buildStudyPlan(request({ weeks: 9 }));
    expect(long.weekly[0]?.milestone).toBeNull();
    expect(long.weekly[3]?.milestone).toContain('Mock test');
    expect(long.weekly[8]?.milestone).toContain('Final review');
    const short = buildStudyPlan(request({ weeks: 2 }));
    expect(short.weekly[0]?.milestone).toBeNull();
    expect(short.weekly[1]?.milestone).toContain('Final review');
  });

  it('keeps a minimal budget well-formed', () => {
    const plan = buildStudyPlan(request({ weeks: 1, hoursPerWeek: 1 }));
    const week = plan.weekly[0] as (typeof plan.weekly)[number];
    expect(week.reviewHours).toBe(0.5);
    expect(Object.values(week.hours).every((value) => value >= 0)).toBe(true);
  });

  it('rejects targets below the current band', () => {
    let error: HttpError | undefined;
    try {
      buildStudyPlan(request({ target: 5, current: 6 }));
    } catch (thrown) {
      error = thrown as HttpError;
    }
    expect(error?.status).toBe(400);
    expect(error?.message).toContain('target');
  });

  it('allows a plan that maintains the current band', () => {
    const plan = buildStudyPlan(request({ current: 6, target: 6, weeks: 1 }));
    expect(plan.gap).toBe(0);
    expect(plan.weekly[0]?.milestone).toContain('Final review');
  });
});
