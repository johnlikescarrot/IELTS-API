/**
 * Classical readability formulas, computed from a single shared segmentation.
 *
 * Six formulas are reported rather than one. They disagree — deliberately so:
 * each was calibrated on a different population (US school grades, military
 * manuals, adult prose), and reporting the spread is more honest than
 * publishing a single number as if it were a measurement. Every formula below
 * cites the source it implements, and every input comes from
 * {@link analyseText}, so results are reproducible across releases.
 *
 * References:
 *
 * - Flesch, R. (1948). A new readability yardstick. *Journal of Applied
 *   Psychology*, 32(3), 221-233.
 * - Kincaid, J. P., Fishburne, R. P., Rogers, R. L., & Chissom, B. S. (1975).
 *   *Derivation of new readability formulas for Navy enlisted personnel*.
 * - Gunning, R. (1952). *The Technique of Clear Writing*.
 * - McLaughlin, G. H. (1969). SMOG grading: a new readability formula.
 *   *Journal of Reading*, 12(8), 639-646.
 * - Coleman, M., & Liau, T. L. (1975). A computer readability formula designed
 *   for machine scoring. *Journal of Applied Psychology*, 60(2), 283-284.
 * - Smith, E. A., & Senter, R. J. (1967). *Automated readability index*.
 */

import { analyseText, round } from './text.js';

import type { TextStats } from './text.js';

/** One readability score with the provenance needed to cite it. */
export type ReadabilityScore = {
  /** Machine-readable identifier. */
  id: string;
  /** Published name of the formula. */
  name: string;
  /** Computed value. */
  value: number;
  /** What the number means (a US grade level, or a 0-100 ease score). */
  unit: 'grade-level' | 'ease-0-100';
  /** Short interpretation of this particular value. */
  interpretation: string;
  /** Bibliographic source of the formula. */
  reference: string;
};

/**
 * Describe a US grade-level score in plain language.
 *
 * @param grade - Grade-level value.
 * @returns A one-line interpretation.
 */
export function describeGrade(grade: number): string {
  if (grade < 6) {
    return 'Very easy: readable by an average 11-year-old.';
  }
  if (grade < 9) {
    return 'Easy: readable at lower-secondary level.';
  }
  if (grade < 13) {
    return 'Moderate: typical of upper-secondary and general-interest prose.';
  }
  if (grade < 16) {
    return 'Difficult: undergraduate level.';
  }
  return 'Very difficult: postgraduate or specialist level.';
}

/**
 * Describe a Flesch Reading Ease value in plain language.
 *
 * @param ease - Reading-ease value (nominally 0-100).
 * @returns A one-line interpretation.
 */
export function describeEase(ease: number): string {
  if (ease >= 80) {
    return 'Very easy to read.';
  }
  if (ease >= 60) {
    return 'Plain English, easily understood by most readers.';
  }
  if (ease >= 30) {
    return 'Fairly difficult; typical of academic prose.';
  }
  return 'Very difficult; dense academic or legal register.';
}

/**
 * Flesch Reading Ease (Flesch, 1948). Higher is easier.
 *
 * @param stats - Text counts.
 */
export function fleschReadingEase(stats: TextStats): number {
  return 206.835 - 1.015 * stats.wordsPerSentence - 84.6 * stats.syllablesPerWord;
}

/**
 * Flesch-Kincaid Grade Level (Kincaid et al., 1975).
 *
 * @param stats - Text counts.
 */
export function fleschKincaidGrade(stats: TextStats): number {
  return 0.39 * stats.wordsPerSentence + 11.8 * stats.syllablesPerWord - 15.59;
}

/**
 * Gunning Fog index (Gunning, 1952).
 *
 * @param stats - Text counts.
 */
export function gunningFog(stats: TextStats): number {
  const complexRatio = stats.words === 0 ? 0 : stats.complexWords / stats.words;
  return 0.4 * (stats.wordsPerSentence + 100 * complexRatio);
}

/**
 * SMOG grade (McLaughlin, 1969).
 *
 * The published formula samples 30 sentences; the standard generalisation used
 * here rescales the polysyllable count to a 30-sentence equivalent, so the
 * index is defined for texts of any length.
 *
 * @param stats - Text counts.
 */
export function smogIndex(stats: TextStats): number {
  const scaled = stats.complexWords * (30 / stats.sentences);
  return 1.043 * Math.sqrt(scaled) + 3.1291;
}

/**
 * Coleman-Liau index (Coleman & Liau, 1975).
 *
 * @param stats - Text counts.
 */
export function colemanLiauIndex(stats: TextStats): number {
  if (stats.words === 0) {
    return 0;
  }
  const lettersPer100 = (stats.letters / stats.words) * 100;
  const sentencesPer100 = (stats.sentences / stats.words) * 100;
  return 0.0588 * lettersPer100 - 0.296 * sentencesPer100 - 15.8;
}

/**
 * Automated Readability Index (Smith & Senter, 1967).
 *
 * @param stats - Text counts.
 */
export function automatedReadabilityIndex(stats: TextStats): number {
  return 4.71 * stats.lettersPerWord + 0.5 * stats.wordsPerSentence - 21.43;
}

/** The full readability report for one text. */
export type ReadabilityReport = {
  /** Counts the scores were derived from. */
  stats: TextStats;
  /** One entry per formula. */
  scores: ReadabilityScore[];
  /** Mean of the five grade-level formulas. */
  consensusGrade: number;
  /** Interpretation of {@link ReadabilityReport.consensusGrade}. */
  consensus: string;
};

/**
 * Compute every readability formula for a text.
 *
 * @param text - Normalised input text.
 * @returns The full report, including the grade-level consensus.
 */
export function readability(text: string): ReadabilityReport {
  const stats = analyseText(text);
  const grades: { id: string; name: string; value: number; reference: string }[] = [
    {
      id: 'flesch-kincaid-grade',
      name: 'Flesch-Kincaid Grade Level',
      value: fleschKincaidGrade(stats),
      reference: 'Kincaid et al. (1975)',
    },
    {
      id: 'gunning-fog',
      name: 'Gunning Fog Index',
      value: gunningFog(stats),
      reference: 'Gunning (1952)',
    },
    { id: 'smog', name: 'SMOG Grade', value: smogIndex(stats), reference: 'McLaughlin (1969)' },
    {
      id: 'coleman-liau',
      name: 'Coleman-Liau Index',
      value: colemanLiauIndex(stats),
      reference: 'Coleman & Liau (1975)',
    },
    {
      id: 'automated-readability-index',
      name: 'Automated Readability Index',
      value: automatedReadabilityIndex(stats),
      reference: 'Smith & Senter (1967)',
    },
  ];

  const scores: ReadabilityScore[] = grades.map((entry) => ({
    id: entry.id,
    name: entry.name,
    value: round(entry.value),
    unit: 'grade-level',
    interpretation: describeGrade(entry.value),
    reference: entry.reference,
  }));

  const ease = fleschReadingEase(stats);
  scores.unshift({
    id: 'flesch-reading-ease',
    name: 'Flesch Reading Ease',
    value: round(ease),
    unit: 'ease-0-100',
    interpretation: describeEase(ease),
    reference: 'Flesch (1948)',
  });

  const consensusGrade = grades.reduce((sum, entry) => sum + entry.value, 0) / grades.length;

  return {
    stats,
    scores,
    consensusGrade: round(consensusGrade),
    consensus: describeGrade(consensusGrade),
  };
}
