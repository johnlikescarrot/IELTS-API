import { Request, Response, NextFunction } from 'express';
import practiceData from '../data/practice.json';
import { PracticeReadingTest, PracticeListeningTest } from '../types';
import { evaluatePracticeAnswers } from '../utils/quizGenerator';
import { AppError } from '../middlewares/errorHandler';

const readingTests: PracticeReadingTest[] = practiceData.readingTests;
const listeningTests: PracticeListeningTest[] = practiceData.listeningTests;

export function getReadingTests(req: Request, res: Response, next: NextFunction): void {
  try {
    const list = readingTests.map((t) => ({
      id: t.id,
      title: t.title,
      module: t.module,
      questionCount: t.questions.length
    }));

    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    next(error);
  }
}

export function getReadingTestById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const test = readingTests.find((t) => t.id === id);

    if (!test) {
      throw new AppError(`Reading test with ID '${id}' was not found.`, 404, 'TEST_NOT_FOUND');
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    next(error);
  }
}

export function getListeningTests(req: Request, res: Response, next: NextFunction): void {
  try {
    const list = listeningTests.map((t) => ({
      id: t.id,
      section: t.section,
      context: t.context,
      questionCount: t.questions.length
    }));

    res.json({
      success: true,
      data: list
    });
  } catch (error) {
    next(error);
  }
}

export function getListeningTestById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const test = listeningTests.find((t) => t.id === id);

    if (!test) {
      throw new AppError(`Listening test with ID '${id}' was not found.`, 404, 'TEST_NOT_FOUND');
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    next(error);
  }
}

export function submitAnswers(req: Request, res: Response, next: NextFunction): void {
  try {
    const { testType, testId, answers } = req.body;

    if (!testType || (testType !== 'reading' && testType !== 'listening')) {
      throw new AppError(
        "Body property 'testType' must be either 'reading' or 'listening'.",
        400,
        'INVALID_TEST_TYPE'
      );
    }

    if (!testId || typeof testId !== 'string') {
      throw new AppError("Body property 'testId' is required.", 400, 'MISSING_TEST_ID');
    }

    if (!answers || typeof answers !== 'object') {
      throw new AppError(
        "Body property 'answers' must be an object with question ID keys.",
        400,
        'INVALID_ANSWERS'
      );
    }

    const evaluation = evaluatePracticeAnswers(testType, testId, answers);

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
}
