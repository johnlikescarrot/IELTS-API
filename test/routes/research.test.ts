import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestServer } from '../helpers/server.js';
import { renderCitationBibtex, renderResearchReport } from '../../src/lib/research.js';
import type { TestServer } from '../helpers/server.js';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('scholarly access', () => {
  it('serves the full HTML report without authentication and supports conditional GET and HEAD', async () => {
    const response = await server.request('/research');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.text()).toBe(renderResearchReport());
    expect(
      (await server.request('/research', { headers: { 'if-none-match': response.headers.get('etag')! } }))
        .status,
    ).toBe(304);
    expect(await (await server.request('/research', { method: 'HEAD' })).text()).toBe('');
  });

  it('serves reusable BibTeX and provides ordinary HTML discovery links', async () => {
    const response = await server.request('/citation.bib');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/x-bibtex; charset=utf-8');
    expect(await response.text()).toBe(renderCitationBibtex());
    const docs = await (await server.request('/docs')).text();
    expect(docs).toContain('href="/research"');
    expect(docs).toContain('href="/citation.bib"');
    const root = await server.json<{ citation: { report: string; bibtex: string } }>('/');
    expect(root.data.citation.report).toBe('/research');
    expect(root.data.citation.bibtex).toBe('/citation.bib');
  });
});
