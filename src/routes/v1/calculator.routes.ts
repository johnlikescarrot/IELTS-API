import { Router } from 'express';
import {
  calculateOverall,
  convertRawScoreToBand,
  targetPlanner,
  convertClb,
  getTables
} from '../../controllers/calculator.controller';

const router = Router();

router.get('/overall', calculateOverall);
router.post('/overall', calculateOverall);
router.get('/raw-to-band', convertRawScoreToBand);
router.post('/target-planner', targetPlanner);
router.get('/clb', convertClb);
router.post('/clb', convertClb);
router.get('/tables', getTables);

export default router;
