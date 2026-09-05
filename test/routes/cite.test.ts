import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { API_VERSION } from '../../src/version.js';
import { startTestServer } from '../helpers/server.js';
import { workFor, WORK_DOI, WORK_TITLE } from '../../src/routes/cite.js';

import type { TestServer } from '../helpers/server.js';
import type { CitationBundle } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('workFor', () => {
  it('assembles the work metadata for an access date', () => {
    const work = workFor('2026-09-05');
    expect(work.title).toBe(WORK_TITLE);
    expect(work.version).toBe(API_VERSION);
    expect(work.doi).toBe(WORK_DOI);
    expect(work.accessed).toBe('2026-09-05');
    expect(work.publisher).toBe('Zenodo');
  });
});

describe('GET /v1/cite', () => {
  it('returns every citation format by default', async () => {
    const response = await server.json<CitationBundle>('/v1/cite?accessed=2026-09-05');
    expect(response.status).toBe(200);
    expect(response.data.version).toBe(API_VERSION);
    expect(response.data.accessed).toBe('2026-09-05');
    expect(response.data.citations.map((citation) => citation.format)).toEqual([
      'bibtex',
      'apa',
      'mla',
      'chicago',
      'ris',
    ]);
    expect(response.meta.formats).toEqual(['bibtex', 'apa', 'mla', 'chicago', 'ris']);
    expect((response.meta.machineReadable as Record<string, string>).cff).toContain('CITATION.cff');
  });

  it('defaults the access date to today', async () => {
    const response = await server.json<CitationBundle>('/v1/cite');
    expect(response.data.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a single format as plain text', async () => {
    const response = await server.request('/v1/cite?format=bibtex&accessed=2026-09-05');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    const body = await response.text();
    expect(body.startsWith('@software{')).toBe(true);
    expect(body.endsWith('}\n')).toBe(true);
  });

  it('renders RIS as plain text too', async () => {
    const response = await server.request('/v1/cite?format=ris');
    const body = await response.text();
    expect(body.startsWith('TY  - COMP')).toBe(true);
  });

  it('rejects an unknown format', async () => {
    const response = await server.json('/v1/cite?format=endnote');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('must be one of');
  });

  it('rejects an invalid access date', async () => {
    const response = await server.json('/v1/cite?accessed=2026-02-30');
    expect(response.status).toBe(400);
    expect((response.meta.error as { message: string }).message).toContain('valid calendar date');
  });
});
