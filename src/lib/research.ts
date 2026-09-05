/** A freely readable technical report and honest software citation, without fabricated identifiers. */
import { practiceIndex } from '../data/practice.js';
import { RECEPTIVE_TASK_SOURCES } from '../data/receptive-tasks.js';
import { escapeHtml } from './html.js';
import { API_VERSION, REPOSITORY_URL } from '../version.js';

/** Identifies an author-written technical-report draft, not a journal publication. */
export const RESEARCH_REPORT = {
  title: 'IELTS API: reproducible, rights-aware metadata for Reading and Listening preparation',
  authors: ['The IELTS API contributors'],
  date: '2026-09-05',
  status: 'Technical report — working draft; not peer reviewed',
} as const;

/** Shared bibliographic title for the software, independent of the report title. */
export const SOFTWARE_CITATION_TITLE =
  'IELTS API: a free, no-authentication TypeScript API for IELTS preparation research';

/** Bibliographic metadata for the software; no DOI is asserted until an archive exists. */
export function renderCitationBibtex(): string {
  return `@software{ielts_api,
  title   = {${SOFTWARE_CITATION_TITLE}},
  author  = {{The IELTS API contributors}},
  year    = {2026},
  version = {${API_VERSION}},
  url     = {${REPOSITORY_URL}},
  license = {MIT; CC-BY-4.0 for original metadata and guidance},
  note    = {For unreleased work, also record the code commit. Upstream content rights are not granted.}
}
`;
}

/** Build prose from the same measured inventory served by the API. */
function article(): {
  abstract: string;
  sections: { title: string; paragraphs: string[] }[];
  references: { title: string; url: string }[];
} {
  const index = practiceIndex();
  return {
    abstract: `IELTS preparation applications often publish several file representations of one learning unit, making file counts an unreliable proxy for usable exercises. We introduce a metadata-only extension to IELTS API, a free, no-authentication TypeScript service with no runtime dependencies. A reproducible allowlist-based analysis of a pinned UPGRADE-YOUR-IELTS-SKILLS repository snapshot identifies ${index.stats.units.toLocaleString('en-US')} units and ${index.stats.assets.toLocaleString('en-US')} file-metadata records. It distinguishes declared inventories from observed units, identifies missing sequences and audio, and provides stable identifiers, seeded sampling and provenance-bearing JSON Lines exports. The extension also supplies original guidance for 11 Academic Reading and 6 Listening task families. It does not redistribute upstream exercise content or infer validated proficiency levels. The contribution is an auditable inventory and research interface, not evidence of instructional efficacy.`,
    sections: [
      {
        title: '1. Motivation and scope',
        paragraphs: [
          'A practice repository can contain a JSON dataset, JavaScript wrapper, rendered HTML, recording and document for the same exercise. Counting each file independently overstates the number of units and obscures missing resources. A research interface should separate identity, provenance, representation availability and content rights.',
          'The upstream project [1] combines a Reading single-page application, generated Listening and full-test pages, and learner/manager workflows. Its project summary describes identity-gated access. This API deliberately does not reproduce that access model: clients need no account, API key, database connection or paid model service. Runtime requests read only locally packaged metadata.',
        ],
      },
      {
        title: '2. Method',
        paragraphs: [
          `We reviewed commit ${index.source.commit} on 2026-09-05. The complete recursive Git tree contains 6,309 entries, including 5,545 blobs. Documentation and implementation scripts were inspected without executing upstream code. Exercise bodies, answer keys, audio, documents, credentials and student records were not fetched or copied.`,
          'The TypeScript compiler accepts only the pinned, non-truncated tree and allowlisted collection paths. It validates regular-file modes, Git blob identifiers, nonnegative byte sizes and unit-number bounds. Duplicate selected paths are rejected. Unrecognised files, dependencies, dashboards, debug artefacts and literal template filenames are excluded.',
          'A unit ID combines its collection label and original unit number. Representations are grouped under that ID and sorted by path; IDs are sorted using locale-independent string order. This preserves gaps and avoids conflating the same number across different collections. SHA-256 is computed over the UTF-8 encoding of JSON.stringify(items), without a trailing newline. The source licence is null, not inherited from the metadata compilation.',
        ],
      },
      {
        title: '3. Results',
        paragraphs: [
          `The index contains ${index.stats.bySkill.reading.toLocaleString('en-US')} Reading and ${index.stats.bySkill.listening} Listening units. Across modes there are ${index.stats.byMode.basic.toLocaleString('en-US')} basic units and ${index.stats.byMode['full-test']} full-test units. The table below compares each declared collection size with its observed inventory.`,
          'Reading full-test number 105 is absent despite the directory name advertising 315 tests. Listening tests 83, 85 and 88 lack the expected audio files. There are 100 literal Test_{idx_num}.html template artefacts; none is treated as a separate unit. Source and processed JSON files, and strategy files, overlap within units and are not counted as additional tests.',
          'The directory labels A1-A2, B1-B2 and C1-C2 are retained as paired Reading ranges. Basic, Intermediate and Advanced Listening labels are retained without assigning CEFR or IELTS equivalents. Asset presence means only that a matching file exists in the pinned tree; it does not establish accessibility, correctness or completeness of its contents.',
        ],
      },
      {
        title: '4. Reproducible access',
        paragraphs: [
          'GET /v1/practice supports substring search, skill, mode, level and asset-kind filters, followed by bounded pagination. GET /v1/practice/sample requires an explicit seed and samples without replacement from the filtered population. The seed is prefixed with the inventory checksum. The versioned algorithm uses the project’s FNV-1a string hash over JavaScript UTF-16 code units, mulberry32 and partial Fisher–Yates selection; results are returned in canonical ID order.',
          'GET /v1/practice/export emits one JSON object per line for the entire filtered population. Each record includes the source commit, rights boundary and inventory checksum. Researchers should archive the export and record the API code revision, index checksum, filters, seed, count and selected IDs. A seed alone is not sufficient across changing datasets or algorithm versions.',
          'The offline compiler and public TypeScript implementation are included in the per-file 100% statement, branch, function and line coverage gate. Tests exercise real HTTP responses, deterministic regeneration, invalid tree inputs, filter boundaries, schema validation and incomplete inventories. Coverage is a structural check, not proof of pedagogical correctness or software security.',
        ],
      },
      {
        title: '5. Independent task-family guidance',
        paragraphs: [
          'The official format descriptions identify 11 Academic Reading families [2] and 6 Listening families [3]. We independently wrote concise focus statements, strategies and common pitfalls for each family. Reading scope is explicitly Academic; Listening applies to Academic and General Training. These are not copied exercises, official band descriptors or guaranteed score-improvement techniques.',
          'The upstream full-test builder includes heuristic answer normalisation and raw-score conversion, and its strategy generator uses a generative model. We do not treat these implementations as authoritative scoring or expert-reviewed explanations. Official IELTS guidance states that raw-score thresholds vary by test version [4]. Individual practice units are not assigned task types, exact question counts or certified band levels from filenames alone.',
        ],
      },
      {
        title: '6. Rights, limitations and future evaluation',
        paragraphs: [
          'No upstream licence was identified in the reviewed snapshot. The original metadata compilation and task-family guidance are offered under CC BY 4.0; this does not confer rights to indexed files. The code is MIT-licensed. The pre-existing vocabulary dataset has separate, unresolved source-gloss provenance limitations documented in RESEARCH.md and is not a basis for assuming that all upstream material is openly licensed.',
          'This descriptive analysis concerns one repository snapshot and does not validate exercise text, answer keys, audio playback, semantic duplicates, learning gains or item difficulty. It contains no learner responses. A future efficacy study would require content permission, independently reviewed annotations, an appropriate sampling design and consented learner data. No such study, peer review, archive DOI or citation impact is claimed here.',
        ],
      },
    ],
    references: [
      {
        title: 'ngoclong1209. UPGRADE-YOUR-IELTS-SKILLS, reviewed repository snapshot (2026).',
        url: `${index.source.repository}/tree/${index.source.commit}`,
      },
      {
        title: 'IELTS partners. IELTS Academic: Reading test format. Accessed 2026-09-05.',
        url: RECEPTIVE_TASK_SOURCES.reading,
      },
      {
        title: 'IELTS partners. IELTS Academic: Listening test format. Accessed 2026-09-05.',
        url: RECEPTIVE_TASK_SOURCES.listening,
      },
      {
        title: 'IELTS partners. Understanding and setting IELTS scores. Accessed 2026-09-05.',
        url: 'https://ielts.org/organisations/ielts-for-organisations/understanding-ielts-scoring',
      },
    ],
  };
}

/** Full, freely readable HTML article with bibliographic tags and no JavaScript dependency. */
export function renderResearchReport(): string {
  const text = article();
  const index = practiceIndex();
  const rows = index.stats.collections
    .map(
      (collection) =>
        `<tr><th scope="row">${escapeHtml(collection.id)}</th><td>${collection.declaredUnits}</td><td>${collection.indexedUnits}</td></tr>`,
    )
    .join('\n');
  const sections = text.sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}</section>`,
    )
    .join('\n');
  const references = text.references
    .map((reference) => `<li><a href="${escapeHtml(reference.url)}">${escapeHtml(reference.title)}</a></li>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(RESEARCH_REPORT.title)}</title>
<meta name="citation_title" content="${escapeHtml(RESEARCH_REPORT.title)}">
${RESEARCH_REPORT.authors.map((author) => `<meta name="citation_author" content="${escapeHtml(author)}">`).join('\n')}
<meta name="citation_publication_date" content="${RESEARCH_REPORT.date.replace(/-/g, '/')}">
<meta name="description" content="${escapeHtml(text.abstract)}">
<style>
body{max-width:54rem;margin:2rem auto;padding:0 1rem;font:17px/1.65 system-ui,sans-serif;color:#17212b;background:#fff}
h1{font-size:1.85rem;line-height:1.25}h2{font-size:1.3rem;margin-top:2rem}a{color:#075aaf}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border-bottom:1px solid #ddd;padding:.4rem;text-align:left}
code{overflow-wrap:anywhere}footer{margin-top:3rem;border-top:1px solid #ddd}.status{color:#52606d}
</style>
</head>
<body>
<article>
<header><h1>${escapeHtml(RESEARCH_REPORT.title)}</h1>
<p>${RESEARCH_REPORT.authors.map(escapeHtml).join('; ')}</p>
<p class="status">${escapeHtml(RESEARCH_REPORT.status)} · ${RESEARCH_REPORT.date}</p></header>
<section><h2>Abstract</h2><p>${escapeHtml(text.abstract)}</p></section>
${sections}
<section><h2>Collection inventory</h2><table><caption>Declared versus observed units in the pinned snapshot</caption><thead><tr><th>Collection</th><th>Declared</th><th>Observed</th></tr></thead><tbody>${rows}</tbody></table></section>
<section><h2>Reproduction record</h2><p>Source commit: <code>${index.source.commit}</code></p><p>Inventory SHA-256: <code>${index.itemsSha256}</code></p><p>API package version: ${API_VERSION}. For unreleased changes, also record the source-code commit.</p></section>
<section><h2>References</h2><ol>${references}</ol></section>
</article>
<footer><p><a href="/docs">API documentation</a> · <a href="/v1/practice/stats">Machine-readable inventory</a> · <a href="/citation.bib">Software citation (BibTeX)</a> · <a href="${REPOSITORY_URL}">Source and reproduction instructions</a></p><p>Not affiliated with or endorsed by the IELTS partners. Indexing and citation counts are not guaranteed.</p></footer>
</body>
</html>
`;
}

/** Archive exactly the same report text and counts in a readable Markdown artifact. */
export function renderResearchMarkdown(): string {
  const text = article();
  const index = practiceIndex();
  return [
    `# ${RESEARCH_REPORT.title}`,
    '',
    RESEARCH_REPORT.authors.join('; '),
    '',
    `${RESEARCH_REPORT.status}. ${RESEARCH_REPORT.date}.`,
    '',
    'Generated by `npm run docs:update`; edit `src/lib/research.ts`, not this file.',
    '',
    '## Abstract',
    '',
    text.abstract,
    '',
    ...text.sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      ...section.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ]),
    '## Collection inventory',
    '',
    '| Collection | Declared | Observed |',
    '| --- | ---: | ---: |',
    ...index.stats.collections.map(
      (collection) => `| ${collection.id} | ${collection.declaredUnits} | ${collection.indexedUnits} |`,
    ),
    '',
    '## Reproduction record',
    '',
    `- Source commit: \`${index.source.commit}\`.`,
    `- Inventory SHA-256: \`${index.itemsSha256}\`.`,
    `- API package version: ${API_VERSION}. Also record the code commit for unreleased work.`,
    '',
    '## References',
    '',
    ...text.references.map((reference, i) => `${i + 1}. ${reference.title} <${reference.url}>`),
    '',
  ].join('\n');
}
