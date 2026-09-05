import { describe, expect, it } from 'vitest';

import {
  automatedReadabilityIndex,
  colemanLiauIndex,
  describeEase,
  describeGrade,
  fleschKincaidGrade,
  fleschReadingEase,
  gunningFog,
  readability,
  smogIndex,
} from '../../src/lib/readability.js';
import { analyseText } from '../../src/lib/text.js';

const EASY = 'The cat sat on the mat. The dog ran fast. We had fun.';
const HARD =
  'The epistemological ramifications of institutionalised methodological individualism necessitate ' +
  'a comprehensive reconceptualisation of contemporary sociological paradigms.';

describe('describeGrade', () => {
  it.each([
    [3, 'Very easy'],
    [7, 'Easy'],
    [10, 'Moderate'],
    [14, 'Difficult'],
    [20, 'Very difficult'],
  ])('describes grade %i', (grade, expected) => {
    expect(describeGrade(grade)).toContain(expected);
  });

  it('uses inclusive lower bounds at each boundary', () => {
    expect(describeGrade(6)).toContain('Easy');
    expect(describeGrade(9)).toContain('Moderate');
    expect(describeGrade(13)).toContain('Difficult');
    expect(describeGrade(16)).toContain('Very difficult');
  });
});

describe('describeEase', () => {
  it.each([
    [90, 'Very easy'],
    [70, 'Plain English'],
    [45, 'Fairly difficult'],
    [10, 'Very difficult'],
  ])('describes ease %i', (ease, expected) => {
    expect(describeEase(ease)).toContain(expected);
  });

  it('uses inclusive lower bounds at each boundary', () => {
    expect(describeEase(80)).toContain('Very easy');
    expect(describeEase(60)).toContain('Plain English');
    expect(describeEase(30)).toContain('Fairly difficult');
  });
});

describe('formulas', () => {
  it('rates simple prose as easier than academic prose', () => {
    const easy = analyseText(EASY);
    const hard = analyseText(HARD);
    expect(fleschReadingEase(easy)).toBeGreaterThan(fleschReadingEase(hard));
    expect(fleschKincaidGrade(easy)).toBeLessThan(fleschKincaidGrade(hard));
    expect(gunningFog(easy)).toBeLessThan(gunningFog(hard));
    expect(smogIndex(easy)).toBeLessThan(smogIndex(hard));
    expect(colemanLiauIndex(easy)).toBeLessThan(colemanLiauIndex(hard));
    expect(automatedReadabilityIndex(easy)).toBeLessThan(automatedReadabilityIndex(hard));
  });

  it('reproduces the Flesch-Kincaid formula exactly', () => {
    const stats = analyseText(EASY);
    expect(fleschKincaidGrade(stats)).toBeCloseTo(
      0.39 * stats.wordsPerSentence + 11.8 * stats.syllablesPerWord - 15.59,
      10,
    );
  });

  it('returns finite values for wordless input', () => {
    const stats = analyseText('!!!');
    expect(Number.isFinite(fleschReadingEase(stats))).toBe(true);
    expect(gunningFog(stats)).toBe(0);
    expect(colemanLiauIndex(stats)).toBe(0);
    expect(Number.isFinite(automatedReadabilityIndex(stats))).toBe(true);
  });
});

describe('readability', () => {
  it('reports six formulas with reading ease first', () => {
    const report = readability(EASY);
    expect(report.scores).toHaveLength(6);
    expect(report.scores[0]?.id).toBe('flesch-reading-ease');
    expect(report.scores[0]?.unit).toBe('ease-0-100');
    expect(report.scores.slice(1).every((score) => score.unit === 'grade-level')).toBe(true);
  });

  it('cites a source for every formula', () => {
    for (const score of readability(EASY).scores) {
      expect(score.reference).toMatch(/\(\d{4}\)/u);
      expect(score.interpretation.length).toBeGreaterThan(0);
    }
  });

  it('averages only the five grade-level formulas for the consensus', () => {
    const report = readability(HARD);
    const grades = report.scores.filter((score) => score.unit === 'grade-level');
    const mean = grades.reduce((sum, score) => sum + score.value, 0) / grades.length;
    expect(report.consensusGrade).toBeCloseTo(mean, 1);
    expect(report.consensus).toBe(describeGrade(report.consensusGrade));
  });

  it('exposes the counts the scores were derived from', () => {
    expect(readability(EASY).stats.words).toBe(analyseText(EASY).words);
  });

  it('is deterministic', () => {
    expect(readability(HARD)).toEqual(readability(HARD));
  });
});
