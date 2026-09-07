/**
 * Indicative rule-based writing scores.
 *
 * The scorer maps a writing sample onto four 0-100 criterion subscores — task
 * response, coherence and cohesion, lexical resource, grammatical range — and
 * then onto an indicative band range. The rules adapt the transparent
 * rule-based scorer of `Iamdacai/ielts-vocab-system` (length and framing for
 * task response, discourse markers and paragraphing for coherence, lexical
 * diversity for vocabulary, sentence-length control and subordination for
 * grammar; overall as the mean of the four; fixed 0-100 to band-range bands),
 * with one substitution: where the reference scorer counts matches against a
 * hard-coded advanced-word list, this scorer measures Cambridge IELTS headword
 * coverage from `/v1/vocabulary`, grounding "advanced vocabulary" in the
 * project's own dataset instead of seventeen English words.
 *
 * Every subscore starts at 50 and adds documented points for measured
 * features, clamped at 100. The band ranges are indicative only — a heuristic
 * projection, not an examiner judgement — and every response carrying them
 * says so.
 */

import { TASK_MINIMUM_WORDS, countLinkers, headwordCoverage } from './analysis.js';
import { baseProfile, round2, sentencesOf, wordsOf } from './textstats.js';

import type { WritingCriterionScore, WritingScore } from '../types.js';

/** Introduction markers counted by the task-response framing rule. */
export const INTRO_MARKERS: readonly string[] = ['i think', 'in my opinion', 'this essay'];

/** Conclusion markers counted by the task-response framing rule. */
export const CONCLUSION_MARKERS: readonly string[] = ['in conclusion', 'to conclude', 'overall'];

/** Subordination markers counted by the grammatical-range rule. */
export const SUBORDINATORS: readonly string[] = [
  'which',
  'that',
  'who',
  'whom',
  'whose',
  'although',
  'because',
  'if',
  'when',
  'while',
];

/** Criterion identifiers, in band-descriptor order. */
export const WRITING_CRITERIA: readonly WritingCriterionScore['criterion'][] = [
  'task-response',
  'coherence-and-cohesion',
  'lexical-resource',
  'grammatical-range',
];

/**
 * Whether any marker appears in lower-cased text as a whole-word match.
 *
 * @param lower - Lower-cased text.
 * @param markers - Markers to look for.
 */
export function hasMarker(lower: string, markers: readonly string[]): boolean {
  return markers.some((marker) => lower.includes(marker));
}

/**
 * Count subordination-marker occurrences in text.
 *
 * @param text - Raw text.
 */
export function countSubordinators(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const marker of SUBORDINATORS) {
    count += (lower.match(new RegExp(`\\b${marker}\\b`, 'g')) ?? []).length;
  }
  return count;
}

/**
 * Task-response subscore: length against the task minimum (0-30) plus essay
 * framing (0-20): both an introduction and a conclusion marker score 20, one
 * of the two scores 10.
 *
 * @param words - Running words.
 * @param minimumWords - Task minimum.
 * @param intro - Whether an introduction marker was found.
 * @param conclusion - Whether a conclusion marker was found.
 */
export function scoreTaskResponse(
  words: number,
  minimumWords: number,
  intro: boolean,
  conclusion: boolean,
): number {
  let score = 50;
  if (words >= minimumWords) {
    score += 30;
  } else if (words >= minimumWords * 0.8) {
    score += 20;
  } else if (words >= minimumWords * 0.6) {
    score += 10;
  }
  if (intro && conclusion) {
    score += 20;
  } else if (intro || conclusion) {
    score += 10;
  }
  return Math.min(100, score);
}

/**
 * Coherence-and-cohesion subscore: discourse markers (0-30) plus paragraph
 * structure (0-20).
 *
 * @param linkers - Discourse-marker occurrences.
 * @param paragraphs - Paragraph count.
 */
export function scoreCoherenceCohesion(linkers: number, paragraphs: number): number {
  let score = 50;
  if (linkers >= 10) {
    score += 30;
  } else if (linkers >= 5) {
    score += 20;
  } else if (linkers >= 3) {
    score += 10;
  }
  if (paragraphs >= 4) {
    score += 20;
  } else if (paragraphs >= 3) {
    score += 15;
  } else if (paragraphs >= 2) {
    score += 10;
  }
  return Math.min(100, score);
}

/**
 * Lexical-resource subscore: type-token ratio (0-30) plus Cambridge headword
 * coverage (0-20).
 *
 * @param typeTokenRatio - Distinct tokens over running tokens.
 * @param coverage - Share of tokens found in the Cambridge headword list.
 */
export function scoreLexicalResource(typeTokenRatio: number, coverage: number): number {
  let score = 50;
  if (typeTokenRatio >= 0.7) {
    score += 30;
  } else if (typeTokenRatio >= 0.5) {
    score += 20;
  } else if (typeTokenRatio >= 0.3) {
    score += 10;
  }
  if (coverage >= 0.3) {
    score += 20;
  } else if (coverage >= 0.2) {
    score += 15;
  } else if (coverage >= 0.12) {
    score += 10;
  }
  return Math.min(100, score);
}

/**
 * Grammatical-range subscore: average sentence length (0-25), sentence-length
 * variation (0-25) and subordination density (0-25).
 *
 * @param avgLength - Mean words per sentence.
 * @param variation - Longest minus shortest sentence, in words.
 * @param subordinators - Subordination-marker occurrences.
 */
export function scoreGrammaticalRange(avgLength: number, variation: number, subordinators: number): number {
  let score = 50;
  if (avgLength >= 15 && avgLength <= 25) {
    score += 25;
  } else if (avgLength >= 10 && avgLength <= 30) {
    score += 15;
  }
  if (variation >= 15) {
    score += 25;
  } else if (variation >= 8) {
    score += 15;
  }
  if (subordinators >= 5) {
    score += 25;
  } else if (subordinators >= 3) {
    score += 15;
  } else if (subordinators >= 1) {
    score += 10;
  }
  return Math.min(100, score);
}

/**
 * Map a 0-100 overall onto an indicative band range.
 *
 * @param overall - Mean of the four subscores.
 */
export function bandForScore(overall: number): { min: number | null; max: number | null; label: string } {
  if (overall >= 90) {
    return { min: 8.5, max: 9, label: '8.5-9.0' };
  }
  if (overall >= 80) {
    return { min: 7.5, max: 8, label: '7.5-8.0' };
  }
  if (overall >= 70) {
    return { min: 6.5, max: 7, label: '6.5-7.0' };
  }
  if (overall >= 60) {
    return { min: 5.5, max: 6, label: '5.5-6.0' };
  }
  if (overall >= 50) {
    return { min: 4.5, max: 5, label: '4.5-5.0' };
  }
  if (overall >= 40) {
    return { min: 3.5, max: 4, label: '3.5-4.0' };
  }
  return { min: null, max: 3, label: '3.0 or below' };
}

/** Overall below which a criterion needs work. */
export const SCORE_IMPROVE_BELOW = 60;

/** Overall at or above which a criterion counts as a strength. */
export const SCORE_STRENGTH_AT = 70;

/**
 * Strength and improvement messages for four subscores.
 *
 * Criteria at 70 or above contribute a strength; criteria below 60 contribute
 * an improvement. Both lists carry a fallback so they are never empty.
 *
 * @param scores - The four subscores in band-descriptor order.
 */
export function writingFeedback(scores: readonly [number, number, number, number]): {
  strengths: string[];
  improvements: string[];
} {
  const [taskResponse, coherence, lexical, grammar] = scores;
  const strengths: string[] = [];
  const improvements: string[] = [];
  if (taskResponse >= SCORE_STRENGTH_AT) {
    strengths.push('Clear position and developed argument with sufficient length.');
  } else if (taskResponse < SCORE_IMPROVE_BELOW) {
    improvements.push('Expand the argument with examples and meet the task word minimum.');
  }
  if (coherence >= SCORE_STRENGTH_AT) {
    strengths.push('Well-paragraphed response with natural signposting.');
  } else if (coherence < SCORE_IMPROVE_BELOW) {
    improvements.push('Paragraph the response and link ideas with discourse markers.');
  }
  if (lexical >= SCORE_STRENGTH_AT) {
    strengths.push('Wide, precise vocabulary with strong topic words.');
  } else if (lexical < SCORE_IMPROVE_BELOW) {
    improvements.push('Vary word choice and build topic vocabulary from /v1/topics/themes.');
  }
  if (grammar >= SCORE_STRENGTH_AT) {
    strengths.push('Accurate grammar with a mix of simple and complex sentences.');
  } else if (grammar < SCORE_IMPROVE_BELOW) {
    improvements.push('Combine short sentences with relative clauses and conditionals.');
  }
  if (strengths.length === 0) {
    strengths.push('The response addresses the task; build on the strongest criterion first.');
  }
  if (improvements.length === 0) {
    improvements.push('Maintain the current level and polish the weakest criterion.');
  }
  return { strengths, improvements };
}

/**
 * Score a validated writing sample.
 *
 * @param text - Raw text with at least one word.
 * @param task - Writing task the text was written for.
 */
export function scoreWriting(text: string, task: 'task1' | 'task2'): WritingScore {
  const tokens = wordsOf(text);
  const sentences = sentencesOf(text);
  const lengths = sentences.map((sentence) => wordsOf(sentence).length);
  const profile = baseProfile(text, tokens, sentences);
  const lower = text.toLowerCase();
  const intro = hasMarker(lower, INTRO_MARKERS);
  const conclusion = hasMarker(lower, CONCLUSION_MARKERS);
  const linkers = countLinkers(text);
  const coverage = headwordCoverage(tokens);
  const subordinators = countSubordinators(text);
  const typeTokenRatio = round2(new Set(tokens).size / tokens.length);
  const minimumWords = TASK_MINIMUM_WORDS[task];
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);

  const taskResponse = scoreTaskResponse(tokens.length, minimumWords, intro, conclusion);
  const coherence = scoreCoherenceCohesion(linkers, profile.paragraphs);
  const lexical = scoreLexicalResource(typeTokenRatio, coverage.coverage);
  const grammar = scoreGrammaticalRange(profile.avgWordsPerSentence, longest - shortest, subordinators);
  const criteria: WritingCriterionScore[] = [
    {
      criterion: 'task-response',
      score: taskResponse,
      evidence: {
        words: tokens.length,
        minimumWords,
        introductionFraming: intro,
        conclusionFraming: conclusion,
      },
    },
    {
      criterion: 'coherence-and-cohesion',
      score: coherence,
      evidence: { linkers, paragraphs: profile.paragraphs },
    },
    {
      criterion: 'lexical-resource',
      score: lexical,
      evidence: {
        typeTokenRatio,
        headwordCoverage: coverage.coverage,
        headwordTokens: coverage.headwordTokens,
      },
    },
    {
      criterion: 'grammatical-range',
      score: grammar,
      evidence: {
        avgSentenceLength: profile.avgWordsPerSentence,
        sentenceLengthSpread: longest - shortest,
        subordinators,
        sentences: sentences.length,
      },
    },
  ];
  const overall = Math.round((taskResponse + coherence + lexical + grammar) / 4);
  const feedback = writingFeedback([taskResponse, coherence, lexical, grammar]);
  return {
    task,
    wordCount: tokens.length,
    minimumWords,
    meetsMinimum: tokens.length >= minimumWords,
    criteria,
    overall,
    indicativeBand: bandForScore(overall),
    strengths: feedback.strengths,
    improvements: feedback.improvements,
  };
}
