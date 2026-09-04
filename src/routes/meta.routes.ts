/**
 * Root, API index and health routes.
 */

import type { FastifyInstance } from 'fastify';
import { API_VERSION, getApiIndex } from './catalog.js';

const START_TIME = Date.now();

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => {
    const index = getApiIndex();
    return { data: index };
  });

  app.get('/v1', async () => {
    const index = getApiIndex();
    return { data: index };
  });

  app.get('/health', async () => {
    return {
      data: {
        status: 'ok',
        version: API_VERSION,
        uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString()
      }
    };
  });
}
