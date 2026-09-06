import { describe, expect, it } from 'vitest';

import { RESPONSE_FRAMEWORKS } from '../../src/data/frameworks.js';
import { ESSAY_QUESTION_TYPES, WRITING_TOPICS } from '../../src/data/topics.js';
import { buildMockPaper } from '../../src/lib/mockExam.js';

describe('mock-paper composition', () => {
  it('is deterministic for the same inputs', () => {
    const a = buildMockPaper({ seed: '2026-09-05', module: 'academic', delivery: 'paper', words: 5 });
    const b = buildMockPaper({ seed: '2026-09-05', module: 'academic', delivery: 'paper', words: 5 });
    expect(a).toEqual(b);
    expect(a.id).toMatch(/^mock\.[0-9a-z]+$/);
    const c = buildMockPaper({ seed: '2026-09-06', module: 'academic', delivery: 'paper', words: 5 });
    expect(c.id).not.toBe(a.id);
  });

  it('opens with a vocabulary warm-up of the requested length', () => {
    const paper = buildMockPaper({ seed: 'x', module: 'academic', delivery: 'paper', words: 3 });
    const warmup = paper.sections[0];
    expect(warmup?.id).toBe('vocabulary');
    expect(warmup?.skill).toBeNull();
    expect(warmup?.minutes).toBe(10);
    expect(warmup?.items).toHaveLength(3);
    for (const item of warmup?.items ?? []) {
      expect(item.dataset).toBe('vocabulary');
      expect(item.link).toMatch(/^\/v1\/vocabulary\/[a-z-]+$/);
    }
    const words = warmup?.items.map((item) => item.title);
    expect(new Set(words).size).toBe(3);
  });

  it('drops the warm-up when no words are requested', () => {
    const paper = buildMockPaper({ seed: 'x', module: 'academic', delivery: 'paper', words: 0 });
    expect(paper.sections.map((section) => section.id)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
  });

  it('times the sections from the rulebook of the delivery mode', () => {
    const paper = buildMockPaper({ seed: 's', module: 'general-training', delivery: 'computer', words: 0 });
    const listening = paper.sections.find((section) => section.id === 'listening');
    expect(listening?.minutes).toBe(30);
    expect(listening?.instructions[0]).toContain('2 minutes of check time');
    expect(paper.totalMinutes).toBe(152);
    const writing = paper.sections.find((section) => section.id === 'writing');
    expect(writing?.minutes).toBe(60);
    const speaking = paper.sections.find((section) => section.id === 'speaking');
    expect(speaking?.minutes).toBe(14);
  });

  it('uses paper instructions with transfer time for paper delivery', () => {
    const paper = buildMockPaper({ seed: 's', module: 'academic', delivery: 'paper', words: 0 });
    const listening = paper.sections.find((section) => section.id === 'listening');
    expect(listening?.instructions[0]).toContain('10 minutes of transfer time');
    const items = listening?.items ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toMatch(/^lft-/);
    expect(items[0]?.note).toContain('upstream audio indexed');
  });

  it('swaps the reading test for graded lessons when a level is given', () => {
    const paper = buildMockPaper({
      seed: 's',
      module: 'academic',
      delivery: 'paper',
      level: 'B1-B2',
      words: 0,
    });
    const reading = paper.sections.find((section) => section.id === 'reading');
    expect(reading?.items).toHaveLength(2);
    for (const item of reading?.items ?? []) {
      expect(item.id).toMatch(/^grd-b1b2-/);
      expect(item.note).toContain('B1-B2');
    }
    expect(paper.level).toBe('B1-B2');
  });

  it('draws a full test when no level is given', () => {
    const paper = buildMockPaper({ seed: 's', module: 'academic', delivery: 'paper', words: 0 });
    const reading = paper.sections.find((section) => section.id === 'reading');
    const item = reading?.items[0];
    expect(item?.id).toMatch(/^rft-/);
    expect(item?.note).toContain('questions across');
    expect(paper.level).toBeNull();
  });

  it('points writing at a task family, an original prompt and a matching framework', () => {
    const paper = buildMockPaper({ seed: 'frameworks', module: 'academic', delivery: 'paper', words: 0 });
    const writing = paper.sections.find((section) => section.id === 'writing');
    expect(writing?.items.map((item) => item.dataset)).toEqual([
      'tasks/writing',
      'topics/writing',
      'frameworks',
    ]);
    const task2 = writing?.items[1];
    const topic = WRITING_TOPICS.find((candidate) => candidate.id === task2?.id);
    expect(topic?.prompt).toBe(task2?.note);
    const framework = RESPONSE_FRAMEWORKS.find((candidate) => candidate.id === writing?.items[2]?.id);
    expect(framework?.questionTypes).toContain(topic?.questionType);
    expect(writing?.items[2]?.note).toContain('ordered stages');
  });

  it('asks one topic per speaking part', () => {
    const paper = buildMockPaper({ seed: 's', module: 'academic', delivery: 'paper', words: 0 });
    const speaking = paper.sections.find((section) => section.id === 'speaking');
    const titles = speaking?.items.map((item) => item.title) ?? [];
    expect(titles).toHaveLength(3);
    expect(titles[0]).toMatch(/^Part 1 — /);
    expect(titles[1]).toMatch(/^Part 2 — /);
    expect(titles[2]).toMatch(/^Part 3 — /);
    expect(speaking?.instructions.join(' ')).toContain('/v1/bands/descriptors');
  });

  it('links the paper on to the schedule, the report and the tables', () => {
    const paper = buildMockPaper({ seed: 's', module: 'general-training', delivery: 'paper', words: 0 });
    expect(paper.next.schedule).toContain('/v1/exam/schedule?module=general-training&delivery=paper');
    expect(paper.next.report).toContain('/v1/exam/report?module=general-training');
    expect(paper.next.tables).toBe('/v1/exam/tables');
    expect(paper.answerSheet).toEqual({
      listening: { questions: 40 },
      reading: { questions: 40 },
      writing: { task1Words: 150, task2Words: 250 },
      speaking: { parts: 3 },
    });
    expect(paper.provenance).toContain('never upstream test content');
    expect(paper.seed).toBe('s');
  });

  it('invariant: every essay question type has at least one matching framework', () => {
    for (const type of ESSAY_QUESTION_TYPES) {
      const matches = RESPONSE_FRAMEWORKS.filter(
        (framework) => framework.section === 'writing-task-2' && framework.questionTypes.includes(type),
      );
      expect(matches.length, `frameworks for ${type}`).toBeGreaterThan(0);
    }
  });
});
