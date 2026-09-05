import { describe, expect, it } from 'vitest';
import { renderResearch, RESEARCH_TITLE } from '../../src/lib/research.js';
import { practiceMeta } from '../../src/data/practice.js';

describe('the scholarly report draft', () => {
  it('contains a visible abstract, full methods/results, references and truthful citation tags', () => {
    const html = renderResearch('1.1.0');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain(`<h1>${RESEARCH_TITLE}</h1>`);
    expect(html).toContain(`name="citation_title" content="${RESEARCH_TITLE}"`);
    expect(html).toContain('name="citation_author" content="The IELTS API contributors"');
    expect(html).toContain('name="citation_publication_date" content="2026/09/05"');
    for (const text of [
      'Abstract',
      'Materials and methods',
      'Results',
      'References',
      '1,852',
      '1,853',
      'not a representative sample',
      'unreviewed project report',
      'No DOI',
      '51 lack',
    ]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(practiceMeta().contentSha256);
    expect(html).toContain(practiceMeta().source.commit);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('citation_doi');
    expect(html).not.toContain('citation_journal_title');
  });

  it('escapes interpolated values', () => {
    const html = renderResearch('<script>alert("x")</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
