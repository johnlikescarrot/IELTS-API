import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

export interface StartServerOptions {
  port?: number;
  host?: string;
}

export async function startServer(options: StartServerOptions = {}): Promise<FastifyInstance> {
  const { port = 3000, host = '0.0.0.0' } = options;
  const app = buildApp();
  await app.listen({ port, host });
  return app;
}
