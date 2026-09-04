import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes';
import { requestLogger } from './middlewares/requestLogger';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  // Security headers (disable strict CSP to support Swagger UI docs)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  // Enable CORS for all origins (completely free & public API)
  app.use(cors());

  // Gzip compression
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger
  app.use(requestLogger);

  // Application routes
  app.use(routes);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
