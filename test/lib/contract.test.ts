import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { fullFormats } from 'ajv-formats/dist/formats.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApiDocument } from '../../src/lib/openapi.js';
import { ROUTES } from '../../src/routes/index.js';
import { practiceIndex } from '../../src/data/practice.js';
import { API_VERSION } from '../../src/version.js';
import { startTestServer } from '../helpers/server.js';
import type { AnySchema } from 'ajv';
import type { OpenAPI } from 'openapi-types';
import type { TestServer } from '../helpers/server.js';

type Contract = {
  security: unknown[];
  servers: { url: string }[];
  paths: Record<
    string,
    {
      get: {
        operationId: string;
        parameters: { name: string; in: string; required?: boolean; schema: Record<string, unknown> }[];
        responses: Record<string, { content?: Record<string, { schema: AnySchema }> }>;
      };
    }
  >;
  components: { schemas: Record<string, AnySchema> };
};

let server: TestServer;
let contract: Contract;
const ajv = new Ajv2020({ strict: true, allErrors: true, formats: fullFormats });

beforeAll(async () => {
  server = await startTestServer();
  const document = structuredClone(openApiDocument(ROUTES, '/', API_VERSION));
  // Real OpenAPI 3.1 validation also resolves local component references.
  contract = (await SwaggerParser.validate(document as unknown as OpenAPI.Document)) as unknown as Contract;
});
afterAll(async () => {
  await server.close();
});

function validate(schema: AnySchema, value: unknown): void {
  const check = ajv.compile(schema);
  expect(check(value), JSON.stringify(check.errors)).toBe(true);
}

describe('the real OpenAPI contract', () => {
  it('is valid OpenAPI 3.1, explicitly no-auth, with brace parameters and every service route', () => {
    expect(contract.security).toEqual([]);
    expect(contract.servers).toEqual([{ url: '/', description: 'This instance' }]);
    const paths = ROUTES.filter((route) => !['/docs', '/openapi.json'].includes(route.path))
      .map((route) => route.path.replace(/:([^/]+)/g, '{$1}'))
      .sort();
    expect(Object.keys(contract.paths).sort()).toEqual(paths);
    expect(Object.keys(contract.paths).some((path) => path.includes(':'))).toBe(false);
    expect(contract.paths['/v1/practice/{id}']?.get.parameters).toContainEqual({
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
    const operations = Object.values(contract.paths).map((path) => path.get.operationId);
    expect(new Set(operations).size).toBe(operations.length);
    expect(operations.every((id) => id.length > 0)).toBe(true);
  });

  it('documents every practice control and distinguishes JSON Lines from a JSON envelope', () => {
    expect(contract.paths['/v1/practice']?.get.parameters.map((p) => p.name)).toEqual([
      'q',
      'skill',
      'mode',
      'level',
      'asset',
      'limit',
      'offset',
    ]);
    const sample = contract.paths['/v1/practice/sample']!.get.parameters;
    expect(sample.find((p) => p.name === 'seed')).toMatchObject({
      required: true,
      schema: { maxLength: 128 },
    });
    const exported = contract.paths['/v1/practice/export']!.get;
    expect(exported.parameters.map((p) => p.name)).not.toContain('limit');
    expect(Object.keys(exported.responses['200']!.content!)).toEqual(['application/x-ndjson']);
    expect(
      contract.paths['/v1/tasks/reading']?.get.parameters.find((p) => p.name === 'type')?.schema.enum,
    ).toHaveLength(11);
    expect(
      contract.paths['/v1/tasks/listening']?.get.parameters.find((p) => p.name === 'type')?.schema.enum,
    ).toHaveLength(6);
  });

  it.each([
    ['/v1/practice', '/v1/practice?limit=2'],
    ['/v1/practice', '/v1/practice?offset=9999'],
    ['/v1/practice/stats', '/v1/practice/stats'],
    ['/v1/practice/sample', '/v1/practice/sample?seed=contract&count=2'],
    ['/v1/practice/{id}', '/v1/practice/reading-basic-a1-a2-0001'],
    ['/v1/tasks/reading', '/v1/tasks/reading'],
    ['/v1/tasks/listening', '/v1/tasks/listening'],
  ])('validates the actual HTTP success body for %s', async (path, request) => {
    const response = await server.json(request);
    expect(response.status).toBe(200);
    validate(contract.paths[path]!.get.responses['200']!.content!['application/json']!.schema, response);
  });

  it.each([
    ['/v1/practice', '/v1/practice?limit=0', 400, 'GET'],
    ['/v1/practice/sample', '/v1/practice/sample', 400, 'GET'],
    ['/v1/practice/{id}', '/v1/practice/missing', 404, 'GET'],
    ['/v1/practice', '/v1/practice', 405, 'POST'],
  ])('validates real error envelopes for %s', async (_path, request, status, method) => {
    const response = await server.json(String(request), { method: String(method) });
    expect(response.status).toBe(status);
    validate(contract.components.schemas.ApiError!, response);
  });

  it('validates all unit metadata and every record of a filtered JSON Lines download', async () => {
    const unitSchema = contract.components.schemas.PracticeUnit!;
    const check = ajv.compile(unitSchema);
    for (const item of practiceIndex().items) expect(check(item), JSON.stringify(check.errors)).toBe(true);
    expect(check({ ...practiceIndex().items[0], content: 'No source content allowed' })).toBe(false);
    const response = await server.request('/v1/practice/export?level=advanced');
    const rows = (await response.text())
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line) as unknown);
    for (const row of rows) validate(contract.components.schemas.PracticeExportRecord!, row);
  });

  it('serves the same complete contract independently of the preview host or port', async () => {
    const response = await server.request('/openapi.json');
    expect(await response.json()).toEqual(openApiDocument(ROUTES, '/', API_VERSION));
  });
});
