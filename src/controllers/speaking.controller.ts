import { Request, Response, NextFunction } from 'express';
import speakingData from '../data/speaking.json';
import { SpeakingPart1Topic, SpeakingCueCard, SpeakingFormula, PracticeTranscript } from '../types';
import { paginateArray } from '../utils/pagination';
import { shuffleArray } from '../utils/quizGenerator';
import { AppError } from '../middlewares/errorHandler';

const part1Topics: SpeakingPart1Topic[] = speakingData.part1Topics;
const part2CueCards: SpeakingCueCard[] = speakingData.part2CueCards;
const speakingFormulas: SpeakingFormula[] = speakingData.speakingFormulas;
const practiceTranscripts: PracticeTranscript[] = speakingData.practiceTranscripts;

export function getSpeakingBandDescriptors(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: speakingData.bandDescriptors
    });
  } catch (error) {
    next(error);
  }
}

export function getPart1Topics(req: Request, res: Response, next: NextFunction): void {
  try {
    const { search, page, limit } = req.query;

    let filtered = [...part1Topics];

    if (search && typeof search === 'string') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.topic.toLowerCase().includes(s) ||
          t.questions.some((q) => q.toLowerCase().includes(s)) ||
          t.modelTips.toLowerCase().includes(s)
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

export function getPart1TopicById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const topic = part1Topics.find((t) => t.id === id);

    if (!topic) {
      throw new AppError(
        `Speaking Part 1 topic with ID '${id}' was not found.`,
        404,
        'TOPIC_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: topic
    });
  } catch (error) {
    next(error);
  }
}

export function getPart2CueCards(req: Request, res: Response, next: NextFunction): void {
  try {
    const { category, search, page, limit } = req.query;

    let filtered = [...part2CueCards];

    if (category && typeof category === 'string') {
      const c = category.trim().toLowerCase();
      filtered = filtered.filter((card) => card.category.toLowerCase().includes(c));
    }

    if (search && typeof search === 'string') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.topic.toLowerCase().includes(s) ||
          card.bulletPoints.some((bp) => bp.toLowerCase().includes(s)) ||
          card.usefulVocabulary.some((v) => v.toLowerCase().includes(s))
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

export function getCueCardById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const card = part2CueCards.find((c) => c.id === id);

    if (!card) {
      throw new AppError(
        `Speaking Cue Card with ID '${id}' was not found.`,
        404,
        'CUE_CARD_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    next(error);
  }
}

export function getRandomCueCard(req: Request, res: Response, next: NextFunction): void {
  try {
    const { category } = req.query;
    let pool = [...part2CueCards];

    if (category && typeof category === 'string') {
      const c = category.trim().toLowerCase();
      pool = pool.filter((card) => card.category.toLowerCase().includes(c));
    }

    if (pool.length === 0) {
      pool = [...part2CueCards];
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

export function getSpeakingFormulas(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: speakingFormulas
    });
  } catch (error) {
    next(error);
  }
}

export function getPracticeTranscripts(req: Request, res: Response, next: NextFunction): void {
  try {
    res.json({
      success: true,
      data: practiceTranscripts
    });
  } catch (error) {
    next(error);
  }
}
