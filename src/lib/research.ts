/** An accessible, self-contained technical report, not a claim of peer review. */
import { practiceCollections, practiceMeta, practiceStats } from '../data/practice.js';
import { escapeHtml } from './docs.js';

/** Title of the practice-inventory technical report. */
export const RESEARCH_TITLE =
  'A reproducible metadata audit of IELTS reading and listening practice collections';

/** Render the full report and truthful citation tags without JavaScript or external assets. */
export function renderResearch(version: string): string {
  const meta = practiceMeta();
  const stats = practiceStats();
  const collections = practiceCollections();
  const source = `${meta.source.repository}/tree/${meta.source.commit}`;
  const expected = collections.reduce((sum, collection) => sum + collection.expectedUnits, 0);
  const rows = collections
    .map(
      (collection) =>
        `<tr><th scope="row">${escapeHtml(collection.name)}</th><td>${collection.expectedUnits}</td><td>${stats.byCollection[collection.id]}</td><td>${escapeHtml(collection.requiredRoles.join(', '))}</td></tr>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${RESEARCH_TITLE}</title>
<meta name="citation_title" content="${RESEARCH_TITLE}">
<meta name="citation_author" content="The IELTS API contributors">
<meta name="citation_publication_date" content="2026/09/05">
<meta name="description" content="A metadata-only, reproducible structural audit. No test questions, answers, audio, student records or upstream code are redistributed.">
<style>
body { max-width: 55rem; margin: 2rem auto; padding: 0 1.25rem; font: 17px/1.65 system-ui, sans-serif; color: #192534; background: #fff; }
h1 { line-height: 1.2; } h2 { margin-top: 2rem; } a { color: #064f9c; }
table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: .4rem; border-bottom: 1px solid #ccd5df; }
pre { overflow: auto; background: #f1f4f8; padding: 1rem; } code { overflow-wrap: anywhere; }
.notice { border-left: 4px solid #617da0; padding-left: 1rem; }
</style>
</head>
<body>
<nav aria-label="Project"><a href="/docs">API documentation</a> · <a href="/v1/practice/export">Metadata snapshot</a></nav>
<article>
<header><h1>${RESEARCH_TITLE}</h1><p>The IELTS API contributors</p><p><time datetime="2026-09-05">5 September 2026</time> · Technical report draft · API ${escapeHtml(version)}</p></header>
<h2>Abstract</h2>
<p>Publicly visible learning repositories can be mistaken for complete, openly licensed datasets.
We inventory a pinned snapshot of UPGRADE-YOUR-IELTS-SKILLS using Git paths, byte sizes and blob identifiers only.
Across ${stats.repositoryFiles.toLocaleString('en-US')} repository files, we identify ${stats.units.toLocaleString('en-US')} lesson/test units and ${stats.indexedAssets.toLocaleString('en-US')} associated assets.
The collection names and documentation imply ${expected.toLocaleString('en-US')} units. Of the observed units, ${stats.incompleteUnits} lack at least one required asset role under our published policy.
We release original descriptive metadata, a deterministic TypeScript extractor, a checksum-verifiable snapshot and an authentication-free query API.
These findings concern structural availability, not pedagogical quality, answer correctness, CEFR calibration or permission to reuse source content.</p>
<p class="notice">This is an unreviewed project report. No DOI, publication acceptance, Google Scholar indexing or citation count is claimed.</p>
<h2>1. Research question and scope</h2>
<p>How closely do the source's advertised collection sizes agree with its committed asset structure?
The unit of analysis is a path-defined lesson or full test, not a question or learner.
The earlier IELTS API corpus has limited listening coverage; this second source supplies a complementary structural case study, not a representative sample of IELTS preparation resources.</p>
<h2>2. Materials and methods</h2>
<p>Source: <a href="${escapeHtml(source)}">ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS</a>, commit <code>${escapeHtml(meta.source.commit)}</code>, dated ${escapeHtml(meta.source.committedAt)}; tree <code>${escapeHtml(meta.source.tree)}</code>. Audit date: 5 September 2026.</p>
<p>We request the recursive Git tree and reject truncated responses, wrong snapshot identifiers, malformed blob records and duplicate paths.
Explicit path rules select canonical lesson/test assets. No upstream code is executed. Directories, submodules, symlinks, dependencies, authentication files, logs, workbooks, templates and nonmatching files are excluded from the asset catalogue.
A unit ID encodes its collection, source level label (if any) and sequence number; inserting another unit does not renumber existing IDs.</p>
<p>Assets are ordered by path and units by ID using code-point comparisons. JSON and JavaScript representations of a reading lesson remain one unit.
A unit is structurally complete only when every role in the following table has a matching path. File presence alone cannot establish that a file parses, an audio track plays, or the content is educationally valid.</p>
<table><caption>Advertised versus observed units and required asset roles</caption><thead><tr><th scope="col">Collection</th><th scope="col">Expected</th><th scope="col">Observed</th><th scope="col">Required roles</th></tr></thead><tbody>${rows}</tbody></table>
<h2>3. Results</h2>
<p>The source contains ${stats.repositoryBytes.toLocaleString('en-US')} committed blob bytes (not a deduplicated download size).
The catalogue selects ${stats.indexedAssets.toLocaleString('en-US')} assets and excludes ${stats.excludedFiles} files.
It contains ${stats.bySkill.listening} listening units and ${stats.bySkill.reading} reading units; ${stats.completeUnits.toLocaleString('en-US')} units satisfy the structural policy.</p>
<p>Reading full-test directory 105 is absent. Among observed listening full tests, JSON is absent for 3, 34 and 51; audio is absent for 83, 85 and 88.
Forty-five observed reading full tests lack canonical question JSON. All 1,232 basic reading lessons have paired JSON/JavaScript paths; the source groups them into A1–A2 (198), B1–B2 (374) and C1–C2 (660), not six independently validated proficiency levels.</p>
<p>We observe ${stats.duplicateBlobGroups} repeated Git-blob groups and ${stats.repeatedBlobReferences} references beyond the first occurrence in those groups.
This measures identical Git objects, not near-duplicate passages, semantic equivalence, independent test forms or leakage-free evaluation splits.</p>
<h2>4. Reproducibility</h2>
<p>The full <a href="/v1/practice/export">JSON snapshot</a> is served without an API key or authentication.
Its payload digest is <code>${escapeHtml(meta.contentSha256)}</code>.
Compute SHA-256 over the UTF-8 bytes of <code>JSON.stringify([catalog.collections, catalog.stats, catalog.items])</code>; the metadata is excluded to avoid self-reference.
The checksum verifies payload identity, not ownership or the truth of educational claims.</p>
<pre><code>npm ci
npm run data:practice -- tree.json reproduced.json
npm run validate
npm run docs:generate</code></pre>
<p>Fetch the exact tree identified above, not a moving branch. The data card records the download command, scope rules and verification procedure.
CI re-derives the snapshot from that pinned tree. Offline unit tests use synthetic metadata and reconcile every committed count and digest.</p>
<p>For repeatable selection use <code>/v1/practice/sample?seed=study-2026&amp;count=10</code> and record the payload digest, seed, filters and requested count.
Sampling is without replacement using FNV-1a, mulberry32 and partial Fisher–Yates; results are capped at the matching population and returned in ID order.</p>
<h2>5. Rights, privacy and limitations</h2>
<p>The upstream snapshot has no repository-level content licence. Its project summary describes login and payment, and sampled client files implement authentication and score reporting.
Public Git visibility must not be represented as a free-access or redistribution licence. Our API returns metadata only, never passages, questions, answers, audio, upstream scripts, student records or bypass links.
The original metadata compilation is offered under CC BY 4.0; no rights in third-party material are granted.</p>
<p>This is a single-repository descriptive audit. We inspect selected documentation and schema examples, not every exercise.
The directory labels are not validated CEFR classifications. Missing JSON need not mean no usable exercise exists in another format.
Automated test coverage checks software behaviour, not teaching effectiveness or correctness of all upstream content.</p>
<h2>6. Availability and citation</h2>
<p>The code is MIT-licensed and has no runtime dependencies. Cite the version/commit of IELTS API actually used and the upstream snapshot separately; preserve the exported metadata with its digest.
The repository provides CFF, CodeMeta and Zenodo-ready metadata. A DOI should be added only after a real archive deposit has succeeded.
An accessible report with citation tags supports discovery, but neither it nor a software DOI guarantees inclusion in Google Scholar.</p>
<h2>References</h2>
<ol>
<li>ngoclong1209 (2026). <a href="${escapeHtml(source)}">UPGRADE-YOUR-IELTS-SKILLS</a>. Pinned repository snapshot; metadata source.</li>
<li>The IELTS API contributors (2026). <a href="https://github.com/johnlikescarrot/IELTS-API">IELTS API</a>. See CITATION.cff and docs/UPGRADE-YOUR-IELTS-SKILLS.md.</li>
<li><a href="https://citation-file-format.github.io/">Citation File Format</a>. Software and dataset citation metadata.</li>
<li>Google Scholar. <a href="https://scholar.google.com/intl/en/scholar/inclusion.html">Inclusion guidelines for webmasters</a>. Accessed 5 September 2026.</li>
<li>Zenodo. <a href="https://help.zenodo.org/docs/github/archive-software/github-upload/">Archive a release from GitHub</a>. Accessed 5 September 2026.</li>
</ol>
</article></body></html>\n`;
}
