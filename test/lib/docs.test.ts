import { describe, expect, it } from 'vitest';

import { escapeHtml, renderDocs } from '../../src/lib/docs.js';
import { ROUTES } from '../../src/routes/index.js';

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('IELTS 1-22')).toBe('IELTS 1-22');
  });
});

describe('renderDocs', () => {
  const page = renderDocs(ROUTES, '1.0.0', 'https://github.com/johnlikescarrot/IELTS-API');

  it('renders a complete HTML document', () => {
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('lists every route', () => {
    for (const route of ROUTES) {
      expect(page).toContain(route.path);
      expect(page).toContain(route.summary);
    }
  });

  it('advertises the datasets, the citation block and the licence', () => {
    expect(page).toContain('4,174');
    expect(page).toContain('@software{theieltsapicontributors2026ielts');
    expect(page).toContain('https://github.com/johnlikescarrot/IELTS-API');
    expect(page).toContain('MIT');
    expect(page).toContain('CC BY 4.0');
  });

  it('describes itself as a WebAPI in JSON-LD and defers citation to /paper', () => {
    const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page)![1]!;
    const graph = JSON.parse(body) as { '@type': string; citation: string };
    expect(graph['@type']).toBe('WebAPI');
    expect(graph.citation).toBe('/paper');
  });

  it('does not carry Highwire tags, which belong only to /paper', () => {
    expect(page).not.toContain('citation_title');
    expect(page).not.toContain('citation_author');
  });

  it('links the paper, the PDF and the citation endpoint', () => {
    expect(page).toContain('href="/paper"');
    expect(page).toContain('href="/paper.pdf"');
    expect(page).toContain('/v1/citation?format=bibtex');
  });

  it('escapes the values it interpolates', () => {
    const injected = renderDocs(
      [
        {
          method: 'GET',
          path: '/v1/<script>',
          versioned: true,
          summary: '"><script>alert(1)</script>',
          handler: () => ({ data: null }),
        },
      ],
      '9.9.9',
      'https://example.org/<repo>',
    );
    expect(injected).not.toContain('<script>alert(1)</script>');
    expect(injected).toContain('&lt;script&gt;');
  });
});
