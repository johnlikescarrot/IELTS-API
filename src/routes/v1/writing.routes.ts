import { Router } from 'express';
import {
  getWritingPrompts,
  getPromptById,
  getRandomPrompt,
  getBandDescriptors,
  getCohesiveDevices,
  getVocabularyTiers,
  analyzeEssay
} from '../../controllers/writing.controller';

const router = Router();

router.get('/prompts/random', getRandomPrompt);
router.get('/prompts/:id', getPromptById);
router.get('/prompts', getWritingPrompts);
router.get('/band-descriptors', getBandDescriptors);
router.get('/cohesive-devices', getCohesiveDevices);
router.get('/vocabulary-tiers', getVocabularyTiers);
router.post('/analyze', analyzeEssay);

export default router;
