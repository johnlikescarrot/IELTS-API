import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { format } from 'prettier';
import {
  RESEARCH_REPORT,
  renderCitationBibtex,
  renderResearchMarkdown,
  renderResearchReport,
  SOFTWARE_CITATION_TITLE,
} from '../../src/lib/research.js';
import { practiceIndex } from '../../src/data/practice.js';
import { API_VERSION, REPOSITORY_URL } from '../../src/version.js';

describe('the freely readable research report', () => {
  it('publishes an actual abstract and full text with bibliographic tags, not a metadata-only landing page', () => {
    const html = renderResearchReport();
    expect(html).toContain(`<meta name="citation_title" content="${RESEARCH_REPORT.title}">`);
    expect(html).toContain('<meta name="citation_author" content="The IELTS API contributors">');
    expect(html).toContain('<meta name="citation_publication_date" content="2026/09/05">');
    expect(html).toContain('<h2>Abstract</h2>');
    expect(html).toContain('<h2>References</h2>');
    expect(html).toContain('working draft; not peer reviewed');
    expect(html).toContain('1,852 units');
    expect(html).toContain('4,606 file-metadata records');
    expect(html).toContain(practiceIndex().itemsSha256);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('citation_doi');
    expect(html).not.toContain('citation_pdf_url');
    expect(Buffer.byteLength(html)).toBeLessThan(5_000_000);
  });

  it('archives the same report in Markdown and records limitations rather than impact claims', async () => {
    const markdown = renderResearchMarkdown();
    expect(markdown).toContain(RESEARCH_REPORT.title);
    expect(markdown).toContain(practiceIndex().itemsSha256);
    expect(markdown).toContain('learner responses');
    expect(markdown).toContain('null, not inherited');
    const archived = readFileSync(new URL('../../paper/practice-metadata.md', import.meta.url), 'utf8');
    expect(archived).toBe(await format(markdown, { parser: 'markdown', printWidth: 110, singleQuote: true }));
  });

  it('uses consistent software citation fields and never invents a DOI', () => {
    const bib = renderCitationBibtex();
    expect(bib).toContain(SOFTWARE_CITATION_TITLE);
    expect(bib).toContain(`version = {${API_VERSION}}`);
    expect(bib).toContain(REPOSITORY_URL);
    expect(bib).toContain('also record the code commit');
    expect(bib.toLowerCase()).not.toContain('doi');
    expect(readFileSync(new URL('../../docs/citation.bib', import.meta.url), 'utf8')).toBe(bib);
  });
});
