import { describe, expect, it } from 'vitest';

import { CITATION, UPSTREAM_CITATIONS } from '../../src/data/citation.js';
import {
  CITATION_CONTENT_TYPES,
  CITATION_EXTENSIONS,
  CITATION_FORMATS,
  authorName,
  authorNameNatural,
  bibtexKey,
  doiUrl,
  escapeBibtex,
  formatCitation,
  isoDate,
  slashDate,
  toApa,
  toBibtex,
  toChicago,
  toCslJson,
  toEndnote,
  toHarvard,
  toMla,
  toRis,
  toText,
} from '../../src/lib/citation.js';

import type { CitationRecord } from '../../src/types.js';

/** A record with a personal author, no DOI and a dataset type. */
const PERSONAL: CitationRecord = {
  type: 'dataset',
  title: 'A study of {braces} & 100% specials',
  shortTitle: 'Specials',
  authors: [
    { family: 'Coxhead', given: 'Averil', literal: '' },
    { family: 'Nation', given: 'Paul', literal: '' },
  ],
  year: 2000,
  month: 3,
  day: 7,
  publisher: 'Test Publisher',
  version: '2.0.0',
  doi: null,
  url: 'https://example.org/dataset',
  repository: 'https://example.org/repo',
  license: 'CC0',
  language: 'en',
  keywords: ['lexis'],
  abstract: 'An abstract.',
};

/** A record with a mononymous author. */
const MONONYM: CitationRecord = { ...PERSONAL, authors: [{ family: 'Prince', given: '', literal: '' }] };

/** A record with no authors at all. */
const ANONYMOUS: CitationRecord = { ...PERSONAL, authors: [] };

describe('author rendering', () => {
  it('prefers the literal name for collective authors', () => {
    expect(authorName(CITATION.authors[0]!)).toBe('The IELTS API contributors');
    expect(authorNameNatural(CITATION.authors[0]!)).toBe('The IELTS API contributors');
  });

  it('renders a personal author family-first and given-first', () => {
    expect(authorName(PERSONAL.authors[0]!)).toBe('Coxhead, Averil');
    expect(authorNameNatural(PERSONAL.authors[0]!)).toBe('Averil Coxhead');
  });

  it('renders a mononymous author without a comma', () => {
    expect(authorName(MONONYM.authors[0]!)).toBe('Prince');
    expect(authorNameNatural(MONONYM.authors[0]!)).toBe('Prince');
  });
});

describe('bibtexKey', () => {
  it('builds a stable lowercase key', () => {
    expect(bibtexKey(CITATION)).toBe('theieltsapicontributors2026ielts');
  });

  it('falls back to anon when there is no author', () => {
    expect(bibtexKey(ANONYMOUS)).toBe('anon2000ielts');
  });

  it('falls back to anon when the name has no alphanumerics', () => {
    const symbols: CitationRecord = { ...PERSONAL, authors: [{ family: '???', given: '', literal: '' }] };
    expect(bibtexKey(symbols)).toBe('anon2000ielts');
  });
});

describe('escapeBibtex', () => {
  it('escapes every character BibTeX treats as markup', () => {
    expect(escapeBibtex('{a} & b_c 100% $x# ~^\\')).toBe('\\{a\\} \\& b\\_c 100\\% \\$x\\# \\~\\^\\\\');
  });
});

describe('dates', () => {
  it('zero-pads both forms', () => {
    expect(slashDate(PERSONAL)).toBe('2000/03/07');
    expect(isoDate(PERSONAL)).toBe('2000-03-07');
    expect(slashDate(CITATION)).toBe('2026/09/05');
  });
});

describe('doiUrl', () => {
  it('resolves a DOI and reports its absence', () => {
    expect(doiUrl(CITATION)).toBe('https://doi.org/10.5281/zenodo.0000000');
    expect(doiUrl(PERSONAL)).toBeNull();
  });
});

describe('toBibtex', () => {
  it('emits a software entry with the DOI', () => {
    const bibtex = toBibtex(CITATION);
    expect(bibtex.startsWith('@software{')).toBe(true);
    expect(bibtex).toContain('doi       = {10.5281/zenodo.0000000}');
    expect(bibtex.trimEnd().endsWith('}')).toBe(true);
  });

  it('emits a misc entry and omits an absent DOI', () => {
    const bibtex = toBibtex(PERSONAL);
    expect(bibtex.startsWith('@misc{')).toBe(true);
    expect(bibtex).not.toContain('doi');
    expect(bibtex).toContain('\\{braces\\}');
    expect(bibtex).toContain('author    = {Coxhead, Averil and Nation, Paul}');
  });
});

describe('toRis', () => {
  it('emits COMP for software with a DOI', () => {
    const ris = toRis(CITATION);
    expect(ris.startsWith('TY  - COMP')).toBe(true);
    expect(ris).toContain('DO  - 10.5281/zenodo.0000000');
    expect(ris.trimEnd().endsWith('ER  -')).toBe(true);
  });

  it('emits DATA for datasets and omits an absent DOI', () => {
    const ris = toRis(PERSONAL);
    expect(ris.startsWith('TY  - DATA')).toBe(true);
    expect(ris).not.toContain('DO  - ');
    expect(ris).toContain('AU  - Coxhead, Averil');
    expect(ris).toContain('AU  - Nation, Paul');
  });
});

describe('toEndnote', () => {
  it('includes the DOI when there is one', () => {
    expect(toEndnote(CITATION)).toContain('%R 10.5281/zenodo.0000000');
  });

  it('omits the DOI when there is none', () => {
    const enw = toEndnote(PERSONAL);
    expect(enw).not.toContain('%R ');
    expect(enw).toContain('%A Coxhead, Averil');
    expect(enw).toContain('%K lexis');
  });
});

describe('toCslJson', () => {
  it('uses a literal author for collective authors and includes the DOI', () => {
    const csl = toCslJson(CITATION) as Record<string, unknown>;
    expect(csl['type']).toBe('software');
    expect(csl['DOI']).toBe('10.5281/zenodo.0000000');
    expect(csl['author']).toEqual([{ literal: 'The IELTS API contributors' }]);
    expect(csl['issued']).toEqual({ 'date-parts': [[2026, 9, 5]] });
  });

  it('splits personal authors and omits an absent DOI', () => {
    const csl = toCslJson(PERSONAL) as Record<string, unknown>;
    expect(csl['type']).toBe('dataset');
    expect(csl).not.toHaveProperty('DOI');
    expect(csl['author']).toEqual([
      { family: 'Coxhead', given: 'Averil' },
      { family: 'Nation', given: 'Paul' },
    ]);
  });
});

describe('narrative styles', () => {
  it('renders APA with the DOI and the software descriptor', () => {
    expect(toApa(CITATION)).toContain('[Computer software]');
    expect(toApa(CITATION)).toContain('https://doi.org/10.5281/zenodo.0000000');
  });

  it('renders APA with the data-set descriptor and the URL when there is no DOI', () => {
    const apa = toApa(PERSONAL);
    expect(apa).toContain('[Data set]');
    expect(apa).toContain('https://example.org/dataset');
    expect(apa).toContain('Coxhead, Averil & Nation, Paul');
  });

  it('renders MLA, Chicago and Harvard', () => {
    expect(toMla(PERSONAL)).toContain('Coxhead, Averil and Nation, Paul.');
    expect(toChicago(PERSONAL)).toContain('2000.');
    expect(toHarvard(PERSONAL)).toContain('Available at: https://example.org/dataset');
  });

  it('renders a plain sentence with natural name order', () => {
    expect(toText(PERSONAL)).toContain('Averil Coxhead and Paul Nation');
    expect(toText(CITATION)).toContain('IELTS API version 1.0.0');
  });

  it('renders a single author without a conjunction', () => {
    expect(toMla(MONONYM)).toContain('Prince. "');
  });

  it('renders no author at all', () => {
    expect(toApa(ANONYMOUS).startsWith(' (2000).')).toBe(true);
  });
});

describe('formatCitation', () => {
  it('supports every advertised format', () => {
    for (const format of CITATION_FORMATS) {
      const rendered = formatCitation(CITATION, format);
      expect(rendered.length, format).toBeGreaterThan(20);
      expect(rendered.endsWith('\n'), format).toBe(true);
    }
  });

  it('renders csl-json as parseable JSON', () => {
    const parsed = JSON.parse(formatCitation(CITATION, 'csl-json')) as { title: string };
    expect(parsed.title).toBe(CITATION.title);
  });

  it('renders the text format through the default branch', () => {
    expect(formatCitation(CITATION, 'text')).toBe(`${toText(CITATION)}\n`);
  });

  it('renders the upstream corpus record', () => {
    expect(formatCitation(UPSTREAM_CITATIONS[0]!, 'bibtex')).toContain('zhengyishiming');
  });

  it('publishes a content type and extension for every format', () => {
    for (const format of CITATION_FORMATS) {
      expect(CITATION_CONTENT_TYPES[format]).toContain('/');
      expect(CITATION_EXTENSIONS[format]).toMatch(/^[a-z]+$/);
    }
  });
});
