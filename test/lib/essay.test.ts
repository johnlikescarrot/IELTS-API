import { describe, expect, it } from 'vitest';

import {
  COHESIVE_DEVICES,
  MINIMUM_WORDS,
  SUGGESTED_MINUTES,
  analyseCohesion,
  analyseEssay,
} from '../../src/lib/essay.js';

/** A long, well-structured response used to exercise the "strong" branches. */
const STRONG = [
  'Firstly, contemporary governments confront an unavoidable tension between fiscal restraint and the',
  'expanding obligations of a modern welfare state, and this tension shapes almost every debate about',
  'public expenditure. Proponents of higher investment argue that infrastructure, healthcare provision',
  'and universal education generate compounding returns; critics reply that taxation suppresses',
  'entrepreneurial activity. However, the empirical literature suggests a more nuanced picture.',
  'For example, longitudinal studies of Scandinavian economies indicate that generous social provision',
  'coexists comfortably with competitive private industry, because predictable institutions reduce risk.',
  'Moreover, redistribution demonstrably narrows attainment gaps in schooling, which subsequently',
  'increases aggregate productivity. Nevertheless, poorly designed subsidies entrench inefficiency,',
  'and therefore the design of a programme matters considerably more than its headline expenditure.',
  'Admittedly, no government possesses unlimited resources, so prioritisation remains unavoidable.',
  'In contrast to blanket austerity, targeted intervention preserves capability while restraining waste.',
  'Consequently, policymakers should evaluate programmes individually rather than ideologically.',
  'To illustrate, means-tested childcare subsidies raise female labour-force participation dramatically,',
  'whereas untargeted fuel subsidies overwhelmingly benefit wealthier households who consume more energy.',
  'In conclusion, the productive question is not whether the state should spend, but how intelligently',
  'it allocates finite revenue across competing and genuinely worthwhile social priorities. Balance wins.',
].join(' ');

const WEAK = 'I like study. I like study a lot. Study is good. I like it.';

describe('constants', () => {
  it('publishes the official minimum word counts and time budgets', () => {
    expect(MINIMUM_WORDS['task-1']).toBe(150);
    expect(MINIMUM_WORDS['task-2']).toBe(250);
    expect(SUGGESTED_MINUTES['task-1']).toBe(20);
    expect(SUGGESTED_MINUTES['task-2']).toBe(40);
  });

  it('groups cohesive devices by discourse function', () => {
    expect(Object.keys(COHESIVE_DEVICES)).toContain('contrast');
    expect(COHESIVE_DEVICES.conclusion).toContain('in conclusion');
  });
});

describe('analyseCohesion', () => {
  it('counts devices and the functions they represent', () => {
    const report = analyseCohesion(
      'However, prices rose. For example, rent doubled. In conclusion, act now.',
    );
    expect(report.total).toBe(3);
    expect(report.distinct).toBe(3);
    expect(report.functions).toBe(3);
    expect(report.devices).toEqual(['for example', 'however', 'in conclusion']);
  });

  it('counts repeated devices', () => {
    expect(analyseCohesion('However, yes. However, no.').total).toBe(2);
  });

  it('respects word boundaries', () => {
    const report = analyseCohesion('The alsatian barked at the thusness of it.');
    expect(report.total).toBe(0);
  });

  it('returns an empty report for empty text', () => {
    const report = analyseCohesion('');
    expect(report).toMatchObject({ total: 0, distinct: 0, functions: 0, devices: [] });
  });
});

describe('analyseEssay', () => {
  it('reports the task, the minimum length and whether it is met', () => {
    const report = analyseEssay(WEAK, 'task-2');
    expect(report.task).toBe('task-2');
    expect(report.minimumWords).toBe(250);
    expect(report.meetsMinimumLength).toBe(false);
    expect(report.suggestedMinutes).toBe(40);
  });

  it('scores every rubric dimension with its evidence', () => {
    const report = analyseEssay(STRONG, 'task-2');
    expect(report.dimensions).toHaveLength(4);
    for (const dimension of report.dimensions) {
      expect(dimension.band).toBeGreaterThanOrEqual(0);
      expect(dimension.band).toBeLessThanOrEqual(9);
      expect(dimension.evidence.length).toBeGreaterThan(10);
    }
    const weights = report.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    expect(weights).toBeCloseTo(1, 10);
  });

  it('rates a developed response above a repetitive one', () => {
    expect(analyseEssay(STRONG, 'task-2').indicativeBand).toBeGreaterThan(
      analyseEssay(WEAK, 'task-2').indicativeBand,
    );
  });

  it('always reports a half-band value in range', () => {
    for (const text of [STRONG, WEAK, 'x']) {
      const band = analyseEssay(text, 'task-1').indicativeBand;
      expect(band % 0.5).toBe(0);
      expect(band).toBeGreaterThanOrEqual(0);
      expect(band).toBeLessThanOrEqual(9);
    }
  });

  it('gives targeted suggestions for a weak response', () => {
    const suggestions = analyseEssay(WEAK, 'task-2').suggestions.join(' ');
    expect(suggestions).toContain('250 words');
    expect(suggestions).toContain('MTLD');
    expect(suggestions).toContain('Vary sentence length');
    expect(suggestions).toContain('Signpost');
    expect(suggestions).toContain('simple prose');
  });

  it('flags over-long sentences', () => {
    const rambling = `${Array.from({ length: 60 }, (_unused, index) => `word${String(index)}`).join(' ')}.`;
    expect(analyseEssay(rambling, 'task-2').suggestions.join(' ')).toContain('longest sentence');
  });

  it('congratulates a response with no surface-level problems', () => {
    const report = analyseEssay(`${STRONG} ${STRONG}`, 'task-1');
    expect(report.suggestions.join(' ')).toContain('argument development');
  });

  it('always attaches the disclaimer', () => {
    expect(analyseEssay(STRONG, 'task-2').disclaimer).toContain('not an IELTS score');
  });

  it('penalises a grossly over-length response relative to an on-target one', () => {
    const onTarget = analyseEssay(STRONG, 'task-1').dimensions[0]?.band ?? 0;
    const bloated = analyseEssay(`${STRONG} ${STRONG} ${STRONG}`, 'task-1').dimensions[0]?.band ?? 0;
    expect(bloated).toBeLessThan(onTarget);
  });
});
