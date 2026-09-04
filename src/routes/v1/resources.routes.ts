import { Router } from 'express';
import {
  getResources,
  getResourceById,
  getSkillsSummary
} from '../../controllers/resources.controller';

const router = Router();

router.get('/summary', getSkillsSummary);
router.get('/:id', getResourceById);
router.get('/', getResources);

export default router;
