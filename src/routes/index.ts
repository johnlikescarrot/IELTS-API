/**
 * Route registration for the whole API.
 */

import type { FastifyInstance } from 'fastify';
import { metaRoutes } from './meta.routes.js';
import { vocabRoutes } from './vocab.routes.js';
import { questionRoutes } from './questions.routes.js';
import { scoringRoutes } from './scoring.routes.js';
import { bandRoutes } from './bands.routes.js';
import { mistakeRoutes } from './mistakes.routes.js';
import { practiceRoutes } from './practice.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(metaRoutes);
  await app.register(vocabRoutes);
  await app.register(questionRoutes);
  await app.register(scoringRoutes);
  await app.register(bandRoutes);
  await app.register(mistakeRoutes);
  await app.register(practiceRoutes);
}
