import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerRoutes } from './routes/register.js';

export interface BuildAppOptions {
  /** Enable Fastify's built-in logger. Defaults to `false`. */
  logger?: boolean;
}

/**
 * Build a configured Fastify instance with all IELTS routes registered.
 *
 * The returned instance is not automatically listening, which makes it trivial
 * to test with `app.inject(...)`.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  registerRoutes(app);
  return app;
}
