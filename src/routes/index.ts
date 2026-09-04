import { Router } from 'express';
import v1Routes from './v1';
import { getApiOverview, getHealth } from '../controllers/docs.controller';

const router = Router();

router.get('/health', getHealth);
router.get('/', getApiOverview);
router.get('/api', getApiOverview);
router.use('/api/v1', v1Routes);

export default router;
