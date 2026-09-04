import { Request, Response, NextFunction } from 'express';
import {
  calculateOverallBandScore,
  rawToBandScore,
  calculateTargetPlanner,
  convertToCLB,
  TestType
} from '../utils/bandCalculator';
import bandScoresData from '../data/bandScores.json';
import { AppError } from '../middlewares/errorHandler';

export function calculateOverall(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = req.method === 'POST' ? req.body : req.query;
    const { listening, reading, writing, speaking } = input;

    if (
      listening === undefined ||
      reading === undefined ||
      writing === undefined ||
      speaking === undefined
    ) {
      throw new AppError(
        'All four skills (listening, reading, writing, speaking) are required.',
        400,
        'MISSING_SKILL_SCORES'
      );
    }

    const parseScore = (val: unknown, name: string): number => {
      const num = typeof val === 'string' ? parseFloat(val) : Number(val);
      if (isNaN(num) || num < 0 || num > 9) {
        throw new AppError(
          `Score for '${name}' must be a number between 0.0 and 9.0.`,
          400,
          'INVALID_SCORE'
        );
      }
      return num;
    };

    const l = parseScore(listening, 'listening');
    const r = parseScore(reading, 'reading');
    const w = parseScore(writing, 'writing');
    const s = parseScore(speaking, 'speaking');

    const result = calculateOverallBandScore({
      listening: l,
      reading: r,
      writing: w,
      speaking: s
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function convertRawScoreToBand(req: Request, res: Response, next: NextFunction): void {
  try {
    const { score, type } = req.query;

    if (score === undefined || score === '') {
      throw new AppError("Query parameter 'score' (0-40) is required.", 400, 'MISSING_RAW_SCORE');
    }

    const rawNum = typeof score === 'string' ? parseInt(score, 10) : Number(score);
    if (isNaN(rawNum) || rawNum < 0 || rawNum > 40) {
      throw new AppError(
        "Query parameter 'score' must be an integer between 0 and 40.",
        400,
        'INVALID_RAW_SCORE'
      );
    }

    const validTypes: TestType[] = ['academicReading', 'generalTrainingReading', 'listening'];
    let testType: TestType = 'academicReading';

    if (type) {
      const cleanType = String(type).trim();
      if (!validTypes.includes(cleanType as TestType)) {
        throw new AppError(
          `Invalid test type '${cleanType}'. Allowed types: ${validTypes.join(', ')}`,
          400,
          'INVALID_TEST_TYPE'
        );
      }
      testType = cleanType as TestType;
    }

    const result = rawToBandScore(rawNum, testType);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function targetPlanner(req: Request, res: Response, next: NextFunction): void {
  try {
    const { targetOverall, knownScores } = req.body;

    if (targetOverall === undefined) {
      throw new AppError(
        "Property 'targetOverall' is required (e.g. 7.0, 7.5, 8.0).",
        400,
        'MISSING_TARGET_OVERALL'
      );
    }

    const targetNum = Number(targetOverall);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > 9) {
      throw new AppError(
        "'targetOverall' must be a valid band score between 1.0 and 9.0.",
        400,
        'INVALID_TARGET_SCORE'
      );
    }

    if (!knownScores || typeof knownScores !== 'object') {
      throw new AppError(
        "Property 'knownScores' must be an object containing at least one known skill score.",
        400,
        'INVALID_KNOWN_SCORES'
      );
    }

    const result = calculateTargetPlanner(targetNum, knownScores);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function convertClb(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = req.method === 'POST' ? req.body : req.query;
    const { listening, reading, writing, speaking } = input;

    if (
      listening === undefined ||
      reading === undefined ||
      writing === undefined ||
      speaking === undefined
    ) {
      throw new AppError(
        'All four skills (listening, reading, writing, speaking) are required for CLB calculation.',
        400,
        'MISSING_SKILL_SCORES'
      );
    }

    const parseScore = (val: unknown, name: string): number => {
      const num = typeof val === 'string' ? parseFloat(val) : Number(val);
      if (isNaN(num) || num < 0 || num > 9) {
        throw new AppError(
          `Score for '${name}' must be a number between 0.0 and 9.0.`,
          400,
          'INVALID_SCORE'
        );
      }
      return num;
    };

    const l = parseScore(listening, 'listening');
    const r = parseScore(reading, 'reading');
    const w = parseScore(writing, 'writing');
    const s = parseScore(speaking, 'speaking');

    const result = convertToCLB({
      listening: l,
      reading: r,
      writing: w,
      speaking: s
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function getTables(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: bandScoresData
    });
  } catch (error) {
    next(error);
  }
}
