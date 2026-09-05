import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CITATION_CONTENT_TYPES, CITATION_FORMATS } from '../../src/lib/citation.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/citation', () => {
  it('returns every format in one envelope by default', async () => {
    const response = await server.json<{
      record: { title: string; doiUrl: string };
      formats: Record<string, string>;
    }>('/v1/citation');
    expect(response.status).toBe(200);
    expect(Object.keys(response.data.formats)).toEqual([...CITATION_FORMATS]);
    expect(response.data.record.doiUrl).toContain('https://doi.org/');
    expect(response.meta.doiIsPlaceholder).toBe(true);
    expect(response.meta.upstream).toBe(false);
    expect(response.meta.guidance).toContain('Cite the version you used');
  });

  it('includes a CSL-JSON object alongside the rendered strings', async () => {
    const response = await server.json<{ csl: { type: string; title: string } }>('/v1/citation');
    expect(response.data.csl.type).toBe('software');
    expect(response.data.csl.title).toContain('IELTS API');
  });

  it('serves each format verbatim with the right content type', async () => {
    for (const format of CITATION_FORMATS) {
      const response = await server.request(`/v1/citation?format=${format}`);
      expect(response.status, format).toBe(200);
      expect(response.headers.get('content-type'), format).toBe(CITATION_CONTENT_TYPES[format]);
      const body = await response.text();
      expect(body.length, format).toBeGreaterThan(20);
      expect(body, format).not.toContain('"status": 200');
    }
  });

  it('serves BibTeX that starts with an entry type', async () => {
    const body = await (await server.request('/v1/citation?format=bibtex')).text();
    expect(body.startsWith('@software{')).toBe(true);
    expect(body).toContain('title     = {IELTS API');
  });

  it('serves RIS that a reference manager can parse', async () => {
    const body = await (await server.request('/v1/citation?format=ris')).text();
    expect(body.startsWith('TY  - COMP')).toBe(true);
    expect(body.trimEnd().endsWith('ER  -')).toBe(true);
  });

  it('serves parseable CSL-JSON', async () => {
    const body = await (await server.request('/v1/citation?format=csl-json')).text();
    const parsed = JSON.parse(body) as { type: string };
    expect(parsed.type).toBe('software');
  });

  it('cites the upstream corpus on request', async () => {
    const body = await (await server.request('/v1/citation?upstream=true&format=bibtex')).text();
    expect(body).toContain('zhengyishiming');
    expect(body.startsWith('@misc{')).toBe(true);
  });

  it('reports the upstream flag in the envelope', async () => {
    const response = await server.json<{ record: { title: string } }>('/v1/citation?upstream=true');
    expect(response.meta.upstream).toBe(true);
    expect(response.data.record.title).toContain('open corpus');
  });

  it('rejects an unknown format', async () => {
    const response = await server.json('/v1/citation?format=wordperfect');
    expect(response.status).toBe(400);
    expect((response.meta.error as { details: Record<string, string> }).details.allowed).toContain('bibtex');
  });

  it('rejects a non-boolean upstream flag', async () => {
    expect((await server.json('/v1/citation?upstream=perhaps')).status).toBe(400);
  });

  it('serves a stable ETag so a citation can be cached', async () => {
    const first = await server.request('/v1/citation?format=bibtex');
    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();
    const second = await server.request('/v1/citation?format=bibtex', {
      headers: { 'if-none-match': etag as string },
    });
    expect(second.status).toBe(304);
  });
});
