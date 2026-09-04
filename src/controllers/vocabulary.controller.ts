import { Request, Response, NextFunction } from 'express';
import vocabularyData from '../data/vocabulary.json';
import { VocabularyItem, VocabularyChapterStats } from '../types';
import { paginateArray } from '../utils/pagination';
import { generateVocabularyQuiz, generateFlashcards, shuffleArray } from '../utils/quizGenerator';
import { AppError } from '../middlewares/errorHandler';

const allVocab: VocabularyItem[] = vocabularyData as VocabularyItem[];

export function getVocabulary(req: Request, res: Response, next: NextFunction): void {
  try {
    const { page, limit, chapter, search, prefix, category, sort } = req.query;

    let filtered = [...allVocab];

    // Filter by chapter
    if (chapter !== undefined && chapter !== '') {
      const chNum = parseInt(String(chapter), 10);
      if (isNaN(chNum) || chNum < 1 || chNum > 22) {
        throw new AppError('Chapter must be an integer between 1 and 22.', 400, 'INVALID_CHAPTER');
      }
      filtered = filtered.filter((item) => item.chapter === chNum);
    }

    // Filter by search keyword
    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.word.toLowerCase().includes(q) ||
          item.explanation.toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Filter by prefix/starts_with
    if (prefix && typeof prefix === 'string') {
      const p = prefix.trim().toLowerCase();
      filtered = filtered.filter((item) => item.word.toLowerCase().startsWith(p));
    }

    // Filter by category
    if (category && typeof category === 'string') {
      const c = category.trim().toLowerCase();
      filtered = filtered.filter((item) => item.category.toLowerCase().includes(c));
    }

    // Sorting
    if (sort && typeof sort === 'string') {
      switch (sort.toLowerCase()) {
        case 'word_asc':
          filtered.sort((a, b) => a.word.localeCompare(b.word));
          break;
        case 'word_desc':
          filtered.sort((a, b) => b.word.localeCompare(a.word));
          break;
        case 'chapter_asc':
          filtered.sort((a, b) => a.chapter - b.chapter || a.id - b.id);
          break;
        case 'chapter_desc':
          filtered.sort((a, b) => b.chapter - a.chapter || a.id - b.id);
          break;
        case 'id_desc':
          filtered.sort((a, b) => b.id - a.id);
          break;
        case 'id_asc':
        default:
          filtered.sort((a, b) => a.id - b.id);
          break;
      }
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

export function getWordById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId < 1) {
      throw new AppError('Word ID must be a positive integer.', 400, 'INVALID_WORD_ID');
    }

    const word = allVocab.find((item) => item.id === numericId);

    if (!word) {
      throw new AppError(
        `Vocabulary item with ID ${numericId} was not found.`,
        404,
        'WORD_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: word
    });
  } catch (error) {
    next(error);
  }
}

export function getWordByName(req: Request, res: Response, next: NextFunction): void {
  try {
    const wordParam = req.params && req.params.word ? String(req.params.word).trim() : '';
    if (!wordParam) {
      throw new AppError('Word parameter is required.', 400, 'INVALID_WORD_PARAM');
    }

    const targetWord = wordParam.toLowerCase();
    const found = allVocab.find((item) => item.word.toLowerCase() === targetWord);

    if (!found) {
      throw new AppError(
        `Word '${wordParam}' was not found in IELTS vocabulary dataset.`,
        404,
        'WORD_NOT_FOUND'
      );
    }

    res.json({
      success: true,
      data: found
    });
  } catch (error) {
    next(error);
  }
}

export function getRandomWord(req: Request, res: Response, next: NextFunction): void {
  try {
    const { chapter, count } = req.query;

    let pool = [...allVocab];

    if (chapter !== undefined && chapter !== '') {
      const chNum = parseInt(String(chapter), 10);
      if (isNaN(chNum) || chNum < 1 || chNum > 22) {
        throw new AppError('Chapter must be an integer between 1 and 22.', 400, 'INVALID_CHAPTER');
      }
      pool = pool.filter((item) => item.chapter === chNum);
    }

    let n = 1;
    if (count !== undefined) {
      n = parseInt(String(count), 10);
      if (isNaN(n) || n < 1) {
        n = 1;
      } else if (n > 20) {
        n = 20;
      }
    }

    const selected = shuffleArray(pool).slice(0, n);

    res.json({
      success: true,
      data: n === 1 ? selected[0] : selected
    });
  } catch (error) {
    next(error);
  }
}

export function getChapters(req: Request, res: Response, next: NextFunction): void {
  try {
    const chaptersMap = new Map<number, { name: string; category: string; words: string[] }>();

    for (const item of allVocab) {
      if (!chaptersMap.has(item.chapter)) {
        chaptersMap.set(item.chapter, {
          name: item.chapterName,
          category: item.category,
          words: []
        });
      }
      const entry = chaptersMap.get(item.chapter)!;
      if (entry.words.length < 5) {
        entry.words.push(item.word);
      }
    }

    const stats: VocabularyChapterStats[] = Array.from(chaptersMap.entries()).map(
      ([chapter, details]) => {
        const count = allVocab.filter((v) => v.chapter === chapter).length;
        return {
          chapter,
          chapterName: details.name,
          category: details.category,
          wordCount: count,
          sampleWords: details.words
        };
      }
    );

    stats.sort((a, b) => a.chapter - b.chapter);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

export function getVocabularyQuiz(req: Request, res: Response, next: NextFunction): void {
  try {
    const { count, chapter, type } = req.query;

    let quizType: 'multipleChoice' | 'definitionMatch' | 'phoneticMatch' = 'multipleChoice';
    if (type === 'definitionMatch' || type === 'phoneticMatch') {
      quizType = type;
    }

    const questions = generateVocabularyQuiz(count as string, chapter as string, quizType);

    res.json({
      success: true,
      data: {
        totalQuestions: questions.length,
        quizType,
        chapter: chapter ? parseInt(String(chapter), 10) : 'all',
        questions
      }
    });
  } catch (error) {
    next(error);
  }
}

export function getVocabularyFlashcards(req: Request, res: Response, next: NextFunction): void {
  try {
    const { count, chapter } = req.query;
    const cards = generateFlashcards(count as string, chapter as string);

    res.json({
      success: true,
      data: {
        totalCards: cards.length,
        chapter: chapter ? parseInt(String(chapter), 10) : 'all',
        flashcards: cards
      }
    });
  } catch (error) {
    next(error);
  }
}
