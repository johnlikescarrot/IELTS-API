import { Router } from 'express';
import {
  getReadingTests,
  getReadingTestById,
  getListeningTests,
  getListeningTestById,
  submitAnswers
} from '../../controllers/practice.controller';

const router = Router();

router.get('/reading/:id', getReadingTestById);
router.get('/reading', getReadingTests);
router.get('/listening/:id', getListeningTestById);
router.get('/listening', getListeningTests);
router.post('/submit', submitAnswers);

export default router;
