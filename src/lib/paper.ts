/**
 * The paper: one work, three surfaces.
 *
 * The content below is written once as structured blocks and rendered to an
 * HTML landing page and to a PDF full text. Google Scholar treats several URLs
 * as instances of the same work only when their bibliographic data agree
 * exactly, so generating both surfaces from one source is not a convenience —
 * it is what stops the index from splitting this work in two and halving its
 * citation count.
 */

import { authorName, isoDate, toApa, toBibtex } from './citation.js';
import { escapeHtml } from './html.js';
import { scholarHead } from './scholar.js';

import type { PdfBlock, PdfDocument } from './pdf.js';
import type { ScholarContext } from './scholar.js';
import type { CitationRecord } from '../types.js';

/** A paragraph or a bulleted item inside a section. */
export type PaperBlock = { kind: 'paragraph'; text: string } | { kind: 'bullet'; text: string };

/** A numbered section of the paper. */
export interface PaperSection {
  /** Section heading. */
  heading: string;
  /** Section content. */
  blocks: readonly PaperBlock[];
}

/** One entry of the reference list. */
export interface PaperReference {
  /** Position in the numbered list, from 1. */
  index: number;
  /** Formal bibliographic citation, with no free-form commentary. */
  text: string;
  /** Resolvable URL, when the work has one. */
  url: string | null;
}

/** Numbers quoted throughout the paper, supplied by the live datasets. */
export interface PaperFigures {
  /** Headwords in the vocabulary dataset. */
  words: number;
  /** Word occurrences across the Cambridge volumes. */
  occurrences: number;
  /** Cambridge IELTS volumes covered. */
  volumes: number;
  /** Files in the upstream corpus. */
  corpusFiles: number;
  /** Files in the upstream corpus that are IELTS material. */
  corpusRelevant: number;
  /** Question types in the Listening and Reading taxonomy. */
  questionTypes: number;
  /** Endpoints served. */
  endpoints: number;
}

/**
 * Build the body of the paper.
 *
 * @param figures - Live dataset sizes, so the prose can never drift from the data.
 */
export function paperSections(figures: PaperFigures): readonly PaperSection[] {
  return [
    {
      heading: '1. Statement of need',
      blocks: [
        {
          kind: 'paragraph',
          text: 'IELTS is taken by millions of candidates a year and studied by a substantial applied-linguistics community, yet almost none of the material that community works with is machine-readable. Vocabulary lists are published in workbooks, band descriptors in PDFs, score concordances in marketing pages, and practice material inside proprietary e-book containers. Researchers who need IELTS data therefore hand-build spreadsheets that cannot be cited, versioned or reproduced, and those datasets die with the project that produced them.',
        },
        {
          kind: 'paragraph',
          text:
            'The problem is not only availability but provenance. Public IELTS corpora are typically unfiltered dumps. The corpus this work builds on contains ' +
            `${figures.corpusFiles} files, of which only ${figures.corpusRelevant} are IELTS or English-learning material; the remainder are semiconductor textbooks, popular music and cryptocurrency books. An unfiltered crawler treats a lithography textbook as IELTS training data, and no published figure warns it not to.`,
        },
        {
          kind: 'paragraph',
          text: 'This work addresses three concrete needs: a citable target, so a paper can cite a version rather than a URL that may vanish; a reusable data layer carrying provenance down to the individual row; and a service that does not gate access, so the same request works from a browser, a notebook, a teaching lab behind a restrictive proxy, or an archived snapshot.',
        },
      ],
    },
    {
      heading: '2. Datasets',
      blocks: [
        {
          kind: 'bullet',
          text: `Vocabulary: ${figures.words} headwords and ${figures.occurrences} volume occurrences extracted from the Cambridge IELTS ${figures.volumes}-volume word lists, each with phonetic transcription, part-of-speech-tagged senses, morpheme hints and volume provenance.`,
        },
        {
          kind: 'bullet',
          text: 'Analytic band descriptors: condensed, original paraphrases for Speaking, Writing Task 1 and Writing Task 2 across bands 0 to 9. These are deliberately not the official wording, which is copyright; the authoritative text is cited in reference [3].',
        },
        {
          kind: 'bullet',
          text: 'Score concordances: indicative mappings between the IELTS band and CEFR, TOEFL iBT, the Cambridge English Scale, PTE Academic and the Duolingo English Test, each carrying the provider it was compiled from.',
        },
        {
          kind: 'bullet',
          text: 'Raw-score conversion: exhaustive raw-to-band tables over 0 to 40 for Listening, Academic Reading and General Training Reading. Every row records whether its boundary is reproduced from agreeing public sources or extrapolated by this project, and rows where public tables materially disagree carry the competing boundary, so a study can report the sensitivity of its results to the choice of table.',
        },
        {
          kind: 'bullet',
          text: `Question-type taxonomy: all ${figures.questionTypes} Listening and Reading question types, with the construct each is designed to measure, its answer format, whether its answers follow the order of the text, and original strategy and error notes.`,
        },
        {
          kind: 'bullet',
          text: 'Test-format blueprints: the fixed structure of all six papers, with part-level item counts, timings, register and focus, so a practice instrument can be shown to match the real test.',
        },
        {
          kind: 'bullet',
          text: 'Task banks and a corpus index: Writing Task 1 families, Writing Task 2 prompts, Speaking items for Parts 1 to 3, and a metadata-only index of the upstream corpus. Upstream files are never redistributed.',
        },
      ],
    },
    {
      heading: '3. Design',
      blocks: [
        {
          kind: 'paragraph',
          text: `The service exposes ${figures.endpoints} read-only HTTP endpoints. There is no API key, no registration, no per-key rate limiting and no CORS restriction. Every JSON response uses one envelope — status, data, meta — so a client can parse any endpoint with the same code, and every response carries provenance in its metadata rather than in prose elsewhere.`,
        },
        {
          kind: 'paragraph',
          text: 'The implementation has zero runtime dependencies: it is built directly on the Node.js standard library, in strict TypeScript with unchecked index access and exact optional property types enabled. A dependency-free service can be installed in an air-gapped teaching lab, audited in an afternoon, and is not subject to the supply-chain drift that makes a five-year-old research service unrunnable.',
        },
        {
          kind: 'paragraph',
          text: 'Responses are deterministic. Sampling is seeded, identifiers are stable, and every body carries an ETag derived from its own content, so a response archived today can be re-fetched and diffed years later. That property, rather than throughput, is what a reproducibility claim actually requires.',
        },
      ],
    },
    {
      heading: '4. Reproducibility and quality control',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Both derived datasets are regenerated from source by standard-library-only Python scripts committed alongside the data. Continuous integration re-derives the vocabulary dataset from the upstream workbook on every push and fails the build if the committed file has drifted, so the published data provably matches its stated provenance.',
        },
        {
          kind: 'paragraph',
          text: 'The test suite enforces 100 per cent statement, branch, function and line coverage per file as a release gate, and the whole repository is linted on every push, every pull request and weekly by super-linter across TypeScript, JSON, YAML, Markdown, shell and container definitions.',
        },
      ],
    },
    {
      heading: '5. Limitations',
      blocks: [
        {
          kind: 'paragraph',
          text: 'The raw-to-band tables are indicative. The IELTS partners re-equate boundaries for every test version and publish no definitive table, so a converted band should be read as an estimate carrying roughly half a band of table uncertainty. The API makes that uncertainty explicit rather than hiding it behind a single number, but it cannot remove it.',
        },
        {
          kind: 'paragraph',
          text: 'Score concordances are indicative in the same sense: receiving institutions apply their own, usually stricter, rules. The band descriptors are original paraphrases and must not be quoted as the official criteria. Finally, the upstream corpus is dominated by Writing and Reading material and contains almost no genuine Listening audio, so the vocabulary dataset inherits that bias and this work makes no claim to cover listening comprehension at the item level.',
        },
      ],
    },
  ];
}

/** The reference list, formatted as formal citations with no commentary. */
export const PAPER_REFERENCES: readonly PaperReference[] = [
  {
    index: 1,
    text: 'Coxhead, A. (2000). A new academic word list. TESOL Quarterly, 34(2), 213-238.',
    url: 'https://doi.org/10.2307/3587951',
  },
  {
    index: 2,
    text: 'zhengyishiming. (2024). IELTS: an open corpus of IELTS preparation materials. GitHub.',
    url: 'https://github.com/zhengyishiming/IELTS',
  },
  {
    index: 3,
    text: 'British Council, IDP: IELTS Australia, & Cambridge Assessment English. (2025). IELTS scoring in detail.',
    url: 'https://www.ielts.org/for-organisations/ielts-scoring-in-detail',
  },
  {
    index: 4,
    text: 'Council of Europe. (2020). Common European Framework of Reference for Languages: learning, teaching, assessment. Companion volume. Council of Europe Publishing.',
    url: null,
  },
  {
    index: 5,
    text: 'Wilkinson, M. D., Dumontier, M., Aalbersberg, I. J., et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Scientific Data, 3, 160018.',
    url: 'https://doi.org/10.1038/sdata.2016.18',
  },
  {
    index: 6,
    text: 'Smith, A. M., Katz, D. S., & Niemeyer, K. E. (2016). Software citation principles. PeerJ Computer Science, 2, e86.',
    url: 'https://doi.org/10.7717/peerj-cs.86',
  },
];

/**
 * Render the paper as an HTML landing page.
 *
 * The page satisfies Google Scholar's content guidelines directly: the title is
 * the largest text and sits in an `h1`, the authors are in a `citation_author`
 * class immediately below it, the author-written abstract is visible without
 * scrolling or interaction, and the references are a numbered `ol` of formal
 * citations.
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 * @param figures - Live dataset sizes.
 * @param datasetSizes - Row counts for the JSON-LD `Dataset` node.
 */
export function renderPaperHtml(
  record: CitationRecord,
  context: ScholarContext,
  figures: PaperFigures,
  datasetSizes: Readonly<Record<string, number>>,
): string {
  const sections = paperSections(figures);
  const authors = record.authors.map(authorName).join(', ');

  const body = sections
    .map((section) => {
      const bullets = section.blocks.filter((block) => block.kind === 'bullet');
      const paragraphs = section.blocks
        .filter((block) => block.kind === 'paragraph')
        .map((block) => `<p>${escapeHtml(block.text)}</p>`)
        .join('\n');
      const list =
        bullets.length === 0
          ? ''
          : `<ul>\n${bullets.map((block) => `  <li>${escapeHtml(block.text)}</li>`).join('\n')}\n</ul>`;
      return `<section>\n<h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}\n${list}\n</section>`;
    })
    .join('\n');

  const references = PAPER_REFERENCES.map((reference) => {
    const text = escapeHtml(reference.text);
    const link =
      reference.url === null
        ? ''
        : ` <a href="${escapeHtml(reference.url)}">${escapeHtml(reference.url)}</a>`;
    return `  <li>${text}${link}</li>`;
  }).join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(record.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(record.title)}</title>
${scholarHead(record, context, datasetSizes)}
<style>
  :root { color-scheme: light dark; --fg: #111; --bg: #fff; --muted: #5b6470; --line: #e3e6ea; --accent: #0b6bcb; }
  @media (prefers-color-scheme: dark) { :root { --fg: #e8eaf0; --bg: #12151a; --muted: #9aa4b2; --line: #262b33; --accent: #6cb6ff; } }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 46rem; padding: 2.5rem 1.25rem 4rem; background: var(--bg); color: var(--fg);
    font: 16px/1.65 Georgia, "Iowan Old Style", "Times New Roman", serif; }
  h1.citation_title { font-size: 1.9rem; line-height: 1.25; margin: 0 0 .6rem; font-weight: 700; }
  .citation_author { font-size: 1.05rem; margin: 0 0 .35rem; }
  .citation_line { font-size: .85rem; color: var(--muted); font-style: italic; margin: 0 0 1.75rem; }
  h2 { font-size: 1.12rem; margin: 2rem 0 .6rem; padding-bottom: .3rem; border-bottom: 1px solid var(--line); }
  .abstract { border-left: 3px solid var(--accent); padding: .1rem 0 .1rem 1rem; margin: 0 0 1.5rem; }
  .abstract h2 { border: 0; margin: 0 0 .4rem; font-size: 1rem; text-transform: uppercase; letter-spacing: .06em; }
  a { color: var(--accent); }
  ul, ol { padding-left: 1.4rem; }
  li { margin-bottom: .5rem; }
  pre { background: rgba(128,128,128,.12); padding: .9rem; border-radius: 8px; overflow-x: auto;
        font: .8rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .downloads { margin: 1.5rem 0; font-size: .95rem; }
  footer { margin-top: 3rem; border-top: 1px solid var(--line); padding-top: 1rem; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<article>
<h1 class="citation_title">${escapeHtml(record.title)}</h1>
<p class="citation_author">${escapeHtml(authors)}</p>
<p class="citation_line">Technical report ielts-api-${escapeHtml(record.version)}. ${escapeHtml(record.publisher)}, ${escapeHtml(isoDate(record))}.${record.doi === null ? '' : ` doi:${escapeHtml(record.doi)}`}</p>

<div class="abstract">
<h2>Abstract</h2>
<p>${escapeHtml(record.abstract)}</p>
</div>

<p class="downloads"><strong>Full text:</strong> <a href="${escapeHtml(context.pdfUrl)}">PDF</a>
&middot; <strong>Data and code:</strong> <a href="${escapeHtml(record.repository)}">repository</a>
&middot; <strong>Live API:</strong> <a href="/v1">/v1</a>
&middot; <strong>Citation:</strong> <a href="/v1/citation?format=bibtex">BibTeX</a>,
<a href="/v1/citation?format=ris">RIS</a>,
<a href="/v1/citation?format=csl-json">CSL-JSON</a></p>

${body}

<section>
<h2>Citing this work</h2>
<p>${escapeHtml(toApa(record))}</p>
<pre>${escapeHtml(toBibtex(record))}</pre>
</section>

<section>
<h2>References</h2>
<ol>
${references}
</ol>
</section>
</article>
<footer>
<p>Code released under the MIT licence; datasets under CC BY 4.0. IELTS is a jointly owned trademark of the
British Council, IDP: IELTS Australia and Cambridge Assessment English. This project is not affiliated with,
endorsed by, or connected to the IELTS partners.</p>
</footer>
</body>
</html>
`;
}

/**
 * Build the PDF full text of the paper.
 *
 * The layout follows Google Scholar's guidance for author-hosted papers: the
 * title is the largest text at the top of page 1, the authors are on the line
 * directly below it, a formal bibliographic citation follows, and the file ends
 * with a numbered section headed "References".
 *
 * @param record - Bibliographic record.
 * @param context - Landing-page URLs.
 * @param figures - Live dataset sizes.
 */
export function paperPdfDocument(
  record: CitationRecord,
  context: ScholarContext,
  figures: PaperFigures,
): PdfDocument {
  const authors = record.authors.map(authorName).join(', ');
  const blocks: PdfBlock[] = [
    { kind: 'title', text: record.title },
    { kind: 'authors', text: authors },
    {
      kind: 'citation',
      text: `Technical report ielts-api-${record.version}. ${record.publisher}, ${isoDate(record)}.${record.doi === null ? '' : ` doi:${record.doi}`} Available at ${context.abstractUrl}`,
    },
    { kind: 'space', height: 10 },
    { kind: 'heading', text: 'Abstract' },
    { kind: 'paragraph', text: record.abstract },
  ];

  for (const section of paperSections(figures)) {
    blocks.push({ kind: 'heading', text: section.heading });
    for (const block of section.blocks) {
      blocks.push(
        block.kind === 'bullet'
          ? { kind: 'bullet', text: block.text }
          : { kind: 'paragraph', text: block.text },
      );
    }
  }

  blocks.push({ kind: 'heading', text: 'References' });
  for (const reference of PAPER_REFERENCES) {
    blocks.push({
      kind: 'reference',
      index: reference.index,
      text: reference.url === null ? reference.text : `${reference.text} ${reference.url}`,
    });
  }

  return {
    title: record.title,
    author: authors,
    subject: record.abstract,
    keywords: record.keywords.join(', '),
    date: isoDate(record).replace(/-/g, ''),
    blocks,
  };
}
