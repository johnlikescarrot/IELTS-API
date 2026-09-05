import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { startTestServer } from '../helpers/server.js';
import type { TestServer } from '../helpers/server.js';

type Document = {
  servers: { url: string }[];
  security: unknown[];
  components: { schemas: Record<string, object> };
  paths: Record<
    string,
    {
      get: {
        operationId: string;
        parameters: { name: string; in: string; required?: boolean }[];
        responses: Record<string, { content: { 'application/json': { schema: object } } }>;
      };
    }
  >;
};
let server: TestServer;
let document: Document;
beforeAll(async () => {
  server = await startTestServer();
  document = (await (await server.request('/openapi.json')).json()) as Document;
});
afterAll(async () => {
  await server.close();
});

const examples = [
  ['/v1/practice', '/v1/practice'],
  ['/v1/practice/stats', '/v1/practice/stats'],
  ['/v1/practice/items', '/v1/practice/items?complete=false'],
  ['/v1/practice/items/{id}', '/v1/practice/items/reading-tests-0001'],
  ['/v1/practice/sample', '/v1/practice/sample?seed=contract'],
  ['/v1/practice/export', '/v1/practice/export'],
] as const;

describe('OpenAPI 3.1 conformance', () => {
  it('uses actual OpenAPI path templates, unique IDs and a same-origin server URL', () => {
    expect(document.servers).toEqual([{ url: '/', description: 'This instance' }]);
    expect(document.security).toEqual([]);
    expect(document.paths).toHaveProperty('/health');
    expect(document.paths).toHaveProperty('/v1');
    expect(document.paths).toHaveProperty('/');
    const paths = Object.keys(document.paths);
    expect(paths.every((path) => !path.includes(':'))).toBe(true);
    const ids = Object.values(document.paths).map((entry) => entry.get.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(document.paths['/v1/practice/items/{id}']!.get.parameters).toContainEqual({
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
    expect(
      document.paths['/v1/practice/sample']!.get.parameters.find((parameter) => parameter.name === 'seed')
        ?.required,
    ).toBe(true);
    expect(document.paths).not.toHaveProperty('/research');
  });

  it.each(examples)('validates the live %s response with its published schema', async (path, url) => {
    const schema = document.paths[path]!.get.responses['200']!.content['application/json'].schema;
    const validate = new Ajv2020({ strict: false }).compile({ components: document.components, ...schema });
    const data = await (await server.request(url)).json();
    expect(validate(data), JSON.stringify(validate.errors)).toBe(true);
  });

  it('validates the real error envelope and rejects the previously documented wrong shape', async () => {
    const validate = new Ajv2020({ strict: false }).compile(document.components.schemas.ApiError!);
    const response = await (await server.request('/v1/practice/items?limit=0')).json();
    expect(validate(response), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ status: 400, error: { code: 'bad_request', message: 'wrong shape' } })).toBe(false);
  });

  it('does not allow upstream content to be added to the metadata item schema', () => {
    const validate = new Ajv2020({ strict: false }).compile({
      components: document.components,
      $ref: '#/components/schemas/PracticeItem',
    });
    expect(validate({ id: 'item', passage: 'unexpected exercise content' })).toBe(false);
  });
});
