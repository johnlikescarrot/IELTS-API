import { describe, expect, it } from 'vitest';

import { escapeHtml, jsonLdBody, metaProperty, metaTag } from '../../src/lib/html.js';

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });

  it('escapes the ampersand first so entities are not double-encoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('IELTS 1-22')).toBe('IELTS 1-22');
  });
});

describe('metaTag', () => {
  it('renders a name/content pair', () => {
    expect(metaTag('citation_title', 'A title')).toBe('<meta name="citation_title" content="A title">');
  });

  it('escapes a quotation mark that would otherwise truncate the record', () => {
    expect(metaTag('citation_title', 'The "best" API')).toBe(
      '<meta name="citation_title" content="The &quot;best&quot; API">',
    );
  });
});

describe('metaProperty', () => {
  it('renders a property/content pair', () => {
    expect(metaProperty('og:title', 'IELTS API')).toBe('<meta property="og:title" content="IELTS API">');
  });

  it('escapes both values', () => {
    expect(metaProperty('og:"x"', '<y>')).toBe('<meta property="og:&quot;x&quot;" content="&lt;y&gt;">');
  });
});

describe('jsonLdBody', () => {
  it('pretty-prints JSON', () => {
    expect(jsonLdBody({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('stops a payload breaking out of the script element', () => {
    const body = jsonLdBody({ title: '</script><script>alert(1)</script>' });
    expect(body).not.toContain('</script>');
    expect(body).toContain('\\u003c/script\\u003e');
  });

  it('stays parseable, and parses back to the original text', () => {
    const original = { title: '<a> & </b>' };
    expect(JSON.parse(jsonLdBody(original)) as typeof original).toEqual(original);
  });
});
