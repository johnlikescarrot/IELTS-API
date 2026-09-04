import bandScoresData from '../data/bandScores.json';
import { RawScoreBandItem, CefrMappingItem } from '../types';

export type TestType = 'academicReading' | 'generalTrainingReading' | 'listening';

export interface RawScoreResult {
  rawScore: number;
  testType: TestType;
  bandScore: number;
  scaleDescription: string;
}

export interface OverallScoreResult {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  exactAverage: number;
  overallBandScore: number;
  cefrLevel: string;
  cefrDescription: string;
  skillBreakdown: {
    skill: string;
    score: number;
    bandDescription: string;
  }[];
}

export interface TargetPlannerResult {
  targetOverall: number;
  minimumRequiredSum: number;
  currentSum: number;
  providedSkillsCount: number;
  remainingSkillsCount: number;
  requiredAverageForRemaining: number | null;
  achievable: boolean;
  notes: string;
}

export interface ClbScoreResult {
  reading: { ieltsScore: number; clbLevel: number };
  writing: { ieltsScore: number; clbLevel: number };
  listening: { ieltsScore: number; clbLevel: number };
  speaking: { ieltsScore: number; clbLevel: number };
  minimumClbLevel: number;
  expressEntryEligible: boolean;
}

export function rawToBandScore(rawScore: number, testType: TestType): RawScoreResult {
  if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore < 0 || rawScore > 40) {
    throw new Error('Raw score must be a number between 0 and 40.');
  }

  const table: RawScoreBandItem[] = bandScoresData[testType] || [];
  const match = table.find((item) => rawScore >= item.rawScoreMin && rawScore <= item.rawScoreMax);
  const band = match ? match.bandScore : 0.0;

  const descriptions: Record<TestType, string> = {
    academicReading: 'IELTS Academic Reading (40 Questions)',
    generalTrainingReading: 'IELTS General Training Reading (40 Questions)',
    listening: 'IELTS Listening (40 Questions)'
  };

  return {
    rawScore,
    testType,
    bandScore: band,
    scaleDescription: descriptions[testType] || testType
  };
}

export function roundIeltsBandScore(rawAverage: number): number {
  if (rawAverage <= 0) return 0.0;
  if (rawAverage >= 9.0) return 9.0;

  const integerPart = Math.floor(rawAverage);
  const fraction = rawAverage - integerPart;

  // Official IELTS rounding rules:
  // fraction < 0.25 -> round down to integerPart
  // 0.25 <= fraction < 0.75 -> round to integerPart + 0.5
  // fraction >= 0.75 -> round up to integerPart + 1.0
  if (fraction < 0.25) {
    return integerPart;
  } else if (fraction < 0.75) {
    return integerPart + 0.5;
  } else {
    return integerPart + 1.0;
  }
}

export function getCefrMapping(bandScore: number): { cefrLevel: string; description: string } {
  const mappings: CefrMappingItem[] = bandScoresData.cefrMapping;
  const found = mappings.find((m) => bandScore >= m.bandScoreMin && bandScore <= m.bandScoreMax);
  if (found) {
    return { cefrLevel: found.cefrLevel, description: found.description };
  }
  return { cefrLevel: 'A1-A2', description: 'Basic User' };
}

export function getBandDescription(score: number): string {
  if (score >= 9.0) return 'Expert User - Fully operational command of the language';
  if (score >= 8.0)
    return 'Very Good User - Operational command with occasional unsystematic inaccuracies';
  if (score >= 7.0)
    return 'Good User - Operational command with occasional inaccuracies and misunderstandings';
  if (score >= 6.0)
    return 'Competent User - Effective command with inaccuracies and misunderstandings in unfamiliar situations';
  if (score >= 5.0)
    return 'Modest User - Partial command, copes with overall meaning in most situations';
  if (score >= 4.0) return 'Limited User - Basic competence limited to familiar situations';
  if (score >= 3.0)
    return 'Extremely Limited User - Conveys and understands only general meaning in very familiar situations';
  if (score >= 2.0)
    return 'Intermittent User - Great difficulty understanding spoken and written English';
  if (score >= 1.0) return 'Non-User - Essentially no ability to use the language';
  return 'Did not attempt the test';
}

export function calculateOverallBandScore(scores: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): OverallScoreResult {
  const { listening, reading, writing, speaking } = scores;
  const skills = [
    { name: 'listening', score: listening },
    { name: 'reading', score: reading },
    { name: 'writing', score: writing },
    { name: 'speaking', score: speaking }
  ];

  for (const s of skills) {
    if (typeof s.score !== 'number' || isNaN(s.score) || s.score < 0 || s.score > 9) {
      throw new Error(`Score for ${s.name} must be a number between 0.0 and 9.0.`);
    }
    // Subscores must be valid band increments (multiples of 0.5)
    if (Math.round(s.score * 2) !== s.score * 2) {
      throw new Error(`Score for ${s.name} must be in increments of 0.5 (e.g. 6.0, 6.5, 7.0).`);
    }
  }

  const sum = listening + reading + writing + speaking;
  const exactAverage = Math.round((sum / 4) * 1000) / 1000;
  const overallBandScore = roundIeltsBandScore(exactAverage);
  const cefr = getCefrMapping(overallBandScore);

  const skillBreakdown = skills.map((s) => ({
    skill: s.name.charAt(0).toUpperCase() + s.name.slice(1),
    score: s.score,
    bandDescription: getBandDescription(s.score)
  }));

  return {
    listening,
    reading,
    writing,
    speaking,
    exactAverage,
    overallBandScore,
    cefrLevel: cefr.cefrLevel,
    cefrDescription: cefr.description,
    skillBreakdown
  };
}

export function calculateTargetPlanner(
  targetOverall: number,
  knownScores: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  }
): TargetPlannerResult {
  if (
    typeof targetOverall !== 'number' ||
    isNaN(targetOverall) ||
    targetOverall < 1 ||
    targetOverall > 9
  ) {
    throw new Error('Target overall score must be a number between 1.0 and 9.0.');
  }

  const minAverageRequired = targetOverall - 0.25;
  const minimumRequiredSum = Math.max(0, minAverageRequired * 4);

  const entries = Object.entries(knownScores).filter(
    ([, val]) => typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 9
  );

  const providedSkillsCount = entries.length;
  const currentSum = entries.reduce((acc, [, val]) => acc + (val as number), 0);
  const remainingSkillsCount = 4 - providedSkillsCount;

  if (remainingSkillsCount === 0) {
    const avg = currentSum / 4;
    const achievedBand = roundIeltsBandScore(avg);
    const achievable = achievedBand >= targetOverall;
    return {
      targetOverall,
      minimumRequiredSum,
      currentSum,
      providedSkillsCount: 4,
      remainingSkillsCount: 0,
      requiredAverageForRemaining: null,
      achievable,
      notes: achievable
        ? `Target achieved! Your current scores result in Band ${achievedBand}.`
        : `Your current scores result in Band ${achievedBand}, which is below target ${targetOverall}.`
    };
  }

  const neededSum = minimumRequiredSum - currentSum;
  const requiredAverage = Math.max(0, neededSum / remainingSkillsCount);
  const achievable = requiredAverage <= 9.0;

  return {
    targetOverall,
    minimumRequiredSum,
    currentSum,
    providedSkillsCount,
    remainingSkillsCount,
    requiredAverageForRemaining: Math.round(requiredAverage * 100) / 100,
    achievable,
    notes: achievable
      ? `You need an average of ${Math.round(requiredAverage * 100) / 100} across the remaining ${remainingSkillsCount} skill(s) to reach overall Band ${targetOverall}.`
      : `Target Band ${targetOverall} is mathematically unachievable with the provided scores.`
  };
}

export function convertToCLB(scores: {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
}): ClbScoreResult {
  const getSkillClb = (
    skill: 'reading' | 'writing' | 'listening' | 'speaking',
    score: number
  ): number => {
    const mappings: { clb: number; minScore: number }[] = bandScoresData.clbMapping[skill];
    for (const m of mappings) {
      if (score >= m.minScore) {
        return m.clb;
      }
    }
    return score >= 3.0 ? 3 : 0;
  };

  const readingClb = getSkillClb('reading', scores.reading);
  const writingClb = getSkillClb('writing', scores.writing);
  const listeningClb = getSkillClb('listening', scores.listening);
  const speakingClb = getSkillClb('speaking', scores.speaking);

  const minClb = Math.min(readingClb, writingClb, listeningClb, speakingClb);

  return {
    reading: { ieltsScore: scores.reading, clbLevel: readingClb },
    writing: { ieltsScore: scores.writing, clbLevel: writingClb },
    listening: { ieltsScore: scores.listening, clbLevel: listeningClb },
    speaking: { ieltsScore: scores.speaking, clbLevel: speakingClb },
    minimumClbLevel: minClb,
    expressEntryEligible: minClb >= 7
  };
}
