/**
 * Phonetics and retention toolkit.
 *
 * Two lightweight, dependency-free analysers added for the learning-science
 * pack: a phonetic report that surfaces syllable structure and a heuristic
 * difficulty label, and a simulation that projects retained vocabulary over a
 * multi-day schedule with Ebbinghaus decay.
 */

import { findWord } from '../data/vocabulary.js';
import { syllablesOf, wordsOf } from './textstats.js';
import { retentionCurve } from './srs.js';

import type { PhoneticsReport, RetentionPoint, SimulationPoint } from '../types.js';

/** Count maximal consonant clusters in one lower-cased token. */
function consonantClustersOf(token: string): number {
  const matches = token.toLowerCase().match(/[^aeiouy]+/g);
  if (matches === null) return 0;
  return matches.filter((cluster) => cluster.length >= 2).length;
}

/** Count vowel groups in one lower-cased token. */
function vowelGroupsOf(token: string): number {
  const matches = token.toLowerCase().match(/[aeiouy]+/g);
  return matches === null ? 0 : matches.length;
}

/**
 * Analyse the phonetic structure of a word or short phrase.
 *
 * @param input - Raw text (1-200 characters).
 */
export function analysePhonetics(input: string): PhoneticsReport {
  const tokens = wordsOf(input);
  const details = tokens.map((token) => {
    const phonetic = findWord(token)?.phonetic ?? null;
    return {
      token,
      syllables: syllablesOf(token),
      phonetic,
      consonantClusters: consonantClustersOf(token),
      vowelGroups: vowelGroupsOf(token),
    };
  });
  const totalSyllables = details.reduce((sum, detail) => sum + detail.syllables, 0);
  const avgSyllables = details.length === 0 ? 0 : Math.round((totalSyllables / details.length) * 100) / 100;
  let difficulty: string;
  if (totalSyllables <= 2) difficulty = 'easy';
  else if (totalSyllables <= 4) difficulty = 'moderate';
  else if (details.some((detail) => detail.consonantClusters >= 2)) difficulty = 'hard (consonant-dense)';
  else difficulty = 'hard (polysyllabic)';
  return { input, tokens, details, totalSyllables, avgSyllables, difficulty };
}

/**
 * Simulate cumulative learning with daily new words and Ebbinghaus forgetting.
 *
 * Each day `newPerDay` new words are introduced; retention for words due for
 * review is `retentionCurve(strength, daysSinceReview)[daysSinceReview-1]`.
 * The simulation aggregates due reviews deterministically and reports retained.
 *
 * @param newPerDay - New words per day (1-50).
 * @param days - Horizon in days (1-120).
 * @param strength - Memory stability S in days (1-365).
 * @param retentionThreshold - Fraction below which a word is considered not retained (0-1).
 */
export function simulateLearning(
  newPerDay: number,
  days: number,
  strength: number,
  retentionThreshold: number,
): SimulationPoint[] {
  if (!Number.isInteger(newPerDay) || newPerDay < 1 || newPerDay > 50) {
    throw new Error('newPerDay must be between 1 and 50');
  }
  if (!Number.isInteger(days) || days < 1 || days > 120) {
    throw new Error('days must be between 1 and 120');
  }
  const curve: RetentionPoint[] = retentionCurve(strength, days);
  const points: SimulationPoint[] = [];
  let newWords = 0;
  let reviews = 0;
  for (let day = 0; day <= days; day += 1) {
    if (day > 0) newWords += newPerDay;
    // Reviews due: words introduced earlier whose retention just dropped below threshold
    // Simplified: due = newPerDay * 0.6 (40% assumed retained without review) then decay.
    const due = day === 0 ? 0 : Math.round(newPerDay * 0.6 + (day > 1 ? newPerDay * 0.2 : 0));
    if (day > 0) reviews += due;
    // Retained: sum over cohorts of retention at age
    let retained = 0;
    for (let cohort = 1; cohort <= day; cohort += 1) {
      const age = day - cohort + 1;
      const retention = curve[age - 1]!.retention;
      retained += newPerDay * (retentionThreshold <= retention ? 1 : retention);
    }
    points.push({
      day,
      newWords,
      due,
      reviews,
      retained: Math.round(retained),
    });
  }
  return points;
}
