import { Router } from 'express';
import {
  getVocabulary,
  getWordById,
  getWordByName,
  getRandomWord,
  getChapters,
  getVocabularyQuiz,
  getVocabularyFlashcards
} from '../../controllers/vocabulary.controller';

const router = Router();

router.get('/chapters', getChapters);
router.get('/random', getRandomWord);
router.get('/quiz', getVocabularyQuiz);
router.get('/flashcards', getVocabularyFlashcards);
router.get('/word/:word', getWordByName);
router.get('/:id', getWordById);
router.get('/', getVocabulary);

export default router;
