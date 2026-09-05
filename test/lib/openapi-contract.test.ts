import { readFileSync } from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openApiDocument } from '../../src/lib/openapi.js';
import { DOMAIN_ROUTES } from '../../src/routes/index.js';
import { API_VERSION } from '../../src/version.js';
import { startTestServer } from '../helpers/server.js';

import type { OpenAPIV3_1 } from 'openapi-types';
import type { TestServer } from '../helpers/server.js';

const document = openApiDocument(DOMAIN_ROUTES, '/', API_VERSION) as unknown as OpenAPIV3_1.Document;
let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

const cases: [string, string, string, RequestInit?][] = [
  ['get', '/v1/reading', '/v1/reading'],
  ['get', '/v1/reading/stats', '/v1/reading/stats'],
  ['get', '/v1/reading/random', '/v1/reading/random?count=6'],
  ['get', '/v1/reading/{id}', '/v1/reading/library-of-things'],
  [
    'post',
    '/v1/reading/{id}/grade',
    '/v1/reading/library-of-things/grade',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"answers":[{"questionId":"q5","answer":"seven"}]}',
    },
  ],
  ['get', '/v1/reading', '/v1/reading?level=not-a-level'],
  ['get', '/v1/reading/{id}', '/v1/reading/no-such-id'],
  [
    'post',
    '/v1/reading/{id}/grade',
    '/v1/reading/library-of-things/grade',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"answers":null}' },
  ],
  ['post', '/v1/reading/{id}/grade', '/v1/reading/library-of-things/grade', { method: 'POST', body: '{}' }],
  [
    'post',
    '/v1/reading/{id}/grade',
    '/v1/reading/library-of-things/grade',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(16385) },
  ],
];

describe('OpenAPI contract validation', () => {
  it('declares a maximum size for every array schema, not just request bodies', () => {
    let arrays = 0;
    function visit(value: unknown): void {
      if (value === null || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      if (object.type === 'array') {
        arrays += 1;
        expect(Number.isInteger(object.maxItems)).toBe(true);
        expect(object.maxItems).toBeGreaterThan(0);
      }
      for (const child of Object.values(value)) visit(child);
    }
    visit(document);
    expect(arrays).toBeGreaterThan(0);
  });

  it('validates the complete document against OpenAPI 3.1', async () => {
    await expect(SwaggerParser.validate(structuredClone(document))).resolves.toHaveProperty(
      'openapi',
      '3.1.0',
    );
    expect(document.security).toEqual([]);
    expect(Object.keys(document.paths!).some((path) => path.includes(':'))).toBe(false);
    expect(document.paths!['/v1/reading/{id}/grade']!.post).toHaveProperty('requestBody');
    expect(document.paths!['/v1/reading/{id}/grade']!.post!.responses).not.toHaveProperty('304');
  });

  it('keeps the committed OpenAPI snapshot synchronized with the route table', () => {
    expect(JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'))).toEqual(
      document,
    );
  });

  it.each(cases)('validates the actual %s %s response (%s)', async (method, template, path, init) => {
    const operation = document.paths![template]![method as 'get' | 'post']!;
    const response = await server.request(path, init);
    const description = operation.responses![String(response.status)] as OpenAPIV3_1.ResponseObject;
    expect(description, `Undocumented HTTP ${response.status}`).toBeDefined();
    const schema = description.content!['application/json']!.schema!;
    const validate = new Ajv2020({ strict: false, allErrors: true }).compile({
      ...schema,
      components: document.components,
    });
    const valid = validate(await response.json());
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('publishes an accurate request schema, including closed objects and answer bounds', () => {
    const validate = new Ajv2020({ strict: false }).compile(document.components!.schemas!.ReadingSubmission!);
    expect(validate({ answers: [] })).toBe(true);
    expect(validate({ answers: [{ questionId: 'q1', answer: 'B' }] })).toBe(true);
    expect(validate({ answers: [], learnerId: 'not-accepted' })).toBe(false);
    expect(validate({ answers: [{ questionId: 'q1', answer: ['B'] }] })).toBe(false);
    expect(validate({ answers: [{ questionId: 'q1', answer: 'x'.repeat(257) }] })).toBe(false);
  });

  it('merges methods on shared paths and gives operations unique IDs', () => {
    const minimal = openApiDocument(
      [
        {
          path: '/shared/:id',
          method: 'GET',
          versioned: true,
          summary: 'Read',
          handler: () => ({ data: null }),
        },
        {
          path: '/shared/:id',
          method: 'POST',
          versioned: true,
          summary: 'Submit',
          handler: () => ({ data: null }),
        },
      ],
      '/',
      API_VERSION,
    ) as unknown as OpenAPIV3_1.Document;
    const path = minimal.paths!['/shared/{id}']!;
    expect(path.get!.operationId).not.toBe(path.post!.operationId);
    expect(path.get).toBeDefined();
    expect(path.post).toBeDefined();
  });
});
