/**
 * Bibliographic metadata for crawlers.
 *
 * Google Scholar does not read a repository, a README or an OpenAPI document.
 * It reads a landing page, and it reads it through a small, strict contract:
 * Highwire Press `citation_*` tags in the head, a full text it can reach in one
 * hop, and an author-written abstract visible without scrolling, clicking or
 * signing in. Failing any one of those makes the work invisible to the index no
 * matter how good it is.
 *
 * This module emits that contract. The three required fields — title, first
 * author and year — are always present; `citation_pdf_url` links the landing
 * page to the generated PDF so the two are indexed as one work rather than as
 * two competing records that split the citation count between them.
 *
 * Dublin Core, Open Graph and schema.org JSON-LD are emitted alongside for the
 * crawlers that prefer them. Scholar treats Dublin Core as a last resort, so it
 * is additional to, never a replacement for, the Highwire tags.
 */

import { authorName, isoDate, slashDate } from './citation.js';
import { jsonLdBody, metaProperty, metaTag } from './html.js';

import type { CitationRecord, JsonValue } from '../types.js';

/** Everything the tag builders need beyond the bibliographic record. */
export interface ScholarContext {
  /** Absolute URL of the HTML landing page carrying these tags. */
  abstractUrl: string;
  /** Absolute URL of the full text in PDF, in the same directory. */
  pdfUrl: string;
  /** Institution credited for the technical report. */
  institution: string;
}

/**
 * Highwire Press tags, the scheme Google Scholar's own examples use.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 */
export function highwireTags(record: CitationRecord, context: ScholarContext): string[] {
  const tags = [metaTag('citation_title', record.title)];
  for (const author of record.authors) {
    tags.push(metaTag('citation_author', authorName(author)));
  }
  tags.push(metaTag('citation_publication_date', slashDate(record)));
  tags.push(metaTag('citation_online_date', slashDate(record)));
  tags.push(metaTag('citation_technical_report_institution', context.institution));
  tags.push(metaTag('citation_technical_report_number', `ielts-api-${record.version}`));
  tags.push(metaTag('citation_publisher', record.publisher));
  tags.push(metaTag('citation_language', record.language));
  tags.push(metaTag('citation_abstract_html_url', context.abstractUrl));
  tags.push(metaTag('citation_fulltext_html_url', context.abstractUrl));
  tags.push(metaTag('citation_pdf_url', context.pdfUrl));
  if (record.doi !== null) {
    tags.push(metaTag('citation_doi', record.doi));
  }
  for (const keyword of record.keywords) {
    tags.push(metaTag('citation_keywords', keyword));
  }
  return tags;
}

/**
 * Dublin Core tags, for crawlers that prefer them.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 */
export function dublinCoreTags(record: CitationRecord, context: ScholarContext): string[] {
  const tags = [metaTag('DC.title', record.title)];
  for (const author of record.authors) {
    tags.push(metaTag('DC.creator', authorName(author)));
  }
  tags.push(metaTag('DC.date', isoDate(record)));
  tags.push(metaTag('DC.publisher', record.publisher));
  tags.push(metaTag('DC.type', 'Text'));
  tags.push(metaTag('DC.format', 'text/html'));
  tags.push(metaTag('DC.identifier', context.pdfUrl));
  tags.push(metaTag('DC.language', record.language));
  tags.push(metaTag('DC.rights', record.license));
  tags.push(metaTag('DC.description', record.abstract));
  tags.push(metaTag('DC.subject', record.keywords.join('; ')));
  return tags;
}

/**
 * Open Graph and Twitter tags, so a shared link previews as a paper.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 */
export function socialTags(record: CitationRecord, context: ScholarContext): string[] {
  return [
    metaProperty('og:type', 'article'),
    metaProperty('og:title', record.title),
    metaProperty('og:description', record.abstract),
    metaProperty('og:url', context.abstractUrl),
    metaProperty('og:site_name', 'IELTS API'),
    metaProperty('article:published_time', isoDate(record)),
    metaTag('twitter:card', 'summary'),
    metaTag('twitter:title', record.shortTitle),
    metaTag('twitter:description', record.abstract.slice(0, 200)),
  ];
}

/**
 * A schema.org graph describing the work, its dataset and its software.
 *
 * Scholar itself ignores JSON-LD, but Google Search, Datacite harvesters and
 * dataset search engines do not, and a `Dataset` node is what gets the corpus
 * surfaced in Google Dataset Search.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 * @param datasetSizes - Row counts keyed by dataset name, for `variableMeasured`.
 */
export function jsonLdGraph(
  record: CitationRecord,
  context: ScholarContext,
  datasetSizes: Readonly<Record<string, number>>,
): JsonValue {
  const authors = record.authors.map((author) => ({
    '@type': 'Organization',
    name: authorName(author),
  }));
  const identifier = record.doi === null ? context.abstractUrl : `https://doi.org/${record.doi}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ScholarlyArticle',
        '@id': context.abstractUrl,
        headline: record.title,
        name: record.title,
        alternateName: record.shortTitle,
        author: authors,
        datePublished: isoDate(record),
        abstract: record.abstract,
        keywords: record.keywords.join(', '),
        inLanguage: record.language,
        license: record.license,
        identifier,
        url: context.abstractUrl,
        encoding: { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: context.pdfUrl },
        isAccessibleForFree: true,
        creditText: record.title,
        publisher: { '@type': 'Organization', name: record.publisher },
      },
      {
        '@type': 'Dataset',
        '@id': `${context.abstractUrl}#dataset`,
        name: 'IELTS API open datasets',
        description:
          'Machine-readable IELTS preparation data: Cambridge IELTS 1-22 vocabulary, analytic band descriptors, score concordances, raw-score conversion tables, the Listening and Reading question-type taxonomy, test-format blueprints and task banks.',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: authors,
        isAccessibleForFree: true,
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${new URL('/v1', context.abstractUrl).toString()}`,
        },
        variableMeasured: Object.entries(datasetSizes).map(([name, value]) => ({
          '@type': 'PropertyValue',
          name,
          value,
        })),
        citation: identifier,
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${context.abstractUrl}#software`,
        name: record.shortTitle,
        description: record.abstract,
        codeRepository: record.repository,
        programmingLanguage: 'TypeScript',
        license: 'https://opensource.org/licenses/MIT',
        version: record.version,
        author: authors,
      },
    ],
  };
}

/**
 * Every crawler-facing tag for one landing page, ready to drop into `<head>`.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 * @param datasetSizes - Row counts used by the JSON-LD `Dataset` node.
 * @returns The tags joined by newlines.
 */
export function scholarHead(
  record: CitationRecord,
  context: ScholarContext,
  datasetSizes: Readonly<Record<string, number>>,
): string {
  return [
    ...highwireTags(record, context),
    ...dublinCoreTags(record, context),
    ...socialTags(record, context),
    `<link rel="canonical" href="${context.abstractUrl}">`,
    `<link rel="alternate" type="application/pdf" href="${context.pdfUrl}">`,
    '<script type="application/ld+json">',
    jsonLdBody(jsonLdGraph(record, context, datasetSizes)),
    '</script>',
  ].join('\n');
}
