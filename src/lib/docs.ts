/**
 * The self-documenting HTML front page served at `/docs`.
 *
 * The page is generated from the live route table and needs no external
 * assets, so it renders identically offline, in an archive snapshot, or in a
 * citation-manager preview.
 */

import { vocabularyStats } from '../data/vocabulary.js';
import { corpusStats } from '../data/corpus.js';
import { practiceIndex } from '../data/practice.js';
import { escapeHtml } from './html.js';
import { renderCitationBibtex } from './research.js';

import type { RouteDefinition } from './route.js';

export { escapeHtml } from './html.js';

/** One row of the endpoint table. */
function routeRow(route: RouteDefinition): string {
  return [
    '    <tr>',
    `      <td><span class="badge">${escapeHtml(route.method)}</span></td>`,
    `      <td><a class="path" href="${escapeHtml(route.path)}">${escapeHtml(route.path)}</a></td>`,
    `      <td>${escapeHtml(route.summary)}</td>`,
    '    </tr>',
  ].join('\n');
}

/**
 * Render the documentation page.
 *
 * @param routes - Live route table.
 * @param version - API version.
 * @param repository - Repository URL used for citation links.
 */
export function renderDocs(routes: readonly RouteDefinition[], version: string, repository: string): string {
  const versioned = routes.filter((route) => route.versioned);
  const service = routes.filter((route) => !route.versioned);
  const words = vocabularyStats().words;
  const corpus = corpusStats();
  const practice = practiceIndex().stats;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IELTS API &mdash; free, open, no authentication</title>
<style>
  :root { color-scheme: light dark; --fg: #111; --bg: #fff; --muted: #5b6470; --line: #e3e6ea; --accent: #0b6bcb; }
  @media (prefers-color-scheme: dark) { :root { --fg: #e8eaf0; --bg: #12151a; --muted: #9aa4b2; --line: #262b33; --accent: #6cb6ff; } }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 62rem; padding: 2rem 1.25rem 4rem; background: var(--bg); color: var(--fg);
        font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: 2rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.25rem; margin: 2.5rem 0 .75rem; border-bottom: 1px solid var(--line); padding-bottom: .35rem; }
  p.lede { color: var(--muted); margin-top: 0; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
  pre { background: rgba(128,128,128,.12); padding: .9rem; border-radius: 8px; overflow-x: auto; }
  code { background: rgba(128,128,128,.14); padding: .1rem .3rem; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
  th, td { text-align: left; padding: .45rem .5rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; }
  a { color: var(--accent); }
  .badge { font-size: .72rem; font-weight: 700; border: 1px solid var(--accent); color: var(--accent);
          padding: .1rem .35rem; border-radius: 4px; }
  .path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .9em; }
  .meta { color: var(--muted); font-size: .9rem; }
  ul { padding-left: 1.2rem; }
  footer { margin-top: 3rem; border-top: 1px solid var(--line); padding-top: 1rem; color: var(--muted); font-size: .9rem; }
</style>
</head>
<body>
<h1>IELTS API</h1>
<p class="lede">A free, open, no-authentication REST API for IELTS preparation research. Version ${escapeHtml(version)}.</p>
<p>No API key. No registration. No rate limiting by key. Every response carries an ETag and open CORS headers.</p>
<pre><code>curl -s "https://ielts-api.example/v1/vocabulary?q=environment&amp;limit=3"
curl -s "https://ielts-api.example/v1/scores/overall?listening=7&amp;reading=6.5&amp;writing=6&amp;speaking=7"
curl -s "https://ielts-api.example/v1/vocabulary/atmosphere"</code></pre>

<h2>Datasets</h2>
<ul>
  <li><strong>${words.toLocaleString('en-US')} headwords</strong> extracted from the Cambridge IELTS 1&ndash;22 vocabulary lists, with phonetics, senses and morpheme hints.</li>
  <li><strong>${corpus.ieltsRelevantFiles} of ${corpus.filesInRepository} upstream files</strong> indexed from the open research corpus (${(corpus.coverageRatio * 100).toFixed(1)}% IELTS-relevant); only metadata is published.</li>
  <li><strong>Analytic band descriptors</strong> (condensed paraphrases) for Speaking, Writing Task&nbsp;1 and Writing Task&nbsp;2 across bands 0&ndash;9.</li>
  <li><strong>Score concordances</strong> for CEFR, TOEFL iBT, Cambridge English Scale, PTE Academic and the Duolingo English Test.</li>
  <li><strong>${practice.units.toLocaleString('en-US')} Reading/Listening practice units</strong> (${practice.assets.toLocaleString('en-US')} file-metadata records), pinned to a source commit; no upstream content is included.</li>
  <li><strong>17 original Reading/Listening task-family guides</strong>, based on official format descriptions.</li>
  <li><strong>Task banks</strong> for Writing Task&nbsp;1 and Task&nbsp;2 and for Speaking Parts&nbsp;1&ndash;3.</li>
</ul>

<h2>Versioned endpoints</h2>
<table>
  <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
  <tbody>
${versioned.map(routeRow).join('\n')}
  </tbody>
</table>

<h2>Service endpoints</h2>
<table>
  <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
  <tbody>
${service.map(routeRow).join('\n')}
  </tbody>
</table>

<h2>Response envelope</h2>
<p>Domain JSON responses use the same envelope, so clients can parse any endpoint uniformly:</p>
<pre><code>{
  "status": 200,
  "data": [ ... ],
  "meta": { "total": 12, "limit": 20, "offset": 0, "hasMore": false }
}</code></pre>

<h2>Quick reference</h2>
<table>
  <thead><tr><th>Parameter</th><th>Applies to</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td class="path">q</td><td>collections</td><td>Free-text search.</td></tr>
    <tr><td class="path">limit</td><td>collections</td><td>Page size, 1&ndash;100 (default 20, resources default 50).</td></tr>
    <tr><td class="path">offset</td><td>collections</td><td>Zero-based offset for pagination.</td></tr>
    <tr><td class="path">sort</td><td><code>/v1/vocabulary</code>, <code>/v1/corpus/items</code></td><td>Sort key.</td></tr>
    <tr><td class="path">order</td><td>collections</td><td><code>asc</code> or <code>desc</code>.</td></tr>
    <tr><td class="path">match</td><td><code>/v1/vocabulary</code></td><td><code>contains</code>, <code>prefix</code> or <code>exact</code>.</td></tr>
    <tr><td class="path">volume</td><td><code>/v1/vocabulary</code></td><td>Comma-separated Cambridge IELTS volumes, 1&ndash;22.</td></tr>
  </tbody>
</table>

<h2>Reading and Listening metadata</h2>
<p>Search <a href="/v1/practice?skill=reading&amp;level=a1-a2&amp;limit=3">Reading A1-A2 metadata</a>,
inspect <a href="/v1/practice/stats">inventory completeness</a>, or retrieve a
<a href="/v1/practice/sample?skill=listening&amp;seed=study-2026&amp;count=3">reproducible Listening sample</a>.
The source has no identified licence; the metadata licence does not grant rights to its exercises.</p>
<pre><code>GET /v1/practice?skill=listening&amp;mode=full-test&amp;asset=audio&amp;limit=3
GET /v1/practice/sample?seed=study-2026&amp;level=a1-a2&amp;count=5
GET /v1/practice/export?level=a1-a2
GET /v1/tasks/reading?type=reading-identifying-information</code></pre>
<p>Practice <code>q</code> is a case-insensitive substring (maximum 200 characters).
Filters are <code>skill</code>, <code>mode</code>, <code>level</code> and <code>asset</code>.
Sampling requires <code>seed</code> (maximum 128 characters) and accepts <code>count</code> (1–50, default 5).
Search uses <code>limit</code> (1–100, default 20) and <code>offset</code> (0–1,000,000).
The export returns <strong>JSON Lines</strong>, not a JSON envelope, and never truncates to a page.
Unsupported or repeated controls return 400.</p>

<h2>Citing this API</h2>
<p>Read the <a href="/research">full technical-report draft, with methods and limitations</a>.
Download <a href="/citation.bib">the software citation as BibTeX</a>; the repository also supplies validated
<code>CITATION.cff</code> metadata. No archive DOI, peer review, Scholar inclusion or citation count is claimed.</p>
<pre><code>${escapeHtml(renderCitationBibtex())}</code></pre>

<footer>
  <p class="meta">Code licensed under MIT; original metadata and guidance under CC BY 4.0. Upstream content rights are separate. Band descriptors are original condensed
  paraphrases written for this project and are not the official IELTS wording. Score concordances are indicative
  and compiled from the providers&rsquo; own published comparison tables.</p>
  <p class="meta"><a href="/openapi.json">OpenAPI 3.1 document</a> &middot; <a href="/health">health</a> &middot;
  <a href="${escapeHtml(repository)}">source repository</a></p>
</footer>
</body>
</html>
`;
}
