import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { CitationRecord } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/citations', () => {
  it('returns the record, export links and the scorecard summary', async () => {
    const response = await server.json<{
      record: CitationRecord;
      formats: Record<string, string>;
      styles: Record<string, string>;
      scorecard: { present: number; total: number; coverage: number };
    }>('/v1/citations');
    expect(response.status).toBe(200);
    expect(response.data.record.title).toContain('IELTS API');
    expect(response.data.formats.bibtex).toBe('/v1/citations/formats/bibtex');
    expect(response.data.styles.apa).toBe('/v1/citations/styles/apa');
    expect(response.data.scorecard.total).toBeGreaterThan(5);
  });
});

describe('GET /v1/citations/formats/:format', () => {
  it('serves BibTeX', async () => {
    const response = await server.request('/v1/citations/formats/bibtex');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-bibtex');
    expect(await response.text()).toContain('@software{');
  });

  it('serves RIS', async () => {
    const response = await server.request('/v1/citations/formats/ris');
    expect(response.headers.get('content-type')).toContain('application/x-research-info-systems');
    expect(await response.text()).toContain('TY  - COMP');
  });

  it('serves CodeMeta as JSON', async () => {
    const response = await server.request('/v1/citations/formats/codemeta');
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['@type']).toBe('SoftwareSourceCode');
  });

  it('serves CFF', async () => {
    const response = await server.request('/v1/citations/formats/cff');
    expect(response.headers.get('content-type')).toContain('text/yaml');
    expect(await response.text()).toContain('cff-version: 1.2.0');
  });

  it('rejects an unknown format', async () => {
    expect((await server.json('/v1/citations/formats/endnote')).status).toBe(400);
  });
});

describe('GET /v1/citations/styles', () => {
  it('lists the supported styles', async () => {
    const response = await server.json<string[]>('/v1/citations/styles');
    expect(response.data).toContain('apa');
    expect(response.meta.count).toBe(6);
  });
});

describe('GET /v1/citations/styles/:style', () => {
  it('renders APA', async () => {
    const response = await server.request('/v1/citations/styles/apa');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toContain('[Computer software]');
  });

  it('renders IEEE', async () => {
    expect(await (await server.request('/v1/citations/styles/ieee')).text()).toMatch(/^\[1\] /);
  });

  it('rejects an unknown style', async () => {
    expect((await server.json('/v1/citations/styles/turabian')).status).toBe(400);
  });
});

describe('GET /v1/citations/scorecard', () => {
  it('reports the discoverability channels', async () => {
    const response = await server.json<{
      present: number;
      total: number;
      channels: { id: string }[];
      recommendations: string[];
    }>('/v1/citations/scorecard');
    expect(response.status).toBe(200);
    expect(response.data.total).toBe(response.data.channels.length);
    expect(response.data.channels.some((channel) => channel.id === 'citation-cff')).toBe(true);
    expect(response.data.recommendations.length).toBeGreaterThan(0);
  });
});
