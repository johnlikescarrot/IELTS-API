import { buildApp } from './app.js';
import { API } from './config.js';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';

const app = buildApp({ logger: true });

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`${API.name} v${API.version} listening on ${host}:${port}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
