import { describe, expect, it } from 'vitest';

import { CITATION_FORMATS, citationBundle, longDate, renderCitation } from '../../src/lib/citation.js';

import type { CitationWork } from '../../src/lib/citation.js';

const WORK: CitationWork = {
  title: 'IELTS API',
  authors: 'The IELTS API contributors',
  version: '1.3.0',
  year: 2026,
  url: 'https://github.com/johnlikescarrot/IELTS-API',
  doi: '10.5281/zenodo.0000000',
  publisher: 'Zenodo',
  accessed: '2026-09-05',
};

describe('longDate', () => {
  it('renders an ISO date in long form without a leading zero', () => {
    expect(longDate('2026-09-05')).toBe('5 September 2026');
    expect(longDate('2026-01-31')).toBe('31 January 2026');
    expect(longDate('2026-12-01')).toBe('1 December 2026');
  });
});

describe('renderCitation', () => {
  it('supports exactly the five advertised formats', () => {
    expect(CITATION_FORMATS).toEqual(['bibtex', 'apa', 'mla', 'chicago', 'ris']);
  });

  it('renders a BibTeX software entry', () => {
    const text = renderCitation(WORK, 'bibtex');
    expect(text.startsWith('@software{ielts_api_2026,')).toBe(true);
    expect(text).toContain('version      = {1.3.0}');
    expect(text.trimEnd().endsWith('}')).toBe(true);
  });

  it('renders APA with the DOI as a URL', () => {
    expect(renderCitation(WORK, 'apa')).toBe(
      'The IELTS API contributors. (2026). IELTS API (Version 1.3.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.0000000',
    );
  });

  it('renders MLA with a long access date', () => {
    expect(renderCitation(WORK, 'mla')).toContain('Accessed 5 September 2026.');
  });

  it('renders Chicago author-date', () => {
    expect(renderCitation(WORK, 'chicago')).toContain('. 2026. IELTS API (version 1.3.0).');
  });

  it('renders an importable RIS record', () => {
    const lines = renderCitation(WORK, 'ris').split('\n');
    expect(lines[0]).toBe('TY  - COMP');
    expect(lines.at(-1)).toBe('ER  - ');
    expect(lines).toContain('Y2  - 2026-09-05');
  });
});

describe('citationBundle', () => {
  it('renders every format once and echoes the work metadata', () => {
    const bundle = citationBundle(WORK);
    expect(bundle.citations.map((citation) => citation.format)).toEqual([...CITATION_FORMATS]);
    expect(bundle.citations.every((citation) => citation.text.length > 0)).toBe(true);
    expect(bundle.version).toBe('1.3.0');
    expect(bundle.accessed).toBe('2026-09-05');
    expect(bundle.doi).toBe(WORK.doi);
    expect(bundle.url).toBe(WORK.url);
    expect(bundle.title).toBe(WORK.title);
    expect(bundle.authors).toBe(WORK.authors);
    expect(bundle.year).toBe(2026);
  });
});
