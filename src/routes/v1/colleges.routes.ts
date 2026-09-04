import { Router } from 'express';
import { getColleges, getCollegeById, getProvinces } from '../../controllers/colleges.controller';

const router = Router();

router.get('/provinces', getProvinces);
router.get('/:id', getCollegeById);
router.get('/', getColleges);

export default router;
