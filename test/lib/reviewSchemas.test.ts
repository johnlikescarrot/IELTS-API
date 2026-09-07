import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import formats from 'ajv-formats';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApiDocument } from '../../src/lib/openapi.js';
import { createReviewCard } from '../../src/lib/review.js';
import { ROUTES } from '../../src/routes/index.js';
import { API_VERSION } from '../../src/version.js';
import { startTestServer } from '../helpers/server.js';
import type { TestServer } from '../helpers/server.js';

type Schema = Record<string, unknown>;
type Operation = {
  operationId: string;
  parameters: { name: string; in: string; required?: boolean }[];
  requestBody?: { required: boolean; content: { 'application/json': { schema: Schema } } };
  responses: Record<string, { content?: { 'application/json': { schema: Schema } } }>;
};
type Document = {
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema> };
  servers: { url: string }[];
  security: unknown[];
};
const document = openApiDocument(ROUTES, '/', API_VERSION) as Document;
const ajv = new Ajv2020({ strict: true, allErrors: true, multipleOfPrecision: 8 });
formats.default(ajv);

function validator(schema: Schema) {
  // Rehome OAS components as JSON Schema $defs; the actual constraints are unchanged.
  return ajv.compile(
    JSON.parse(
      JSON.stringify({ ...schema, $defs: document.components.schemas }).replaceAll(
        '#/components/schemas/',
        '#/$defs/',
      ),
    ) as Schema,
  );
}

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});
const card = createReviewCard('w00001', '2026-09-07');
const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('executable OpenAPI review contract', () => {
  it('uses proper path templates, unique operation IDs and actual HTTP methods for every live route', () => {
    const ids = [];
    for (const route of ROUTES.filter((route) => !['/docs', '/openapi.json'].includes(route.path))) {
      const path = route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      const operation = document.paths[path]![route.method.toLowerCase()]!;
      expect(operation).toBeDefined();
      for (const parameter of operation.parameters.filter((item) => item.in === 'path')) {
        expect(path).toContain(`{${parameter.name}}`);
        expect(parameter.required).toBe(true);
      }
      ids.push(operation.operationId);
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.paths['/v1/study/review']?.get).toBeUndefined();
    expect(document.paths['/v1/study/review']?.post?.responses['304']).toBeUndefined();
    expect(document.security).toEqual([]);
  });

  it('does not overwrite methods when GET and POST share a path', () => {
    const handler = () => ({ data: null });
    const generated = openApiDocument(
      [
        { method: 'GET', path: '/shared', summary: 'get', versioned: true, handler },
        { method: 'POST', path: '/shared', summary: 'post', versioned: true, handler },
      ],
      '/',
      API_VERSION,
    ) as Document;
    expect(Object.keys(generated.paths['/shared']!)).toEqual(['get', 'post']);
    expect(generated.paths['/shared']?.post?.requestBody).toBeUndefined();
  });

  it('keeps the archived snapshot in sync and uses a relative server URL behind HTTPS proxies', async () => {
    const archived = JSON.parse(
      readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'),
    ) as unknown;
    expect(archived).toEqual(document);
    const live = await server.request('/openapi.json');
    expect(await live.json()).toEqual(document);
    expect(document.servers).toEqual([{ url: '/', description: 'This instance' }]);
  });

  it.each(Object.keys(document.components.schemas))(
    'compiles component %s as JSON Schema 2020-12',
    (name) => {
      expect(() => validator(document.components.schemas[name]!)).not.toThrow();
    },
  );

  it.each([
    ['/v1/study/review/policy', 'get', '/v1/study/review/policy', undefined],
    ['/v1/vocabulary/deck', 'get', '/v1/vocabulary/deck?seed=schema&on=2026-09-07', undefined],
    ['/v1/study/review', 'post', '/v1/study/review', { card, grade: 3, on: '2026-09-07' }],
    ['/v1/study/review/queue', 'post', '/v1/study/review/queue', { cards: [card], on: '2026-09-07' }],
  ] as const)('validates real request and response shapes at %s', async (path, method, url, body) => {
    const operation = document.paths[path]![method]!;
    if (body !== undefined) {
      expect(operation.requestBody?.required).toBe(true);
      const validateInput = validator(operation.requestBody!.content['application/json'].schema);
      expect(validateInput(body), JSON.stringify(validateInput.errors)).toBe(true);
    }
    const response = await server.request(url, body === undefined ? undefined : post(body));
    expect(response.status).toBe(200);
    const validate = validator(operation.responses['200']!.content!['application/json'].schema);
    expect(validate(await response.json()), JSON.stringify(validate.errors)).toBe(true);
  });

  it('matches actual error envelopes instead of declaring a nonexistent top-level error', async () => {
    const response = await server.request('/v1/study/review', post({ card, on: '2026-09-07' }));
    const body = await response.json();
    const validate = validator(document.components.schemas.ApiError!);
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ status: 400, error: { code: 'bad_request', message: 'wrong envelope' } })).toBe(false);
    const operation = document.paths['/v1/study/review']!.post!;
    for (const status of ['400', '405', '408', '413', '415'])
      expect(operation.responses[status]).toBeDefined();
  });

  it('rejects missing fields, coercible values, unknown fields, invalid dates and oversized queues in the schema too', () => {
    const validate = validator(document.components.schemas.ReviewInput!);
    for (const bad of [
      {},
      { card, grade: '4', on: '2026-09-07' },
      { card, grade: 4, on: '2026-02-30' },
      { card, grade: 4, on: '0000-01-01' },
      { card, grade: 4, on: '2026-09-07', userId: 1 },
      { card: { ...card, easeFactor: 2.345 }, grade: 4, on: '2026-09-07' },
    ])
      expect(validate(bad)).toBe(false);
    const queue = validator(document.components.schemas.ReviewQueueInput!);
    expect(queue({ cards: [], on: '2026-09-07', newLimit: 0 })).toBe(true);
    expect(queue({ cards: Array<unknown>(501).fill(card), on: '2026-09-07' })).toBe(false);
  });
});
