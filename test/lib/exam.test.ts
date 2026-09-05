import { describe, expect, it } from 'vitest';

import { allocateQuestions, buildExamBlueprint, buildExamFormat } from '../../src/lib/exam.js';

describe('allocateQuestions', () => {
  it('allocates exactly the total using the largest-remainder rule', () => {
    expect(allocateQuestions([3, 1], 10)).toEqual([8, 2]);
    expect(allocateQuestions([1, 1, 1], 10).reduce((sum, value) => sum + value, 0)).toBe(10);
  });

  it('handles empty shares and zero totals', () => {
    expect(allocateQuestions([], 40)).toEqual([]);
    expect(allocateQuestions([1, 1], 0)).toEqual([0, 0]);
  });

  it('handles all-zero shares without inventing a total', () => {
    expect(allocateQuestions([0, 0], 40)).toEqual([0, 0]);
  });
});

describe('buildExamFormat', () => {
  it('describes the Academic four-paper format', () => {
    const format = buildExamFormat('academic');
    expect(format.module).toBe('academic');
    expect(format.listening).toMatchObject({
      durationSeconds: 1800,
      transferMinutes: 10,
      questions: 40,
    });
    expect(format.listening.parts).toHaveLength(4);
    expect(format.listening.parts.every((part) => part.questions === 10)).toBe(true);
    expect(format.reading).toMatchObject({ durationSeconds: 3600, transferMinutes: 0, questions: 40 });
    expect(format.reading.parts.map((part) => part.questions)).toEqual([13, 13, 14]);
    expect(format.writing).toEqual({
      durationSeconds: 3600,
      task1: { minutes: 20, minimumWords: 150 },
      task2: { minutes: 40, minimumWords: 250 },
    });
    expect(format.speaking.duration).toBe('11–14 minutes');
    expect(format.speaking.parts.map((part) => part.part)).toEqual([1, 2, 3]);
  });

  it('describes the General Training Reading split', () => {
    const format = buildExamFormat('general-training');
    expect(format.module).toBe('general-training');
    expect(format.reading.parts.map((part) => part.questions)).toEqual([14, 13, 13]);
    expect(format.reading.parts[0]?.context).toContain('everyday');
  });
});

describe('buildExamBlueprint', () => {
  it('builds a deterministic, reproducible session for Academic', () => {
    const blueprint = buildExamBlueprint({
      module: 'academic',
      date: '2026-09-05',
      seed: '2026-09-05',
      target: null,
    });
    expect(blueprint.session).toEqual({
      id: expect.stringMatching(/^mock-[0-9a-f]{8}$/),
      module: 'academic',
      date: '2026-09-05',
      seed: '2026-09-05',
      reproducible: true,
    });
    expect(blueprint.session.id).toBe(
      buildExamBlueprint({ module: 'academic', date: '2026-09-05', seed: '2026-09-05', target: null }).session
        .id,
    );
    expect(blueprint.themes).toHaveLength(2);
    expect(blueprint.writing.task1.familyId.startsWith('academic')).toBe(true);
    expect(blueprint.writing.task1.endpoint).toContain('module=academic');
    expect(blueprint.writing.task2.prompt.length).toBeGreaterThan(20);
    expect(blueprint.writing.task2.endpoint).toContain('/v1/topics/writing?category=');
    expect(blueprint.speaking.part1.questions.length).toBeGreaterThan(0);
    expect(blueprint.speaking.part2.cueCard[0]).toContain('Describe');
    expect(blueprint.speaking.part3.questions.length).toBeGreaterThan(0);
    expect(blueprint.scoring.rawEndpoint).toContain('/v1/scores/raw');
  });

  it('links one listening paper and one full reading paper without a target', () => {
    const blueprint = buildExamBlueprint({
      module: 'academic',
      date: '2026-09-05',
      seed: '2026-09-05',
      target: null,
    });
    expect(blueprint.listening.sources).toHaveLength(1);
    expect(blueprint.listening.sources[0]?.collection).toBe('listening-full-test');
    expect(blueprint.listening.sources[0]?.readingEase).toBeNull();
    expect(blueprint.reading.sources).toHaveLength(1);
    expect(blueprint.reading.sources[0]?.collection).toBe('reading-full-test');
    expect(blueprint.reading.sources[0]?.readingEase).not.toBeNull();
  });

  it('allocates the 40 questions across the observed type mix', () => {
    const blueprint = buildExamBlueprint({
      module: 'academic',
      date: '2026-09-05',
      seed: '2026-09-05',
      target: null,
    });
    expect(blueprint.listening.questionTypeMix).toHaveLength(4);
    expect(blueprint.listening.questionTypeMix.reduce((sum, type) => sum + type.questions, 0)).toBe(40);
    expect(blueprint.listening.questionTypeMix.every((type) => type.share > 0)).toBe(true);
    expect(blueprint.reading.questionTypeMix).toHaveLength(5);
    expect(blueprint.reading.questionTypeMix.reduce((sum, type) => sum + type.questions, 0)).toBe(40);
  });

  it('selects graded reading lessons for a target band', () => {
    const mid = buildExamBlueprint({ module: 'academic', date: 'd', seed: 'd', target: 6.5 });
    expect(mid.reading.sources).toHaveLength(3);
    expect(mid.reading.sources.every((source) => source.collection === 'graded-reading')).toBe(true);
    expect(mid.reading.sources.every((source) => source.level === 'B1-B2')).toBe(true);
    expect(mid.notes.join(' ')).toContain('B1-B2');

    const low = buildExamBlueprint({ module: 'academic', date: 'd', seed: 'd', target: 4.5 });
    expect(low.reading.sources.every((source) => source.level === 'A1-A2')).toBe(true);

    const high = buildExamBlueprint({ module: 'academic', date: 'd', seed: 'd', target: 7.5 });
    expect(high.reading.sources.every((source) => source.level === 'C1-C2')).toBe(true);
  });

  it('uses the General Training Task 1 letter families', () => {
    const blueprint = buildExamBlueprint({
      module: 'general-training',
      date: '2026-09-05',
      seed: '2026-09-05',
      target: null,
    });
    expect(blueprint.writing.task1.familyId.startsWith('general-')).toBe(true);
    expect(blueprint.writing.task1.endpoint).toContain('module=general-training');
    expect(blueprint.reading.format.parts.map((part) => part.questions)).toEqual([14, 13, 13]);
  });

  it('differs when the seed differs', () => {
    const base = buildExamBlueprint({
      module: 'academic',
      date: '2026-09-05',
      seed: '2026-09-05',
      target: null,
    });
    const other = buildExamBlueprint({ module: 'academic', date: '2026-09-05', seed: 'other', target: null });
    expect(other.session.id).not.toBe(base.session.id);
  });
});
