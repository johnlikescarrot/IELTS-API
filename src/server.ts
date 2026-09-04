import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { createApp } from './app.ts';
import { badRequest } from './core/errors.ts';
import { toErrorResponse, type Router } from './core/router.ts';

/** Permissive CORS headers: the API is public, so every origin is welcome. */
export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

/** Read and JSON-parse a request body, tolerating empty bodies. */
export async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest('Request body must be valid JSON');
  }
}

/** Build a Node request listener bound to a router. */
export function requestListener(
  router: Router = createApp(),
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    const method = (request.method as string).toUpperCase();
    if (method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    let result;
    try {
      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(request);
      result = await router.handle({ method, url: request.url as string, body });
    } catch (error) {
      result = toErrorResponse(error);
    }

    const payload = JSON.stringify(result.body);
    response.writeHead(result.status, {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
      'cache-control': 'public, max-age=60',
    });
    response.end(method === 'HEAD' ? undefined : payload);
  };
}

/** Create an unstarted HTTP server exposing the API. */
export function createServer(router: Router = createApp()): Server {
  return createHttpServer(requestListener(router));
}

/* c8 ignore start */
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/^.*?(?=\/)/, ''));
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, '0.0.0.0', () => {
    process.stdout.write(`IELTS API listening on http://0.0.0.0:${port}\n`);
  });
}
/* c8 ignore stop */
