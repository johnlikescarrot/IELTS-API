import { readFileSync } from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';

import { openApiDocument } from '../../src/lib/openapi.js';
import { DOMAIN_ROUTES } from '../../src/routes/index.js';
import { API_VERSION } from '../../src/version.js';
import { WRITING_EXERCISE_KINDS } from '../../src/data/writingExercises.js';

const generated = () => openApiDocument(DOMAIN_ROUTES, 'https://ielts-api.example/', API_VERSION);

describe('the interoperable writing-practice OpenAPI contract', () => {
  it('validates the entire OpenAPI 3.1 document without external references', async () => {
    const document = structuredClone(generated()) as unknown as SwaggerParser['api'];
    await expect(SwaggerParser.validate(document, { resolve: { external: false } })).resolves.toBeDefined();
  });

  it('keeps the archived contract identical to the live generator', () => {
    const archived = JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'));
    expect(archived).toEqual(generated());
  });

  it('uses standard {parameter} syntax for every parameterised path', () => {
    const document = generated() as {
      paths: Record<string, { get: { parameters: { name: string; in: string; required?: boolean }[] } }>;
    };
    expect(Object.keys(document.paths).some((path) => path.includes(':'))).toBe(false);
    for (const route of DOMAIN_ROUTES) {
      const path = route.path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
      const operation = document.paths[path]!.get;
      for (const match of path.matchAll(/\{(.*?)\}/g)) {
        expect(operation.parameters).toContainEqual({
          name: match[1],
          in: 'path',
          required: true,
          schema: { type: 'string' },
        });
      }
    }
  });

  it('documents actual query limits and the SVG media type, not a JSON figure envelope', () => {
    const document = generated() as {
      paths: Record<
        string,
        {
          get: {
            parameters: { name: string; required?: boolean; schema: unknown }[];
            responses: Record<string, { content: Record<string, unknown> }>;
          };
        }
      >;
    };
    const list = document.paths['/v1/practice/writing']!.get;
    expect(list.parameters.find((p) => p.name === 'kind')!.schema).toEqual({
      type: 'string',
      enum: [...WRITING_EXERCISE_KINDS],
    });
    expect(list.parameters.find((p) => p.name === 'offset')!.schema).toEqual({
      type: 'integer',
      minimum: 0,
      maximum: 1000,
      default: 0,
    });
    const check = document.paths['/v1/practice/writing/{id}/check']!.get;
    expect(check.parameters.filter((p) => p.required).map((p) => p.name)).toEqual([
      'question',
      'answer',
      'id',
    ]);
    expect(
      Object.keys(document.paths['/v1/practice/writing/{id}/figure']!.get.responses['200']!.content),
    ).toEqual(['image/svg+xml']);
  });

  it('declares typed exercise and feedback payloads and the actual error envelope', () => {
    const document = generated() as {
      components: { schemas: Record<string, { required: string[]; properties: Record<string, unknown> }> };
    };
    const schemas = document.components.schemas;
    expect(schemas.WritingExercise!.required).toContain('stimulus');
    expect(schemas.WritingExercise!.required).toContain('checks');
    expect(schemas.WritingExercise!.properties.minimumWords).toEqual({ type: 'integer', const: 150 });
    expect(schemas.WritingFeedback!.required).toContain('correct');
    expect(schemas.WritingFeedback!.properties).not.toHaveProperty('band');
    expect(schemas.ApiError!.required).toEqual(['status', 'data', 'meta']);
    expect(schemas.ApiError!.properties).toHaveProperty('meta');
  });
});
