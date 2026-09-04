import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import vocabularyRoutes from './vocabulary.routes';
import writingRoutes from './writing.routes';
import speakingRoutes from './speaking.routes';
import calculatorRoutes from './calculator.routes';
import collegesRoutes from './colleges.routes';
import resourcesRoutes from './resources.routes';
import practiceRoutes from './practice.routes';
import { getHealth, getOpenApiSpec } from '../../controllers/docs.controller';

const router = Router();

router.get('/health', getHealth);
router.get('/openapi.json', getOpenApiSpec);

// Mount Swagger UI
router.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: '/api/v1/openapi.json'
    },
    customSiteTitle: 'IELTS-API Documentation'
  })
);

router.use('/vocabulary', vocabularyRoutes);
router.use('/writing', writingRoutes);
router.use('/speaking', speakingRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/colleges', collegesRoutes);
router.use('/resources', resourcesRoutes);
router.use('/practice', practiceRoutes);

export default router;
