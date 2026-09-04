import cors from '@fastify/cors';
import Fastify from 'fastify';
import { registerRoutes } from './routes/index.js';
import { SERVICE_NAME, SERVICE_VERSION } from './config.js';

export function buildApp() {
  const app = Fastify({
    logger: false,
  });

  void app.register(cors, { origin: true });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Cache-Control', reply.statusCode >= 400 ? 'no-store' : 'public, max-age=300');
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({
      error: 'route_not_found',
      message: 'The requested route does not exist.',
    });
  });

  app.setErrorHandler(async (error, _request, reply) => {
    app.log.error(error);
    return reply.code(500).send({
      error: 'internal_error',
      message: 'An unexpected error occurred.',
    });
  });

  registerRoutes(app);

  app.addHook('onClose', async () => {
    app.log.info(`Closed ${SERVICE_NAME} ${SERVICE_VERSION}`);
  });

  return app;
}
