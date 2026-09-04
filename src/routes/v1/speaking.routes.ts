import { Router } from 'express';
import {
  getSpeakingBandDescriptors,
  getPart1Topics,
  getPart1TopicById,
  getPart2CueCards,
  getCueCardById,
  getRandomCueCard,
  getSpeakingFormulas,
  getAuthenticTranscripts
} from '../../controllers/speaking.controller';

const router = Router();

router.get('/band-descriptors', getSpeakingBandDescriptors);
router.get('/part1-topics/:id', getPart1TopicById);
router.get('/part1-topics', getPart1Topics);
router.get('/part2-cue-cards/random', getRandomCueCard);
router.get('/part2-cue-cards/:id', getCueCardById);
router.get('/part2-cue-cards', getPart2CueCards);
router.get('/formulas', getSpeakingFormulas);
router.get('/transcripts', getAuthenticTranscripts);

export default router;
