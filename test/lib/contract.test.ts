import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { fullFormats } from 'ajv-formats/dist/formats.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApiDocument } from '../../src/lib/openapi.js';
import { ROUTES } from '../../src/routes/index.js';
import { practiceIndex } from '../../src/data/practice.js';
import { PRACTICE_COLLECTIONS, PRACTICE_SOURCE } from '../../src/data/practice-source.js';
import { buildPracticeIndex } from '../../src/lib/practice-index.js';
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
    ['/v1/practice', '/v1/practice?limit=100', 100],
    ['/v1/practice/sample', '/v1/practice/sample?seed=bounds&count=50', 50],
    ['/v1/tasks/reading', '/v1/tasks/reading', 11],
    ['/v1/tasks/listening', '/v1/tasks/listening', 6],
  ])('bounds the response array for %s at its real maximum', async (path, request, maximum) => {
    const schema = contract.paths[path]!.get.responses['200']!.content!['application/json']!.schema;
    expect(schema).toMatchObject({ properties: { data: { maxItems: maximum } } });
    const response = await server.json(request);
    expect(response.data).toHaveLength(maximum);
    const check = ajv.compile(schema);
    expect(check(response), JSON.stringify(check.errors)).toBe(true);
    const data = response.data as unknown[];
    expect(check({ ...response, data: [...data, data[0]] })).toBe(false);
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

  it('bounds every array after references are resolved, including nested component arrays', () => {
    const seen = new Set<object>();
    function visit(value: unknown): void {
      if (value === null || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      const schema = value as Record<string, unknown>;
      if (schema.type === 'array') {
        expect(schema.maxItems, JSON.stringify(schema)).toEqual(expect.any(Number));
        expect(Number.isSafeInteger(schema.maxItems)).toBe(true);
        expect(schema.maxItems).toBeGreaterThanOrEqual(0);
      }
      Object.values(value).forEach(visit);
    }
    visit(contract);
  });

  it('accepts real compiler-derived nested array maxima and rejects overflow', () => {
    const paths = PRACTICE_COLLECTIONS.filter((collection) => collection.skill === 'listening').flatMap(
      (collection) =>
        Array.from(
          { length: collection.declaredUnits },
          (_, i) =>
            `${collection.directory}/${
              collection.layout === 'listening-basic'
                ? `Lesson_${i + 1}/index.html`
                : `Test_${i + 1}/Test_${i + 1}.html`
            }`,
        ),
    );
    // The full-test allowlist has seven distinct paths, including two HTML representations.
    const fullPaths = [
      'index.html',
      'strategies.json',
      'Test_1.json',
      'Test_1_processed.json',
      'Test_1.html',
      'Test_1.docx',
      'audio_1.mp3',
    ];
    const synthetic = buildPracticeIndex({
      sha: PRACTICE_SOURCE.commit,
      truncated: false,
      tree: [...paths, ...fullPaths.map((file) => `Reading_315_FullTest/Test_1/${file}`)].map((path) => ({
        path,
        type: 'blob',
        mode: '100644',
        sha: 'a'.repeat(40),
        size: 42,
      })),
    });
    const statsCheck = ajv.compile(contract.components.schemas.PracticeStats!);
    expect(statsCheck(synthetic.stats), JSON.stringify(statsCheck.errors)).toBe(true);
    expect(synthetic.stats.collections).toHaveLength(8);
    expect(
      synthetic.stats.collections.find((collection) => collection.id === 'reading-basic-c1-c2')
        ?.missingSequences,
    ).toHaveLength(660);
    expect(synthetic.stats.listeningWithoutAudio).toHaveLength(306);
    expect(
      statsCheck({
        ...synthetic.stats,
        collections: [...synthetic.stats.collections, synthetic.stats.collections[0]],
      }),
    ).toBe(false);
    expect(
      statsCheck({
        ...synthetic.stats,
        listeningWithoutAudio: [...synthetic.stats.listeningWithoutAudio, 'listening-full-test-0205'],
      }),
    ).toBe(false);
    expect(
      statsCheck({
        ...synthetic.stats,
        collections: synthetic.stats.collections.map((collection) => ({
          ...collection,
          missingSequences: Array.from({ length: 661 }, (_, i) => i + 1),
        })),
      }),
    ).toBe(false);
    const unitCheck = ajv.compile(contract.components.schemas.PracticeUnit!);
    const fullUnit = synthetic.items.find((item) => item.id === 'reading-full-test-0001')!;
    expect(fullUnit.assets).toHaveLength(7);
    expect(unitCheck(fullUnit)).toBe(true);
    expect(unitCheck({ ...fullUnit, assets: [...fullUnit.assets, fullUnit.assets[0]] })).toBe(false);
  });

  it('serves the same complete contract independently of the preview host or port', async () => {
    const response = await server.request('/openapi.json');
    expect(await response.json()).toEqual(openApiDocument(ROUTES, '/', API_VERSION));
  });
});
