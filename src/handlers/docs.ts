/**
 * Human-facing documentation: `/docs` (HTML) and `/openapi.json`.
 */

import type { RequestContext, Route } from "../router.js";
import { route } from "../router.js";
import { sendJson } from "../http.js";
import { API_NAME, CITATION_APA, HOMEPAGE, VERSION } from "../meta.js";
import { buildOpenApiDocument } from "../openapi.js";
import { apiRoutes } from "../routes.js";

function getOpenApi({ res }: RequestContext): void {
  sendJson(res, 200, buildOpenApiDocument(apiRoutes));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderRow(method: string, path: string, summary: string): string {
  return `      <tr><td><span class="m ${method.toLowerCase()}">${method}</span></td><td><code>${escapeHtml(
    path,
  )}</code></td><td>${escapeHtml(summary)}</td></tr>`;
}

function buildDocsHtml(): string {
  const rows = apiRoutes
    .map((r) => renderRow(r.method, r.path, r.summary))
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${API_NAME} docs</title>
<meta name="citation_title" content="${escapeHtml(API_NAME)}: A free and open IELTS study API">
<meta name="citation_version" content="${VERSION}">
<meta name="citation_url" content="${HOMEPAGE}">
<link rel="stylesheet" href="data:text/css,body%7Bfont-family%3Aui%2Csans-serif%3Bmargin%3A2rem%3Bcolor%3A%23111%3Bmax-width%3A60rem%7D%0Acode%7Bbackground%3A%23f4f4f4%3Bpadding%3A.1rem%20.3rem%3Bborder-radius%3A3px%7D%0Atable%7Bborder-collapse%3Acollapse%3Bwidth%3A100%25%7D%0Atd%2Cth%7Bborder%3A1px%20solid%20%23ddd%3Bpadding%3A.4rem%20.6rem%3Btext-align%3Aleft%3Bvertical-align%3Atop%7D%0Ath%7Bbackground%3A%23fafafa%7D%0A.m%7Bfont-weight%3A700%3Bpadding%3A.1rem%20.4rem%3Bborder-radius%3A3px%3Bfont-size%3A.8rem%7D%0A.get%7Bbackground%3A%23d9ead3%7D%0A.post%7Bbackground%3A%23d0e0f0%7D">
</head>
<body>
<h1>${API_NAME} <small>v${VERSION}</small></h1>
<p>A free, open, no-authentication IELTS study API. No API keys, no rate
limits, CORS enabled. Machine-readable spec: <a href="/openapi.json"><code>/openapi.json</code></a>.</p>

<h2>Try it</h2>
<pre><code>curl http://localhost:3000/v1/words?band=8&amp;topic=environment
curl -X POST http://localhost:3000/v1/bands/overall \\
  -H 'content-type: application/json' \\
  -d '{"listening":7.5,"reading":7,"writing":6,"speaking":6.5}'</code></pre>

<h2>Endpoints</h2>
<table>
  <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>

<h2>Citation</h2>
<p>${escapeHtml(CITATION_APA)}</p>
</body>
</html>
`;
}

function getDocs({ res }: RequestContext): void {
  const html = buildDocsHtml();
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-length": String(Buffer.byteLength(html)),
  });
  res.end(html);
}

export const docRoutes: readonly Route[] = [
  route("GET", "/openapi.json", "OpenAPI 3.1 specification", getOpenApi),
  route("GET", "/docs", "Interactive documentation page", getDocs),
];
