import { describe, expect, it } from 'vitest';

import { CITATION, DOI_IS_PLACEHOLDER, ZENODO_CONCEPT_DOI } from '../../src/data/citation.js';
import { UPSTREAM_CITATIONS } from '../../src/data/citation.js';
import { API_VERSION, REPOSITORY_URL } from '../../src/version.js';

describe('the canonical citation record', () => {
  it('agrees with the package version and repository', () => {
    expect(CITATION.version).toBe(API_VERSION);
    expect(CITATION.url).toBe(REPOSITORY_URL);
    expect(CITATION.repository).toBe(REPOSITORY_URL);
  });

  it('carries the three fields Google Scholar requires', () => {
    expect(CITATION.title.length).toBeGreaterThan(20);
    expect(CITATION.authors.length).toBeGreaterThan(0);
    expect(CITATION.year).toBeGreaterThan(2000);
  });

  it('carries an author-written abstract and keywords', () => {
    expect(CITATION.abstract.length).toBeGreaterThan(300);
    expect(CITATION.keywords).toContain('IELTS');
    expect(CITATION.keywords.length).toBeGreaterThan(5);
  });

  it('uses a valid publication date', () => {
    expect(CITATION.month).toBeGreaterThanOrEqual(1);
    expect(CITATION.month).toBeLessThanOrEqual(12);
    expect(CITATION.day).toBeGreaterThanOrEqual(1);
    expect(CITATION.day).toBeLessThanOrEqual(31);
  });

  it('flags the DOI as an unminted placeholder', () => {
    expect(CITATION.doi).toBe(ZENODO_CONCEPT_DOI);
    expect(DOI_IS_PLACEHOLDER).toBe(true);
  });

  it('names the upstream corpus so users can cite it too', () => {
    expect(UPSTREAM_CITATIONS).toHaveLength(1);
    const upstream = UPSTREAM_CITATIONS[0]!;
    expect(upstream.type).toBe('dataset');
    expect(upstream.doi).toBeNull();
    expect(upstream.url).toContain('zhengyishiming');
  });
});
