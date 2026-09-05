import { describe, expect, it } from 'vitest';

import { CITATION } from '../../src/data/citation.js';
import { dublinCoreTags, highwireTags, jsonLdGraph, scholarHead, socialTags } from '../../src/lib/scholar.js';

import type { ScholarContext } from '../../src/lib/scholar.js';
import type { CitationRecord } from '../../src/types.js';

const CONTEXT: ScholarContext = {
  abstractUrl: 'https://ielts.example/paper',
  pdfUrl: 'https://ielts.example/paper.pdf',
  institution: 'Test Institution',
};

const SIZES = { vocabularyHeadwords: 4174, questionTypes: 17 };

/** The same record with no DOI minted yet. */
const NO_DOI: CitationRecord = { ...CITATION, doi: null };

describe('highwireTags', () => {
  const tags = highwireTags(CITATION, CONTEXT).join('\n');

  it('emits the three fields Google Scholar requires for inclusion', () => {
    expect(tags).toContain(`<meta name="citation_title" content="${CITATION.title}">`);
    expect(tags).toContain('<meta name="citation_author" content="The IELTS API contributors">');
    expect(tags).toContain('<meta name="citation_publication_date" content="2026/09/05">');
  });

  it('links the landing page to the PDF so both index as one work', () => {
    expect(tags).toContain('<meta name="citation_pdf_url" content="https://ielts.example/paper.pdf">');
    expect(tags).toContain('<meta name="citation_abstract_html_url" content="https://ielts.example/paper">');
  });

  it('identifies the work as a technical report', () => {
    expect(tags).toContain('<meta name="citation_technical_report_institution" content="Test Institution">');
    expect(tags).toContain('<meta name="citation_technical_report_number" content="ielts-api-1.0.0">');
  });

  it('emits one keyword tag per keyword', () => {
    const count = highwireTags(CITATION, CONTEXT).filter((tag) =>
      tag.includes('name="citation_keywords"'),
    ).length;
    expect(count).toBe(CITATION.keywords.length);
  });

  it('includes the DOI when one is minted and omits it otherwise', () => {
    expect(tags).toContain('<meta name="citation_doi" content="10.5281/zenodo.0000000">');
    expect(highwireTags(NO_DOI, CONTEXT).join('\n')).not.toContain('citation_doi');
  });

  it('never emits the deprecated plural author tag', () => {
    expect(tags).not.toContain('citation_authors');
  });
});

describe('dublinCoreTags', () => {
  it('mirrors the record in Dublin Core', () => {
    const tags = dublinCoreTags(CITATION, CONTEXT).join('\n');
    expect(tags).toContain(`<meta name="DC.title" content="${CITATION.title}">`);
    expect(tags).toContain('<meta name="DC.creator" content="The IELTS API contributors">');
    expect(tags).toContain('<meta name="DC.date" content="2026-09-05">');
    expect(tags).toContain('<meta name="DC.identifier" content="https://ielts.example/paper.pdf">');
  });
});

describe('socialTags', () => {
  it('describes the page as an article', () => {
    const tags = socialTags(CITATION, CONTEXT).join('\n');
    expect(tags).toContain('<meta property="og:type" content="article">');
    expect(tags).toContain('<meta name="twitter:card" content="summary">');
    expect(tags).toContain('<meta property="article:published_time" content="2026-09-05">');
  });
});

describe('jsonLdGraph', () => {
  it('describes the article, the dataset and the software', () => {
    const graph = jsonLdGraph(CITATION, CONTEXT, SIZES) as {
      '@graph': { '@type': string; identifier?: string }[];
    };
    expect(graph['@graph'].map((node) => node['@type'])).toEqual([
      'ScholarlyArticle',
      'Dataset',
      'SoftwareSourceCode',
    ]);
    expect(graph['@graph'][0]!.identifier).toBe('https://doi.org/10.5281/zenodo.0000000');
  });

  it('falls back to the landing page when there is no DOI', () => {
    const graph = jsonLdGraph(NO_DOI, CONTEXT, SIZES) as { '@graph': { identifier?: string }[] };
    expect(graph['@graph'][0]!.identifier).toBe('https://ielts.example/paper');
  });

  it('publishes the dataset sizes as measured variables', () => {
    const graph = jsonLdGraph(CITATION, CONTEXT, SIZES) as {
      '@graph': { variableMeasured?: { name: string; value: number }[] }[];
    };
    expect(graph['@graph'][1]!.variableMeasured).toEqual([
      { '@type': 'PropertyValue', name: 'vocabularyHeadwords', value: 4174 },
      { '@type': 'PropertyValue', name: 'questionTypes', value: 17 },
    ]);
  });

  it('serialises to valid JSON', () => {
    expect(() => JSON.stringify(jsonLdGraph(CITATION, CONTEXT, SIZES))).not.toThrow();
  });
});

describe('scholarHead', () => {
  const head = scholarHead(CITATION, CONTEXT, SIZES);

  it('combines every scheme with the canonical and alternate links', () => {
    expect(head).toContain('citation_title');
    expect(head).toContain('DC.title');
    expect(head).toContain('og:type');
    expect(head).toContain('<link rel="canonical" href="https://ielts.example/paper">');
    expect(head).toContain('<link rel="alternate" type="application/pdf"');
  });

  it('embeds a single parseable JSON-LD block', () => {
    const body = head.slice(
      head.indexOf('<script type="application/ld+json">') + 35,
      head.lastIndexOf('</script>'),
    );
    expect(() => JSON.parse(body) as unknown).not.toThrow();
  });
});
