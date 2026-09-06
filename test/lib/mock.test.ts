import { describe, expect, it } from 'vitest';

import {
  buildMockSuite,
  buildSessionPlan,
  findMockSuite,
  gradeResponses,
  mockSuiteId,
  mockSuites,
  normalizeAnswer,
  parseKeySheet,
  parseResponseSheet,
  rawToBand,
} from '../../src/lib/mock.js';
import { MOCK_SUITE_COUNT } from '../../src/data/mock.js';

describe('rawToBand', () => {
  it('maps a full-paper listening mark to its band, level, CEFR and range', () => {
    expect(rawToBand('listening', 30, 40)).toEqual({
      skill: 'listening',
      raw: 30,
      total: 40,
      scaledRaw: 30,
      band: 7,
      level: 'Good user',
      cefr: 'C1',
      range: '30–32',
    });
  });

  it('reports the top row as a closed range', () => {
    const result = rawToBand('listening', 40, 40);
    expect(result.band).toBe(9);
    expect(result.range).toBe('39–40');
  });

  it('distinguishes the Academic and General Training reading cuts', () => {
    expect(rawToBand('reading-academic', 30, 40).band).toBe(7);
    expect(rawToBand('reading-general', 30, 40).band).toBe(6);
    expect(rawToBand('reading-general', 34, 40).band).toBe(7);
  });

  it('scales partial papers to a 40-question paper before the lookup', () => {
    const result = rawToBand('listening', 15, 20);
    expect(result.scaledRaw).toBe(30);
    expect(result.band).toBe(7);
  });

  it('maps a blank paper to band 1, never band 0', () => {
    expect(rawToBand('listening', 0, 40).band).toBe(1);
    expect(rawToBand('reading-academic', 0, 10).band).toBe(1);
  });

  it('maps a perfect General Training paper covering the single-mark top row', () => {
    expect(rawToBand('reading-general', 40, 40)).toEqual(expect.objectContaining({ band: 9, range: '40' }));
    expect(rawToBand('reading-general', 39, 40)).toEqual(expect.objectContaining({ band: 8.5, range: '39' }));
  });

  it('rejects totals outside a real paper', () => {
    expect(() => rawToBand('listening', 10, 0)).toThrow('"total" must be an integer between 1 and 40.');
    expect(() => rawToBand('listening', 10, 41)).toThrow('"total" must be an integer');
    expect(() => rawToBand('listening', 10, 20.5)).toThrow('"total" must be an integer');
  });

  it('rejects raw marks outside the paper total', () => {
    expect(() => rawToBand('listening', -1, 40)).toThrow('"raw" must be an integer');
    expect(() => rawToBand('listening', 30.5, 40)).toThrow('"raw" must be an integer');
    expect(() => rawToBand('listening', 21, 20)).toThrow('"raw" must be an integer');
  });
});

describe('normalizeAnswer', () => {
  it('lower-cases, collapses whitespace and strips decorative punctuation', () => {
    expect(normalizeAnswer('  Hello,   WORLD! ')).toBe('hello, world');
    expect(normalizeAnswer('"dances"')).toBe('dances');
    expect(normalizeAnswer('(survival)')).toBe('survival');
    expect(normalizeAnswer('well–known')).toBe('well-known');
    expect(normalizeAnswer('a\tb\nc')).toBe('a b c');
    expect(normalizeAnswer('   ')).toBe('');
  });
});

describe('parseKeySheet', () => {
  it('parses entries with "|" separated alternatives', () => {
    const keyed = parseKeySheet('1:colour|color ; 2:books');
    expect(keyed.get(1)).toEqual(['colour', 'color']);
    expect(keyed.get(2)).toEqual(['books']);
  });

  it('rejects empty and oversized keys', () => {
    expect(() => parseKeySheet('')).toThrow('at least one');
    expect(() => parseKeySheet(' ; ; ')).toThrow('at least one');
    const big = Array.from({ length: 41 }, (_unused, index) => `${String(index + 1)}:a`).join(';');
    expect(() => parseKeySheet(big)).toThrow('at most 40');
  });

  it('rejects malformed entries, numbers and duplicates', () => {
    expect(() => parseKeySheet('12')).toThrow('must look like "12:answer"');
    expect(() => parseKeySheet('abc:xyz')).toThrow('must look like "12:answer"');
    expect(() => parseKeySheet('0:x')).toThrow('between 1 and 40');
    expect(() => parseKeySheet('41:x')).toThrow('between 1 and 40');
    expect(() => parseKeySheet('1:a;1:b')).toThrow('duplicated');
  });

  it('rejects entries with no accepted answer', () => {
    expect(() => parseKeySheet('1:')).toThrow('no accepted answer');
    expect(() => parseKeySheet('1:  |  ')).toThrow('no accepted answer');
  });
});

describe('parseResponseSheet', () => {
  it('parses responses and grades a blank sheet as all-unanswered', () => {
    expect(parseResponseSheet('').size).toBe(0);
    expect(parseResponseSheet('   ').size).toBe(0);
    const responses = parseResponseSheet('1:hello;2:');
    expect(responses.get(1)).toBe('hello');
    expect(responses.get(2)).toBe('');
  });

  it('rejects oversized, malformed and duplicated responses', () => {
    const big = Array.from({ length: 41 }, (_unused, index) => `${String(index + 1)}:a`).join(';');
    expect(() => parseResponseSheet(big)).toThrow('at most 40');
    expect(() => parseResponseSheet('12')).toThrow('must look like "12:answer"');
    expect(() => parseResponseSheet('0:x')).toThrow('between 1 and 40');
    expect(() => parseResponseSheet('2:a;2:b')).toThrow('duplicated');
  });
});

describe('gradeResponses', () => {
  const key = '1:colour|color;2:The Thames;3:dances';

  it('grades case-insensitively against every alternative', () => {
    const result = gradeResponses('listening', key, '1:Color;2:the thames;3:dances');
    expect(result.total).toBe(3);
    expect(result.raw).toBe(3);
    expect(result.scaledRaw).toBe(40);
    expect(result.band).toBe(9);
    expect(result.accuracy).toBe(1);
    expect(result.unanswered).toBe(0);
    expect(result.items).toEqual([
      { no: 1, expected: ['colour', 'color'], given: 'Color', correct: true },
      { no: 2, expected: ['the thames'], given: 'the thames', correct: true },
      { no: 3, expected: ['dances'], given: 'dances', correct: true },
    ]);
  });

  it('counts missing answers as unanswered and wrong answers as incorrect', () => {
    const result = gradeResponses('listening', key, '1:color;3:sing');
    expect(result.raw).toBe(1);
    expect(result.unanswered).toBe(1);
    expect(result.accuracy).toBe(0.33);
    expect(result.items[1]).toEqual({ no: 2, expected: ['the thames'], given: null, correct: false });
    expect(result.items[2]?.correct).toBe(false);
  });

  it('treats explicitly blank answers as unanswered', () => {
    const result = gradeResponses('listening', '1:a;2:b', '1:a;2:');
    expect(result.raw).toBe(1);
    expect(result.unanswered).toBe(1);
  });

  it('scales a perfect partial paper to band 9', () => {
    const entries = Array.from(
      { length: 10 },
      (_unused, index) => `${String(index + 1)}:w${String(index + 1)}`,
    );
    const result = gradeResponses('reading-academic', entries.join(';'), entries.join(';'));
    expect(result.total).toBe(10);
    expect(result.scaledRaw).toBe(40);
    expect(result.band).toBe(9);
  });

  it('applies the paper-specific table to the same mark', () => {
    const entries = Array.from(
      { length: 10 },
      (_unused, index) => `${String(index + 1)}:w${String(index + 1)}`,
    );
    const responses = entries.slice(0, 8).join(';');
    expect(gradeResponses('listening', entries.join(';'), responses).band).toBe(7);
    expect(gradeResponses('reading-general', entries.join(';'), responses).band).toBe(6.5);
  });
});

describe('buildSessionPlan', () => {
  it('plans a pausable Listening practice sitting with review time', () => {
    const plan = buildSessionPlan('listening', 'practice');
    expect(plan.delivery).toBe('computer');
    expect(plan.totalMinutes).toBe(32);
    expect(plan.sections).toHaveLength(2);
    expect(plan.controls).toContain('timer');
    expect(plan.controls).toContain('notepad');
    expect(plan.controls).toContain('finish-section');
    expect(plan.rules.join(' ')).toContain('Practice mode');
    expect(plan.scoring).toHaveLength(3);
  });

  it('plans an exam-condition Academic Reading sitting', () => {
    const plan = buildSessionPlan('reading-academic', 'exam');
    expect(plan.totalMinutes).toBe(60);
    expect(plan.sections[0]?.questions).toBe(40);
    expect(plan.rules.join(' ')).toContain('Exam conditions');
  });

  it('plans a General Training Reading sitting', () => {
    const plan = buildSessionPlan('reading-general', 'practice');
    expect(plan.totalMinutes).toBe(60);
    expect(plan.sections[0]?.name).toContain('General Training');
  });

  it('plans a Writing sitting with Task 1 and Task 2 word targets', () => {
    const plan = buildSessionPlan('writing', 'exam');
    expect(plan.totalMinutes).toBe(60);
    expect(plan.sections.map((section) => section.minWords)).toEqual([150, 250]);
    expect(plan.sections.map((section) => section.minutes)).toEqual([20, 40]);
  });

  it('plans a full suite running Listening, Reading then Writing', () => {
    const plan = buildSessionPlan('full-suite', 'exam');
    expect(plan.totalMinutes).toBe(152);
    expect(plan.sections).toHaveLength(5);
    expect(plan.sections[0]?.name).toContain('Listening');
    expect(plan.sections[2]?.name).toContain('Reading');
    expect(plan.sections[4]?.name).toContain('Task 2');
  });
});

describe('stable full-suite mocks', () => {
  it('numbers stable identifiers from mock-001', () => {
    expect(mockSuiteId(1)).toBe('mock-001');
    expect(mockSuiteId(24)).toBe('mock-024');
  });

  it('builds a deterministic suite from the index and the task banks', () => {
    const first = buildMockSuite(1);
    const again = buildMockSuite(1);
    expect(JSON.stringify(again)).toBe(JSON.stringify(first));
    expect(first.id).toBe('mock-001');
    expect(first.n).toBe(1);
    expect(first.title).toContain('mock-001');
    expect(first.listening.id.length).toBeGreaterThan(0);
    expect(first.reading.id.length).toBeGreaterThan(0);
    expect(first.listening.questions).toBeGreaterThan(0);
    expect(first.writing.task1.minWords).toBe(150);
    expect(first.writing.task2.minWords).toBe(250);
    expect(first.writing.task2.promptId.length).toBeGreaterThan(0);
    expect(first.totalMinutes).toBe(152);
  });

  it('rejects suite numbers outside the catalogue', () => {
    expect(() => buildMockSuite(0)).toThrow('between 1 and 24');
    expect(() => buildMockSuite(MOCK_SUITE_COUNT + 1)).toThrow('between 1 and 24');
    expect(() => buildMockSuite(1.5)).toThrow('between 1 and 24');
    expect(() => buildMockSuite(Number.NaN)).toThrow('between 1 and 24');
  });

  it('lists the whole catalogue with unique identifiers', () => {
    const suites = mockSuites();
    expect(suites).toHaveLength(MOCK_SUITE_COUNT);
    expect(new Set(suites.map((suite) => suite.id)).size).toBe(MOCK_SUITE_COUNT);
    expect(suites[0]?.id).toBe('mock-001');
  });

  it('finds suites case-insensitively and forgives surrounding whitespace', () => {
    expect(findMockSuite('mock-001')?.n).toBe(1);
    expect(findMockSuite('MOCK-002')?.n).toBe(2);
    expect(findMockSuite('  mock-003  ')?.n).toBe(3);
    expect(findMockSuite('nope')).toBeUndefined();
    expect(findMockSuite('mock-000')).toBeUndefined();
    expect(findMockSuite('mock-999')).toBeUndefined();
    expect(findMockSuite(`mock-${String(MOCK_SUITE_COUNT + 1).padStart(3, '0')}`)).toBeUndefined();
  });
});
