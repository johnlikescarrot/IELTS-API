import { Request, Response, NextFunction } from 'express';
import writingData from '../data/writing.json';
import { WritingPromptAndSample } from '../types';
import { analyzeEssay as runEssayAnalysis } from '../utils/essayAnalyzer';
import { paginateArray } from '../utils/pagination';
import { shuffleArray } from '../utils/quizGenerator';
import { AppError } from '../middlewares/errorHandler';

const allPrompts: WritingPromptAndSample[] =
  writingData.promptsAndSamples as WritingPromptAndSample[];

export function getWritingPrompts(req: Request, res: Response, next: NextFunction): void {
  try {
    const { taskType, category, search, page, limit } = req.query;

    let filtered = [...allPrompts];

    if (taskType && typeof taskType === 'string') {
      const type = taskType.trim().toLowerCase();
      if (type !== 'task1' && type !== 'task2') {
        throw new AppError(
          "Invalid taskType. Must be 'task1' or 'task2'.",
          400,
          'INVALID_TASK_TYPE'
        );
      }
      filtered = filtered.filter((p) => p.taskType === type);
    }

    if (category && typeof category === 'string') {
      const c = category.trim().toLowerCase();
      filtered = filtered.filter((p) => p.category.toLowerCase().includes(c));
    }

    if (search && typeof search === 'string') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.prompt.toLowerCase().includes(s) ||
          p.questionType.toLowerCase().includes(s)
      );
    }

    const paginated = paginateArray(filtered, page as string, limit as string);

    res.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta
    });
  } catch (error) {
    next(error);
  }
}

export function getPromptById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const prompt = allPrompts.find((p) => p.id === id);

    if (!prompt) {
      throw new AppError(`Writing prompt with ID '${id}' was not found.`, 404, 'PROMPT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    next(error);
  }
}

export function getRandomPrompt(req: Request, res: Response, next: NextFunction): void {
  try {
    const { taskType } = req.query;
    let pool = [...allPrompts];

    if (taskType && typeof taskType === 'string') {
      const type = taskType.trim().toLowerCase();
      if (type !== 'task1' && type !== 'task2') {
        throw new AppError(
          "Invalid taskType. Must be 'task1' or 'task2'.",
          400,
          'INVALID_TASK_TYPE'
        );
      }
      pool = pool.filter((p) => p.taskType === type);
    }

    const selected = shuffleArray(pool)[0];

    res.json({
      success: true,
      data: selected
    });
  } catch (error) {
    next(error);
  }
}

export function getBandDescriptors(req: Request, res: Response, next: NextFunction): void {
  try {
    const { taskType } = req.query;

    if (taskType && typeof taskType === 'string') {
      const type = taskType.trim().toLowerCase();
      if (type !== 'task1' && type !== 'task2') {
        throw new AppError(
          "Invalid taskType. Must be 'task1' or 'task2'.",
          400,
          'INVALID_TASK_TYPE'
        );
      }
      res.json({
        success: true,
        data: {
          taskType: type,
          descriptors: writingData.bandDescriptors[type as 'task1' | 'task2']
        }
      });
      return;
    }

    res.json({
      success: true,
      data: writingData.bandDescriptors
    });
  } catch (error) {
    next(error);
  }
}

export function getCohesiveDevices(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: writingData.cohesiveDevices
    });
  } catch (error) {
    next(error);
  }
}

export function getVocabularyTiers(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: writingData.vocabularyTiers
    });
  } catch (error) {
    next(error);
  }
}

export function analyzeEssay(req: Request, res: Response, next: NextFunction): void {
  try {
    const { text, taskType } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new AppError(
        "Body property 'text' is required and must be a non-empty string.",
        400,
        'INVALID_ESSAY_TEXT'
      );
    }

    let expectedTask: 'task1' | 'task2' = 'task2';
    if (taskType) {
      const t = String(taskType).trim().toLowerCase();
      if (t !== 'task1' && t !== 'task2') {
        throw new AppError(
          "Invalid taskType. Must be 'task1' or 'task2'.",
          400,
          'INVALID_TASK_TYPE'
        );
      }
      expectedTask = t as 'task1' | 'task2';
    }

    const result = runEssayAnalysis(text, expectedTask);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
