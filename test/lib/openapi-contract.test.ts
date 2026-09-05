import { readFileSync } from 'node:fs';

import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openApiDocument } from '../../src/lib/openapi.js';
import { DOMAIN_ROUTES, ROUTES } from '../../src/routes/index.js';
import { API_VERSION } from '../../src/version.js';
import { startTestServer } from '../helpers/server.js';

import type { OpenAPIV3_1 } from 'openapi-types';
import type { TestServer } from '../helpers/server.js';

type Contract = {
  paths: Record<
    string,
    { get: { responses: Record<string, { content: { 'application/json': { schema: object } } }> } }
  >;
};
const freshDocument = () =>
  JSON.parse(JSON.stringify(openApiDocument(DOMAIN_ROUTES, '/', API_VERSION))) as OpenAPIV3_1.Document;
let server: TestServer;
let contract: Contract;

beforeAll(async () => {
  server = await startTestServer();
  contract = (await SwaggerParser.dereference(freshDocument())) as unknown as Contract;
});
afterAll(async () => {
  await server.close();
});

describe('OpenAPI contract fidelity', () => {
  it('passes an independent OpenAPI 3.1 schema validator', async () => {
    await expect(SwaggerParser.validate(freshDocument())).resolves.toHaveProperty('openapi', '3.1.0');
  });

  it('uses legal templated paths, matched path parameters and unique operation IDs', () => {
    const document = openApiDocument(ROUTES, '/', API_VERSION) as unknown as OpenAPIV3_1.Document;
    const ids: string[] = [];
    for (const [path, item] of Object.entries(document.paths ?? {})) {
      expect(path).not.toContain(':');
      const operation = item?.get as OpenAPIV3_1.OperationObject;
      expect(operation.operationId).toBeTruthy();
      ids.push(operation.operationId as string);
      const names = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      const params = operation.parameters as OpenAPIV3_1.ParameterObject[];
      expect(params.filter((param) => param.in === 'path').map((param) => param.name)).toEqual(names);
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.paths).toHaveProperty('/v1/practice/items/{id}');
    expect(document.security).toEqual([]);
  });

  it('keeps the committed OpenAPI snapshot byte-for-byte current', () => {
    expect(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8')).toBe(
      `${JSON.stringify(openApiDocument(DOMAIN_ROUTES, '/', API_VERSION), null, 2)}\n`,
    );
  });

  it('advertises a relative server URL behind HTTP or HTTPS proxies', async () => {
    const response = await server.request('/openapi.json', {
      headers: { Host: 'research.example', 'X-Forwarded-Proto': 'https' },
    });
    const document = (await response.json()) as OpenAPIV3_1.Document;
    expect(document.servers).toEqual([{ url: '/', description: 'This instance' }]);
  });

  it('documents a required bounded seed, every filter and complete pagination limits', () => {
    const document = freshDocument();
    const parameters = document.paths?.['/v1/practice/sample']?.get
      ?.parameters as OpenAPIV3_1.ParameterObject[];
    expect(parameters.find((param) => param.name === 'seed')).toMatchObject({
      required: true,
      schema: { type: 'string', minLength: 1, maxLength: 256 },
    });
    expect(parameters.map((param) => param.name)).toEqual([
      'q',
      'skill',
      'collection',
      'level',
      'mode',
      'audio',
      'seed',
      'count',
    ]);
    const itemParams = document.paths?.['/v1/practice/items']?.get
      ?.parameters as OpenAPIV3_1.ParameterObject[];
    expect(itemParams.find((param) => param.name === 'offset')?.schema).toMatchObject({
      maximum: Number.MAX_SAFE_INTEGER,
    });
  });

  it.each([
    ['/v1/practice', '/v1/practice', '200'],
    ['/v1/practice/collections', '/v1/practice/collections', '200'],
    ['/v1/practice/items?level=a1-a2&limit=2', '/v1/practice/items', '200'],
    ['/v1/practice/items?offset=1852', '/v1/practice/items', '200'],
    ['/v1/practice/items/reading-full-001', '/v1/practice/items/{id}', '200'],
    ['/v1/practice/sample?seed=contract&count=3', '/v1/practice/sample', '200'],
    ['/v1/practice/sample?seed=contract&q=nonexistent', '/v1/practice/sample', '200'],
    ['/v1/practice/sample', '/v1/practice/sample', '400'],
    ['/v1/practice/items/reading-full-105', '/v1/practice/items/{id}', '404'],
    ['/v1/vocabulary?limit=0', '/v1/vocabulary', '400'],
  ])('validates the real HTTP response for %s', async (path, template, status) => {
    const response = await server.request(path);
    expect(String(response.status)).toBe(status);
    const body = await response.json();
    const schema = contract.paths[template]?.get.responses[status]?.content['application/json']
      .schema as object;
    const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(schema);
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    if (status === '200') {
      expect(validate({ status: 200, data: 'invalid payload', meta: {} })).toBe(false);
    } else {
      expect(validate({ status: Number(status), error: { code: 'wrong envelope' } })).toBe(false);
    }
  });
});
