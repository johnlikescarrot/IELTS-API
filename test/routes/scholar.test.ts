import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CITATION } from '../../src/data/citation.js';
import { SITEMAP_PATHS } from '../../src/routes/scholar.js';
import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /paper', () => {
  it('serves an HTML landing page', async () => {
    const response = await server.request('/paper');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  });

  it('carries the three meta tags Google Scholar requires', async () => {
    const html = await (await server.request('/paper')).text();
    expect(html).toContain(`<meta name="citation_title" content="${CITATION.title}">`);
    expect(html).toContain('<meta name="citation_author"');
    expect(html).toContain('<meta name="citation_publication_date"');
  });

  it('points citation_pdf_url at a sibling file in the same directory', async () => {
    const html = await (await server.request('/paper')).text();
    const pdfUrl = /<meta name="citation_pdf_url" content="([^"]+)">/.exec(html)![1]!;
    expect(pdfUrl).toBe(`${server.base}/paper.pdf`);
    expect(new URL(pdfUrl).pathname.endsWith('.pdf')).toBe(true);
    expect((await server.request('/paper.pdf')).status).toBe(200);
  });

  it('shows the abstract to the reader, not only to the crawler', async () => {
    const html = await (await server.request('/paper')).text();
    const bodyIndex = html.indexOf('<body>');
    expect(html.indexOf('<h2>Abstract</h2>')).toBeGreaterThan(bodyIndex);
    expect(html.slice(bodyIndex)).toContain(CITATION.abstract.slice(0, 60));
  });

  it('ends with a numbered reference list', async () => {
    const html = await (await server.request('/paper')).text();
    expect(html).toMatch(/<h2>References<\/h2>\s*<ol>/);
  });

  it('embeds parseable JSON-LD', async () => {
    const html = await (await server.request('/paper')).text();
    const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!;
    const graph = JSON.parse(body) as { '@graph': { '@type': string }[] };
    expect(graph['@graph'].map((node) => node['@type'])).toContain('Dataset');
  });

  it('quotes the live dataset sizes', async () => {
    const html = await (await server.request('/paper')).text();
    expect(html).toContain('4174 headwords');
    expect(html).toContain('404 files');
  });
});

describe('GET /paper.pdf', () => {
  it('serves a PDF', async () => {
    const response = await server.request('/paper.pdf');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
  });

  it('is a structurally valid PDF file', async () => {
    const body = await (await server.request('/paper.pdf')).text();
    expect(body.startsWith('%PDF-1.4')).toBe(true);
    expect(body.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(body).toContain('/Type /Catalog');
  });

  it('opens with the title and authors, as Scholar wants', async () => {
    const body = await (await server.request('/paper.pdf')).text();
    expect(body).toContain('/F2 24 Tf');
    expect(body).toContain('The IELTS API contributors');
    expect(body).toContain('References');
  });

  it('is served under a stable ETag', async () => {
    const first = await server.request('/paper.pdf');
    const etag = first.headers.get('etag') as string;
    const second = await server.request('/paper.pdf', { headers: { 'if-none-match': etag } });
    expect(second.status).toBe(304);
  });
});

describe('GET /robots.txt', () => {
  it('admits every crawler and advertises the sitemap', async () => {
    const response = await server.request('/robots.txt');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain(`Sitemap: ${server.base}/sitemap.xml`);
    expect(body).not.toContain('Disallow');
  });
});

describe('GET /sitemap.xml', () => {
  it('serves XML listing every stable path', async () => {
    const response = await server.request('/sitemap.xml');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    const body = await response.text();
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const path of SITEMAP_PATHS) {
      expect(body, path).toContain(`<loc>${server.base}${path}</loc>`);
    }
  });

  it('gives the paper and the index the highest priority', async () => {
    const body = await (await server.request('/sitemap.xml')).text();
    expect((body.match(/<priority>1\.0<\/priority>/g) ?? []).length).toBe(2);
  });

  it('lists only paths the service actually serves', async () => {
    for (const path of SITEMAP_PATHS) {
      const response = await server.request(path);
      expect(response.status, path).toBe(200);
    }
  });
});
