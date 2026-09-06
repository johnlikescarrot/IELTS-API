import { describe, expect, it } from 'vitest';

import { buildExamReport, buildExamSchedule, parseExamStart } from '../../src/lib/exam.js';

import type { ExamReport } from '../../src/types.js';

const componentOf = (report: ExamReport, skill: string) =>
  report.components.find((component) => component.skill === skill);

describe('parseExamStart', () => {
  it('accepts a bare wall-clock time', () => {
    expect(parseExamStart('09:30')).toEqual({ date: null, minutes: 570, label: '09:30' });
  });

  it('accepts an ISO date anchor', () => {
    expect(parseExamStart('2026-01-05T07:00')).toEqual({
      date: '2026-01-05',
      minutes: 420,
      label: '2026-01-05T07:00',
    });
  });

  it('rejects impossible dates', () => {
    expect(() => parseExamStart('2026-13-01T10:00')).toThrow('valid calendar date');
    expect(() => parseExamStart('2026-02-30T10:00')).toThrow('valid calendar date');
  });

  it('rejects malformed values', () => {
    expect(() => parseExamStart('9:30am')).toThrow('HH:MM');
    expect(() => parseExamStart('23:60')).toThrow('HH:MM');
    expect(() => parseExamStart('2026-01-05')).toThrow('HH:MM');
  });
});

describe('buildExamSchedule', () => {
  it('runs the papers back to back with the transfer window, no breaks', () => {
    const schedule = buildExamSchedule({
      module: 'academic',
      delivery: 'paper',
      start: parseExamStart('09:00'),
      breakMinutes: 0,
    });
    expect(schedule.segments.map((segment) => segment.id)).toEqual([
      'listening',
      'transfer',
      'reading',
      'writing',
    ]);
    expect(schedule.totalMinutes).toBe(160);
    expect(schedule.countdownSeconds).toBe(160 * 60);
    expect(schedule.end).toEqual({ time: '11:40', day: 0 });
    expect(schedule.date).toBeNull();
    expect(schedule.breakMinutes).toBe(0);
    const listening = schedule.segments[0] as (typeof schedule.segments)[number];
    expect(listening.start).toBe('09:00');
    expect(listening.end).toBe('09:30');
    expect(listening.startMinutes).toBe(0);
    const reading = schedule.segments.find((segment) => segment.id === 'reading');
    expect(reading?.startMinutes).toBe(40);
  });

  it('inserts breaks, uses check time on computer delivery and rolls over midnight', () => {
    const schedule = buildExamSchedule({
      module: 'general-training',
      delivery: 'computer',
      start: parseExamStart('22:50'),
      breakMinutes: 10,
    });
    expect(schedule.segments.map((segment) => segment.id)).toEqual([
      'listening',
      'check',
      'break',
      'reading',
      'break',
      'writing',
    ]);
    expect(schedule.totalMinutes).toBe(172);
    expect(schedule.end).toEqual({ time: '01:42', day: 1 });
    expect(
      schedule.segments.every((segment) => segment.endMinutes - segment.startMinutes === segment.minutes),
    ).toBe(true);
  });
});

describe('buildExamReport', () => {
  it('completes a report with overall band and target gaps', () => {
    const report = buildExamReport({
      module: 'academic',
      listeningRaw: 30,
      readingRaw: 27,
      writing: 6.5,
      speaking: 7,
      target: 7,
    });
    expect(report.module).toBe('academic');
    expect(report.overall?.overall).toBe(7);
    expect(report.overall?.cefr).toBe('C1');
    expect(componentOf(report, 'listening')).toMatchObject({
      source: 'raw',
      raw: 30,
      band: 7,
      range: { minRaw: 30, maxRaw: 31 },
      next: { band: 7.5, minRaw: 32, itemsNeeded: 2 },
    });
    expect(componentOf(report, 'writing')).toMatchObject({
      source: 'band',
      raw: null,
      range: null,
      next: null,
    });
    expect(report.target?.overallStatus).toBe('met');
    expect(report.target?.rows.map((row) => row.status)).toEqual(['met', 'behind', 'behind', 'met']);
    expect(report.target?.rows[1]?.bandGap).toBe(0.5);
    expect(report.target?.rows[0]?.itemsNeeded).toBeNull();
    expect(report.convention).toContain('personal data');
  });

  it('leaves the overall blank until all four components are known', () => {
    const report = buildExamReport({ module: 'general-training', readingRaw: 35 });
    expect(report.overall).toBeNull();
    expect(componentOf(report, 'reading')?.band).toBe(7.5);
    expect(componentOf(report, 'speaking')).toMatchObject({ source: 'missing', band: null, next: null });
    expect(report.target).toBeNull();
  });

  it('reads General Training marks on the General Training table', () => {
    const academic = buildExamReport({ module: 'academic', readingRaw: 30 });
    const general = buildExamReport({ module: 'general-training', readingRaw: 30 });
    expect(componentOf(academic, 'reading')?.band).toBe(7);
    expect(componentOf(general, 'reading')?.band).toBe(6);
  });

  it('counts the marks still needed from a below-table mark', () => {
    const report = buildExamReport({ module: 'academic', listeningRaw: 0, target: 4 });
    expect(report.target?.rows.find((row) => row.skill === 'listening')).toEqual({
      skill: 'listening',
      status: 'behind',
      itemsNeeded: 11,
      bandGap: null,
    });
    expect(report.target?.rows.find((row) => row.skill === 'writing')?.status).toBe('unknown');
    expect(report.target?.overallStatus).toBe('unknown');
  });

  it('treats targets below the whole table as met by any mark', () => {
    const report = buildExamReport({ module: 'academic', listeningRaw: 0, target: 0.5 });
    expect(report.target?.rows.find((row) => row.skill === 'listening')).toEqual({
      skill: 'listening',
      status: 'met',
      itemsNeeded: 0,
      bandGap: null,
    });
  });

  it('marks an overall that misses the target', () => {
    const report = buildExamReport({
      module: 'academic',
      listeningRaw: 30,
      readingRaw: 27,
      writing: 6.5,
      speaking: 7,
      target: 7.5,
    });
    expect(report.target?.overallStatus).toBe('behind');
  });
});
