import { describe, expect, it } from 'vitest';

import { openApiDocument } from '../../src/lib/openapi.js';
import { ROUTES } from '../../src/routes/index.js';

import type { JsonValue } from '../../src/types.js';

const document = openApiDocument(ROUTES, 'http://localhost:3000/', '1.0.0') as {
  openapi: string;
  info: { title: string; version: string };
  servers: { url: string }[];
  paths: Record<
    string,
    {
      get: { summary: string; parameters?: { name: string }[] };
      post?: {
        operationId: string;
        parameters: { name: string }[];
        requestBody: unknown;
        responses: Record<string, unknown>;
      };
    }
  >;
  components: { schemas: Record<string, unknown> };
};

describe('openApiDocument', () => {
  it('describes the service', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.title).toBe('IELTS API');
    expect(document.info.version).toBe('1.0.0');
    expect(document.servers[0]?.url).toBe('http://localhost:3000/');
    expect(document.components.schemas.ApiResponse).toBeDefined();
    expect(document.components.schemas.ApiError).toBeDefined();
  });

  it('documents every route except the documentation endpoints', () => {
    expect(Object.keys(document.paths)).not.toContain('/docs');
    expect(Object.keys(document.paths)).not.toContain('/openapi.json');
    expect(Object.keys(document.paths)).toContain('/v1/vocabulary');
    expect(document.paths['/v1/bands']?.get.summary).toContain('band scale');
  });

  it('declares query parameters for documented endpoints', () => {
    const parameters = document.paths['/v1/vocabulary']?.get.parameters ?? [];
    expect(parameters.map((parameter) => parameter.name)).toContain('q');
    expect(parameters.map((parameter) => parameter.name)).toContain('volume');
  });

  it('leaves undocumented endpoints without parameters', () => {
    expect(document.paths['/health']?.get.parameters).toEqual([]);
  });

  it('declares path parameters for parameterised routes', () => {
    const parameters = document.paths['/v1/vocabulary/:word']?.get.parameters ?? [];
    expect(parameters).toEqual([{ name: 'word', in: 'path', required: true, schema: { type: 'string' } }]);
  });

  it('adds a POST operation to the body-bearing analysis endpoints', () => {
    const path = document.paths['/v1/analyze/readability'];
    expect(path?.post?.operationId).toBe('v1_analyze_readability_post');
    expect(path?.post?.requestBody).toBeDefined();
    expect(path?.post?.parameters.map((parameter) => parameter.name)).not.toContain('text');
    expect(path?.get.parameters?.map((parameter) => parameter.name)).toContain('text');
    expect(Object.keys(path?.post?.responses ?? {})).toEqual(expect.arrayContaining(['413', '415', '422']));
  });

  it('leaves GET-only endpoints without a POST operation', () => {
    expect(document.paths['/v1/analyze/devices']?.post).toBeUndefined();
    expect(document.paths['/v1/vocabulary']?.post).toBeUndefined();
  });

  it('accepts an empty route table', () => {
    const empty = openApiDocument([], 'http://x/', '1.0.0') as { paths: Record<string, JsonValue> };
    expect(empty.paths).toEqual({});
  });
});
