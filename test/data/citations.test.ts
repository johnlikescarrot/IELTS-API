import { describe, expect, it } from 'vitest';

import {
  CITATION_FORMATS,
  CITATION_STYLES,
  citationRecord,
  formatStyle,
  harvestabilityScorecard,
  toBibtex,
  toCff,
  toCodemeta,
  toRis,
} from '../../src/data/citations.js';

import type { CitationStyle } from '../../src/types.js';

describe('citationRecord', () => {
  it('derives every field from the build-time constants', () => {
    const record = citationRecord();
    expect(record.title).toContain('IELTS API');
    expect(record.authors).toBe('The IELTS API contributors');
    expect(record.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(record.year).toBe(2026);
    expect(record.dateReleased).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(record.repositoryUrl).toBe('https://github.com/johnlikescarrot/IELTS-API');
    expect(record.doi).toMatch(/^10\.5281\/zenodo\./);
    expect(record.doiMinted).toBe(false);
    expect(record.codeLicense).toBe('MIT');
    expect(record.dataLicense).toBe('CC BY 4.0');
    expect(record.keywords.length).toBeGreaterThan(5);
    expect(record.abstract.length).toBeGreaterThan(40);
  });
});

describe('the exported format and style catalogues', () => {
  it('lists the machine-readable formats', () => {
    expect(CITATION_FORMATS).toEqual(['bibtex', 'ris', 'codemeta', 'cff']);
  });

  it('lists the human-readable styles', () => {
    expect(CITATION_STYLES).toEqual(['apa', 'mla', 'chicago', 'ieee', 'vancouver', 'harvard']);
  });
});

describe('toBibtex', () => {
  it('renders a software entry with the record fields', () => {
    const bibtex = toBibtex(citationRecord());
    expect(bibtex).toContain('@software{ielts-api-');
    expect(bibtex).toContain('author       = {The IELTS API contributors}');
    expect(bibtex).toContain('doi          = {10.5281/zenodo.');
    expect(bibtex.trimEnd().endsWith('}')).toBe(true);
  });
});

describe('toRis', () => {
  it('renders RIS tags terminated by ER', () => {
    const ris = toRis(citationRecord());
    expect(ris.startsWith('TY  - COMP')).toBe(true);
    expect(ris).toContain('DO  - 10.5281/zenodo.');
    expect(ris).toContain('ER  - ');
  });
});

describe('toCodemeta', () => {
  it('renders schema.org software metadata', () => {
    const codemeta = toCodemeta(citationRecord());
    expect(codemeta['@type']).toBe('SoftwareSourceCode');
    expect(codemeta.identifier).toBe('https://doi.org/10.5281/zenodo.0000000');
    expect(codemeta.programmingLanguage).toBe('TypeScript');
    expect(Array.isArray(codemeta.keywords)).toBe(true);
  });
});

describe('toCff', () => {
  it('renders a Citation File Format document', () => {
    const cff = toCff(citationRecord());
    expect(cff.startsWith('cff-version: 1.2.0')).toBe(true);
    expect(cff).toContain('type: software');
    expect(cff).toContain("value: '10.5281/zenodo.");
  });
});

describe('formatStyle', () => {
  const record = citationRecord();

  it.each([...CITATION_STYLES])('renders the %s style', (style) => {
    const text = formatStyle(record, style as CitationStyle);
    expect(text).toContain('IELTS API');
    expect(text).toContain(record.repositoryUrl);
  });

  it('formats APA with a software bracket', () => {
    expect(formatStyle(record, 'apa')).toContain('[Computer software]');
  });

  it('formats IEEE with a numbered reference', () => {
    expect(formatStyle(record, 'ieee')).toMatch(/^\[1\] /);
  });

  it('formats Vancouver as an internet resource', () => {
    expect(formatStyle(record, 'vancouver')).toContain('[Internet]');
  });

  it('formats Harvard with an access date', () => {
    expect(formatStyle(record, 'harvard')).toContain('(Accessed: ');
  });
});

describe('harvestabilityScorecard', () => {
  it('scores the configured channels', () => {
    const scorecard = harvestabilityScorecard();
    expect(scorecard.total).toBe(scorecard.channels.length);
    expect(scorecard.coverage).toBeCloseTo(scorecard.present / scorecard.total, 2);
    expect(scorecard.channels.some((channel) => channel.id === 'citation-cff')).toBe(true);
    expect(scorecard.channels.some((channel) => channel.id === 'doi')).toBe(true);
  });

  it('recommends minting the DOI when it is still a placeholder', () => {
    const scorecard = harvestabilityScorecard();
    const doiChannel = scorecard.channels.find((channel) => channel.id === 'doi');
    expect(doiChannel?.present).toBe(false);
    expect(scorecard.recommendations.some((line) => line.includes('Mint the Zenodo DOI'))).toBe(true);
  });

  it('marks the DOI channel present once the record is minted', () => {
    const minted = harvestabilityScorecard({ ...citationRecord(), doiMinted: true });
    const doiChannel = minted.channels.find((channel) => channel.id === 'doi');
    expect(doiChannel?.present).toBe(true);
    expect(minted.recommendations.some((line) => line.includes('Mint the Zenodo DOI'))).toBe(false);
  });
});
