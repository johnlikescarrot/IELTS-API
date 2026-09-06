import { describe, expect, it } from 'vitest';

import { buildMockExam, buildMockReport } from '../../src/lib/mock.js';
import { findPracticeItem, practiceItems } from '../../src/data/practiceTests.js';
import { findTaskTypes, TASK_TYPES } from '../../src/data/tasks.js';
import { SPEAKING_TOPICS, WRITING_TOPICS } from '../../src/data/topics.js';

import type { IeltsModule, MockExam, PracticeItem } from '../../src/types.js';

/** Compose an exam, defaulting to an academic sitting with a fixed seed. */
function exam(seed = '2026-09-05', module: IeltsModule = 'academic'): MockExam {
  return buildMockExam({ seed, module });
}

/** Content of one section as a plain record. */
function sectionContent(result: MockExam, skill: string): Record<string, unknown> {
  const section = result.sections.find((entry) => entry.skill === skill);
  return section?.content as Record<string, unknown>;
}

/** Paper reference embedded in a section. */
function paperOf(result: MockExam, skill: string): PracticeItem {
  const content = sectionContent(result, skill);
  const paper = content['paper'] as { id: string; title: string; questions: number };
  const found = findPracticeItem(paper.id);
  expect(found?.title).toBe(paper.title);
  expect(found?.questions).toBe(paper.questions);
  return found as PracticeItem;
}

describe('buildMockExam', () => {
  it('is deterministic: identical seeds return byte-identical exams', () => {
    expect(exam('replica-check')).toEqual(exam('replica-check'));
    expect(JSON.stringify(exam('replica-check'))).toBe(JSON.stringify(exam('replica-check')));
  });

  it('uses the seed as the exam label', () => {
    expect(exam('morning-sitting').seed).toBe('morning-sitting');
  });

  it('composes all four skills in sitting order with canonical timings', () => {
    const result = exam();
    expect(result.sections.map((section) => section.skill)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(result.sections.map((section) => section.order)).toEqual([1, 2, 3, 4]);
    expect(result.sections.map((section) => section.minutes)).toEqual([30, 60, 60, 14]);
    for (const section of result.sections) {
      expect(section.format.length).toBeGreaterThan(0);
    }
  });

  it('references an audio-backed listening full test that exists in the index', () => {
    const paper = paperOf(exam(), 'listening');
    expect(paper.collection).toBe('listening-full-test');
    expect(paper.assets.audio).toBe(true);
    expect(sectionContent(exam(), 'listening')['audio']).toBe(true);
    expect(sectionContent(exam(), 'listening')['recordings']).toBe(4);
  });

  it('references a reading full test that exists in the index', () => {
    const result = exam();
    const paper = paperOf(result, 'reading');
    expect(paper.collection).toBe('reading-full-test');
    expect(result.questions).toBe(paperOf(result, 'listening').questions + paper.questions);
  });

  it('draws a Task 1 family for the module and a full Task 2 prompt', () => {
    const content = sectionContent(exam('seed-a', 'academic'), 'writing');
    const task1 = content['task1'] as { id: string; minimumWords: number };
    const task2 = content['task2'] as { id: string; prompt: string; minimumWords: number };
    expect(TASK_TYPES.find((type) => type.id === task1.id)?.module).toBe('academic');
    expect(WRITING_TOPICS.find((topic) => topic.id === task2.id)?.prompt).toBe(task2.prompt);
    expect(task1.minimumWords).toBe(150);
    expect(task2.minimumWords).toBe(250);

    const gtContent = sectionContent(exam('seed-a', 'general-training'), 'writing');
    const gtTask1 = gtContent['task1'] as { id: string };
    expect(TASK_TYPES.find((type) => type.id === gtTask1.id)?.module).toBe('general-training');
  });

  it('draws one speaking topic per part, all resolvable in the bank', () => {
    const parts = sectionContent(exam(), 'speaking')['parts'] as { part: number; id: string }[];
    expect(parts.map((part) => part.part)).toEqual([1, 2, 3]);
    for (const part of parts) {
      expect(SPEAKING_TOPICS.find((topic) => topic.id === part.id)?.part).toBe(part.part);
    }
  });

  it('scores the reading paper with the module-appropriate conversion table', () => {
    expect(exam('s', 'academic').scoring.reading).toBe('academic-reading');
    expect(exam('s', 'general-training').scoring.reading).toBe('general-training-reading');
    expect(exam('s', 'general-training').scoring.listening).toBe('listening');
  });

  it('varies the drawn papers across a fixed set of seeds', () => {
    const seeds = Array.from({ length: 20 }, (_unused, index) => `sitting-${index}`);
    const listening = new Set(
      seeds.map((seed) => (sectionContent(exam(seed), 'listening')['paper'] as { id: string }).id),
    );
    const reading = new Set(
      seeds.map((seed) => (sectionContent(exam(seed), 'reading')['paper'] as { id: string }).id),
    );
    // Deterministic seeds make these assertions reproducible on every run.
    expect(listening.size).toBeGreaterThan(1);
    expect(reading.size).toBeGreaterThan(1);
  });

  it('only draws from pools that stay well populated', () => {
    expect(
      practiceItems().filter((item) => item.collection === 'listening-full-test' && item.assets.audio).length,
    ).toBeGreaterThan(100);
    expect(practiceItems().filter((item) => item.collection === 'reading-full-test').length).toBeGreaterThan(
      100,
    );
    expect(findTaskTypes('academic').length).toBeGreaterThan(3);
    expect(findTaskTypes('general-training').length).toBeGreaterThan(0);
  });
});

describe('buildMockReport', () => {
  it('converts objective raw scores, folds in examiner bands and averages to an overall', () => {
    const report = buildMockReport({
      module: 'academic',
      listeningCorrect: 32,
      readingCorrect: 30,
      writing: 6,
      speaking: 6,
    });
    expect(report.components.map((component) => component.band)).toEqual([7.5, 7.0, 6, 6]);
    expect(report.components.map((component) => component.source)).toEqual([
      'raw-conversion',
      'raw-conversion',
      'examiner-band',
      'examiner-band',
    ]);
    expect(report.overall).toBe(6.5);
    expect(report.cefr).toBe('B2');
    expect(report.spread).toBe(1.5);
    expect(report.weakestSkills).toEqual(['writing', 'speaking']);
    expect(report.explanation).toContain('overall 6.5');
  });

  it('echoes the raw marks and selects the reading table from the module', () => {
    const report = buildMockReport({
      module: 'general-training',
      listeningCorrect: 35,
      readingCorrect: 34,
      writing: 7,
      speaking: 7,
    });
    const listening = report.components[0];
    const reading = report.components[1];
    expect(listening?.raw).toEqual({ test: 'listening', correct: 35, outOf: 40 });
    expect(listening?.band).toBe(8.0);
    expect(reading?.raw).toEqual({ test: 'general-training-reading', correct: 34, outOf: 40 });
    expect(reading?.band).toBe(7.0);
    expect(report.overall).toBe(7.5);
  });

  it('withholds the overall until the examiner bands arrive', () => {
    const report = buildMockReport({
      module: 'academic',
      listeningCorrect: 30,
      readingCorrect: 30,
      writing: undefined,
      speaking: undefined,
    });
    expect(report.components).toHaveLength(2);
    expect(report.overall).toBeNull();
    expect(report.cefr).toBeNull();
    expect(report.weakestSkills).toEqual([]);
    expect(report.spread).toBeNull();
    expect(report.explanation).toContain('writing and speaking');
    expect(report.explanation).toContain('were not reported');
  });

  it('withholds the overall when a raw score falls below the published floor', () => {
    const report = buildMockReport({
      module: 'academic',
      listeningCorrect: 2,
      readingCorrect: 30,
      writing: 6,
      speaking: 6,
    });
    expect(report.components[0]?.band).toBeNull();
    expect(report.overall).toBeNull();
    expect(report.explanation).toContain('below the published conversion table floor');
  });

  it('accepts a report with only one examiner band missing and says which', () => {
    const report = buildMockReport({
      module: 'academic',
      listeningCorrect: 30,
      readingCorrect: 30,
      writing: 6.5,
      speaking: undefined,
    });
    expect(report.components).toHaveLength(3);
    expect(report.overall).toBeNull();
    expect(report.explanation).toContain('speaking');
    expect(report.explanation).not.toContain('conversion table floor');
  });
});
