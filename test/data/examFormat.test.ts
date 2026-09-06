import { describe, expect, it } from 'vitest';

import {
  EXAM_DELIVERIES,
  EXAM_FORMAT_PROVENANCE,
  EXAM_MODULES,
  EXAM_TEST_DAYS,
  examTestDayConfig,
  listeningAfter,
} from '../../src/data/examFormat.js';

describe('the exam rulebook', () => {
  it('covers every module and delivery combination', () => {
    expect(EXAM_TEST_DAYS).toHaveLength(4);
    for (const row of EXAM_TEST_DAYS) {
      expect(EXAM_MODULES).toContain(row.module);
      expect(EXAM_DELIVERIES).toContain(row.delivery);
      expect(row.sections.map((section) => section.id)).toEqual([
        'listening',
        'reading',
        'writing',
        'speaking',
      ]);
      expect(row.testDayRules.length).toBeGreaterThan(0);
      expect(row.provenance).toBe(EXAM_FORMAT_PROVENANCE);
      for (const section of row.sections) {
        expect(section.durationMinutes).toBeGreaterThan(0);
        expect(section.rules.length).toBeGreaterThan(0);
        expect(section.format.length).toBeGreaterThan(0);
      }
    }
  });

  it('times the paper-based sitting at 2 hours 40 minutes with a transfer window', () => {
    const row = examTestDayConfig('academic', 'paper');
    expect(row.label).toBe('Academic — paper-based');
    expect(row.sittingMinutes).toBe(160);
    const listening = row.sections.find((section) => section.id === 'listening');
    expect(listening?.afterMinutes).toBe(10);
    expect(listening?.afterLabel).toBe('transfer time');
    expect(listening?.timingLabel).toBe('About 30 minutes plus 10 minutes transfer time');
    expect(listening?.rules.join(' ')).toContain('question paper');
  });

  it('replaces the transfer window with check time on computer delivery', () => {
    const row = examTestDayConfig('general-training', 'computer');
    expect(row.label).toBe('General Training — on computer');
    expect(row.sittingMinutes).toBe(152);
    const listening = row.sections.find((section) => section.id === 'listening');
    expect(listening?.afterMinutes).toBe(2);
    expect(listening?.afterLabel).toBe('check time');
    expect(listening?.rules.join(' ')).toContain('Type answers directly');
  });

  it('distinguishes the two reading papers', () => {
    const academic = examTestDayConfig('academic', 'paper').sections.find((s) => s.id === 'reading');
    const general = examTestDayConfig('general-training', 'paper').sections.find((s) => s.id === 'reading');
    expect(academic?.format[0]).toContain('Three long passages');
    expect(general?.format[0]).toContain('Section 1');
    expect(academic?.questions).toBe(40);
    expect(general?.questions).toBe(40);
  });

  it('asks for a letter in General Training Task 1 and a visual report in Academic', () => {
    const academic = examTestDayConfig('academic', 'paper').sections.find((s) => s.id === 'writing');
    const general = examTestDayConfig('general-training', 'paper').sections.find((s) => s.id === 'writing');
    expect(academic?.format[0]).toContain('visual information');
    expect(general?.format[0]).toContain('letter');
    expect(academic?.questions).toBe(2);
    expect(academic?.rules.join(' ')).toContain('twice the weight');
  });

  it('keeps the speaking test range-timed and outside the fixed papers', () => {
    const speaking = examTestDayConfig('academic', 'paper').sections.find((s) => s.id === 'speaking');
    expect(speaking?.questions).toBeNull();
    expect(speaking?.timingLabel).toBe('11-14 minutes');
    expect(speaking?.afterMinutes).toBe(0);
    expect(speaking?.rules.join(' ')).toContain('seven days');
  });

  it('names the extra listening time per delivery mode', () => {
    expect(listeningAfter('paper')).toEqual({ minutes: 10, label: 'transfer time' });
    expect(listeningAfter('computer')).toEqual({ minutes: 2, label: 'check time' });
  });
});
