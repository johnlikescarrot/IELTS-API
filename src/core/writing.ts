import { COHESIVE_DEVICES, VOCABULARY } from '../data/vocabulary.ts';
import { roundToBand } from './bands.ts';
import { analyzeText, tokenize, type TextMetrics } from './text.ts';
import { requireEnum, requireString } from './validate.ts';

/** IELTS writing assessment criteria. */
export const WRITING_CRITERIA = [
  'taskAchievement',
  'coherenceAndCohesion',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
] as const;
/** Union of writing criteria keys. */
export type WritingCriterion = (typeof WRITING_CRITERIA)[number];

/** Result of {@link estimateWriting}. */
export interface WritingEstimate {
  task: 1 | 2;
  metrics: TextMetrics;
  criteria: Record<WritingCriterion, number>;
  estimatedBand: number;
  cohesiveDevicesUsed: string[];
  academicWordsUsed: string[];
  feedback: string[];
  disclaimer: string;
}

const DISCLAIMER =
  'Indicative only. This estimate is produced by a transparent, deterministic rubric over surface features and is not an official IELTS band score.';

const clampBand = (value: number): number => Math.min(9, Math.max(0, value));

const scale = (
  value: number,
  low: number,
  high: number,
  minBand: number,
  maxBand: number,
): number => {
  if (value <= low) return minBand;
  if (value >= high) return maxBand;
  return minBand + ((value - low) / (high - low)) * (maxBand - minBand);
};

/**
 * Produce a transparent, reproducible band estimate for a writing response.
 *
 * The rubric is intentionally simple and fully documented so that results can
 * be replicated exactly by other researchers:
 *
 * - **Task achievement** rewards meeting the word requirement and paragraphing.
 * - **Coherence and cohesion** rewards paragraph structure and discourse markers.
 * - **Lexical resource** rewards type-token ratio and academic vocabulary.
 * - **Grammatical range** rewards sentence length variation and subordination.
 */
export function estimateWriting(text: string, task: 1 | 2 = 2): WritingEstimate {
  const essay = requireString(text, 'text');
  const validTask = requireEnum(String(task), 'task', ['1', '2'] as const) === '1' ? 1 : 2;
  const metrics = analyzeText(essay);
  const minimumWords = validTask === 1 ? 150 : 250;
  const lower = essay.toLowerCase();

  const cohesiveDevicesUsed = COHESIVE_DEVICES.filter((device) => lower.includes(device));
  const words = new Set(tokenize(essay));
  const academicWordsUsed = VOCABULARY.filter((entry) =>
    words.has(entry.headword.toLowerCase()),
  ).map((entry) => entry.headword);

  const lengthRatio = metrics.words / minimumWords;
  const taskAchievement = clampBand(
    scale(lengthRatio, 0.4, 1.1, 3, 7) + (metrics.paragraphs >= 3 ? 0.5 : 0),
  );

  const coherenceAndCohesion = clampBand(
    scale(cohesiveDevicesUsed.length, 0, 8, 4, 7.5) +
      (metrics.paragraphs >= 4 ? 0.5 : metrics.paragraphs >= 2 ? 0.25 : 0),
  );

  const lexicalResource = clampBand(
    scale(metrics.typeTokenRatio, 0.3, 0.6, 4, 7.5) +
      scale(academicWordsUsed.length, 0, 6, 0, 1) +
      scale(metrics.longWordRatio, 0.05, 0.25, 0, 0.5),
  );

  const sentenceLengths = essay
    .split(/[.!?]+/)
    .map((sentence) => tokenize(sentence).length)
    .filter((length) => length > 0);
  const mean =
    sentenceLengths.reduce((sum, length) => sum + length, 0) / Math.max(1, sentenceLengths.length);
  const variance =
    sentenceLengths.reduce((sum, length) => sum + (length - mean) ** 2, 0) /
    Math.max(1, sentenceLengths.length);
  const subordinators = (
    lower.match(/\b(which|although|because|while|whereas|if|since|whose)\b/g) ?? []
  ).length;
  const grammaticalRangeAndAccuracy = clampBand(
    scale(Math.sqrt(variance), 2, 10, 4, 6.5) +
      scale(subordinators, 0, 8, 0, 1.5) +
      scale(metrics.averageWordsPerSentence, 8, 20, 0, 0.5),
  );

  const criteria: Record<WritingCriterion, number> = {
    taskAchievement: roundToBand(taskAchievement),
    coherenceAndCohesion: roundToBand(coherenceAndCohesion),
    lexicalResource: roundToBand(lexicalResource),
    grammaticalRangeAndAccuracy: roundToBand(grammaticalRangeAndAccuracy),
  };

  const average =
    WRITING_CRITERIA.reduce((sum, key) => sum + criteria[key], 0) / WRITING_CRITERIA.length;

  const feedback: string[] = [];
  if (metrics.words < minimumWords) {
    feedback.push(
      `Your response is ${metrics.words} words; Task ${validTask} requires at least ${minimumWords}. Under-length answers are penalised.`,
    );
  }
  if (metrics.paragraphs < 3) {
    feedback.push('Use at least three paragraphs: introduction, body, and conclusion.');
  }
  if (cohesiveDevicesUsed.length < 4) {
    feedback.push(
      'Add a wider range of cohesive devices to signal the structure of your argument.',
    );
  }
  if (metrics.typeTokenRatio < 0.4) {
    feedback.push('Vocabulary is repetitive; paraphrase key terms instead of repeating them.');
  }
  if (metrics.averageWordsPerSentence > 30) {
    feedback.push('Sentences are very long; break some up to protect grammatical accuracy.');
  }
  if (feedback.length === 0) {
    feedback.push('Surface features look healthy. Focus next on argument depth and accuracy.');
  }

  return {
    task: validTask,
    metrics,
    criteria,
    estimatedBand: roundToBand(average),
    cohesiveDevicesUsed,
    academicWordsUsed,
    feedback,
    disclaimer: DISCLAIMER,
  };
}
