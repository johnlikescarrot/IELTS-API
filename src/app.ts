/**
 * Fastify application factory: plugins, security headers, ETag/304 support,
 * consistent JSON error envelope, and route registration.
 */

import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from 'fastify';
import cors from '@fastify/cors';
import { loadConfig, type AppConfig } from './config.js';
import { AppError } from './lib/errors.js';
import { etagOnSend } from './lib/etag.js';
import { registerRoutes } from './routes/index.js';

export type ErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => void;

/**
 * Maps every thrown error onto the shared JSON error envelope:
 * `{ error: { code, message, details? }, requestId }`.
 */
export function createErrorHandler(): ErrorHandler {
  return (error, request, reply) => {
    if (error instanceof AppError) {
      request.log.error({ err: error }, 'Application error');
      reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {})
        },
        requestId: request.id
      });
      return;
    }
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    request.log.error({ err: error }, 'Unhandled error');
    reply.code(statusCode).send({
      error: {
        code: statusCode >= 500 ? 'internal_error' : 'request_error',
        message: statusCode >= 500 ? 'Internal server error' : error.message
      },
      requestId: request.id
    });
  };
}

export async function createApp(config: AppConfig = loadConfig()): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.env === 'test' ? false : { level: config.logLevel },
    trustProxy: true
  });

  await app.register(cors, {
    origin: config.corsOrigins === true ? true : [...config.corsOrigins]
  });

  app.addHook('onRequest', (_request, reply, done) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    done();
  });

  app.addHook('onSend', etagOnSend);
  app.setErrorHandler(createErrorHandler());
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: 'route_not_found',
        message: `Route ${request.method}:${request.url} was not found`
      },
      requestId: request.id
    });
  });

  await app.register(registerRoutes);
  return app;
}
