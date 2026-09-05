import { describe, expect, it } from 'vitest';

import { buildStudyPlan } from '../../src/lib/study.js';
import { cefrForBand } from '../../src/data/bands.js';
import { SPEAKING_TOPICS } from '../../src/data/topics.js';

import type { Skill, StudyPlan } from '../../src/types.js';

/** Components well below the target, in report order. */
const LOW: Record<Skill, number> = { listening: 4, reading: 4, writing: 4, speaking: 4 };

function plan(overrides: Partial<Parameters<typeof buildStudyPlan>[0]> = {}): StudyPlan {
  return buildStudyPlan({
    target: 8,
    components: { ...LOW },
    provided: [],
    weeks: 8,
    hoursPerWeek: 10,
    wordsPerDay: 10,
    ...overrides,
  });
}

describe('phase structure', () => {
  it('splits an eight-week plan into foundation, practice and polish', () => {
    const result = plan();
    expect(result.phases).toEqual([
      { name: 'foundation', fromWeek: 1, toWeek: 4, emphasis: expect.stringContaining('Technique') },
      { name: 'practice', fromWeek: 5, toWeek: 7, emphasis: expect.stringContaining('Timed practice') },
      { name: 'polish', fromWeek: 8, toWeek: 8, emphasis: expect.stringContaining('Peak and polish') },
    ]);
    expect(result.weekly.map((week) => week.phase)).toEqual([
      'foundation',
      'foundation',
      'foundation',
      'foundation',
      'practice',
      'practice',
      'practice',
      'polish',
    ]);
  });

  it('collapses to a single foundation phase for one-week plans', () => {
    const result = plan({ weeks: 1 });
    expect(result.phases).toEqual([expect.objectContaining({ name: 'foundation', fromWeek: 1, toWeek: 1 })]);
    expect(result.weekly).toHaveLength(1);
    expect(result.weekly[0]?.checkpoint?.type).toBe('final-review');
  });

  it('omits empty phases instead of publishing zero-week ranges', () => {
    const result = plan({ weeks: 2 });
    expect(result.phases.map((phase) => phase.name)).toEqual(['foundation', 'practice']);
    expect(result.phases[1]).toMatchObject({ fromWeek: 2, toWeek: 2 });
  });

  it('scales the polish phase with plan length', () => {
    const result = plan({ weeks: 52 });
    expect(result.phases).toEqual([
      expect.objectContaining({ name: 'foundation', fromWeek: 1, toWeek: 21 }),
      expect.objectContaining({ name: 'practice', fromWeek: 22, toWeek: 42 }),
      expect.objectContaining({ name: 'polish', fromWeek: 43, toWeek: 52 }),
    ]);
  });
});

describe('gap analysis and hours', () => {
  it('weights weekly hours by the gap size and rounds to 0.1 h', () => {
    const result = plan({
      components: { listening: 4, reading: 6, writing: 6.5, speaking: 7 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(result.gaps).toEqual([
      { skill: 'listening', from: 4, to: 8, gap: 4, share: 0.47, hoursPerWeek: 4.7 },
      { skill: 'reading', from: 6, to: 8, gap: 2, share: 0.24, hoursPerWeek: 2.4 },
      { skill: 'writing', from: 6.5, to: 8, gap: 1.5, share: 0.18, hoursPerWeek: 1.8 },
      { skill: 'speaking', from: 7, to: 8, gap: 1, share: 0.12, hoursPerWeek: 1.2 },
    ]);
  });

  it('splits hours evenly when every component already meets the target', () => {
    const atTarget = { listening: 8, reading: 8, writing: 8, speaking: 8 };
    const result = plan({ components: atTarget, provided: ['listening', 'reading', 'writing', 'speaking'] });
    expect(result.gaps.every((gap) => gap.gap === 0)).toBe(true);
    expect(result.gaps.every((gap) => gap.hoursPerWeek === 2.5)).toBe(true);
    expect(result.notes.some((note) => note.includes('maintenance training'))).toBe(true);
  });

  it('clips negative gaps at zero and drops a component from the hours split', () => {
    const result = plan({
      target: 6,
      components: { listening: 7, reading: 7, writing: 4, speaking: 4 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(result.gaps[0]).toMatchObject({ skill: 'listening', from: 7, gap: 0, share: 0, hoursPerWeek: 0 });
    expect(result.gaps[2]).toMatchObject({ skill: 'writing', gap: 2, share: 0.5, hoursPerWeek: 5 });
  });

  it('rotates the focus skill from the largest gap to the smallest', () => {
    const result = plan({
      components: { listening: 4, reading: 6, writing: 6.5, speaking: 7 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(result.weekly.slice(0, 4).map((week) => week.focus)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(result.weekly[4]?.focus).toBe('listening');
  });

  it('records which components were defaulted and which were supplied', () => {
    const provided = plan({ provided: ['listening'] });
    expect(provided.inputs.providedComponents).toEqual(['listening']);
    expect(provided.inputs.defaultedComponents).toEqual(['reading', 'writing', 'speaking']);
    expect(provided.notes[0]).toContain('default to 6.5');

    const allSupplied = plan({ provided: ['listening', 'reading', 'writing', 'speaking'] });
    expect(allSupplied.notes[0]).toContain('All four components were supplied');
  });

  it('derives the current overall band and CEFR level', () => {
    const result = plan({
      components: { ...LOW },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    expect(result.current.overall).toBe(4);
    expect(result.current.cefr).toBe(cefrForBand(4));
    expect(result.target).toEqual({ band: 8, cefr: cefrForBand(8) });
  });
});

describe('weekly practice content', () => {
  it('links reading weeks to question types and level-appropriate graded lessons', () => {
    const result = plan({
      components: { listening: 7.5, reading: 3.5, writing: 7.5, speaking: 7.5 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    const readingWeek = result.weekly[0] as StudyPlan['weekly'][number];
    expect(readingWeek.focus).toBe('reading');
    expect(readingWeek.practice[0]?.kind).toBe('question-type');
    expect(readingWeek.practice[0]?.url).toMatch(/^\/v1\/question-types\/[a-z-]+$/);
    const graded = readingWeek.practice.find((activity) => activity.kind === 'practice-index');
    expect(graded?.url).toContain('level=a1-a2');
  });

  it('suggests b1-b2 lessons for upper-intermediate readers', () => {
    const result = plan({
      target: 9,
      components: { listening: 8.5, reading: 5.5, writing: 8.5, speaking: 8.5 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    const readingWeek = result.weekly.find((week) => week.focus === 'reading');
    expect(readingWeek?.practice.some((activity) => activity.url.includes('level=b1-b2'))).toBe(true);
  });

  it('suggests c1-c2 lessons for advanced readers', () => {
    const result = plan({
      target: 9,
      components: { listening: 8.5, reading: 8, writing: 8.5, speaking: 8.5 },
      provided: ['listening', 'reading', 'writing', 'speaking'],
    });
    const readingWeek = result.weekly.find((week) => week.focus === 'reading');
    expect(readingWeek?.practice.some((activity) => activity.url.includes('level=c1-c2'))).toBe(true);
  });

  it('links listening weeks to the full listening tests', () => {
    const result = plan({ weeks: 5 });
    const listeningWeek = result.weekly.find((week) => week.focus === 'listening');
    expect(listeningWeek?.practice.some((activity) => activity.url.includes('listening-full-test'))).toBe(
      true,
    );
  });

  it('links writing weeks to a task-2 category and essay family', () => {
    const result = plan({ weeks: 5 });
    const writingWeek = result.weekly.find((week) => week.focus === 'writing');
    expect(writingWeek?.practice[0]?.kind).toBe('writing-task');
    expect(writingWeek?.practice[0]?.url).toMatch(/^\/v1\/topics\/writing\?category=.+&type=.+$/);
  });

  it('cycles speaking parts one, two and three across speaking weeks', () => {
    const result = plan({ weeks: 12 });
    const speakingWeeks = result.weekly.filter((week) => week.focus === 'speaking');
    expect(speakingWeeks).toHaveLength(3);
    const names = speakingWeeks.map((week) => week.practice[0]?.name ?? '');
    expect(names[0]).toMatch(/^Part 1: /);
    expect(names[1]).toMatch(/^Part 2: /);
    expect(names[2]).toMatch(/^Part 3: /);
    for (const name of names) {
      expect(SPEAKING_TOPICS.some((topic) => `Part ${topic.part}: ${topic.topic}` === name)).toBe(true);
    }
  });
});

describe('checkpoints', () => {
  it('schedules full mocks every quarter and a final review in the last week', () => {
    const result = plan();
    expect(result.weekly.map((week) => week.checkpoint?.type ?? null)).toEqual([
      null,
      'full-mock',
      null,
      'full-mock',
      null,
      'full-mock',
      null,
      'final-review',
    ]);
    expect(result.weekly[1]?.checkpoint?.detail).toContain('/v1/scores/overall');
  });
});

describe('vocabulary workload', () => {
  it('scales the headword workload with the daily rate', () => {
    const result = plan({ wordsPerDay: 20 });
    expect(result.vocabulary.wordsPerDay).toBe(20);
    expect(result.vocabulary.wordsPerWeek).toBe(140);
    expect(result.vocabulary.headwordsOverPlan).toBe(1120);
    expect(result.vocabulary.headwordsAvailable).toBe(4174);
    expect(result.weekly[0]?.vocabulary).toEqual({ newWords: 100, reviewWords: 40 });
  });

  it('never promises more headwords than the dataset holds', () => {
    const result = plan({ weeks: 52, wordsPerDay: 50 });
    expect(result.vocabulary.headwordsOverPlan).toBe(4174);
  });
});

describe('determinism', () => {
  it('produces byte-identical plans for identical inputs', () => {
    const first = JSON.stringify(plan());
    const second = JSON.stringify(plan());
    expect(second).toBe(first);
  });

  it('seeds the schedule from every input, not just the target', () => {
    const byHours = JSON.stringify(plan({ hoursPerWeek: 12 }));
    const byHoursOther = JSON.stringify(plan({ hoursPerWeek: 12 }));
    expect(byHoursOther).toBe(byHours);
    expect(JSON.stringify(plan({ hoursPerWeek: 14 }))).not.toBe(byHours);
  });
});
