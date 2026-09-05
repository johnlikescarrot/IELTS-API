/**
 * Library entry point.
 *
 * The package can be used as an HTTP service (`ielts-api`, `createApiServer`)
 * or as a dependency: every dataset and helper is exported, so a researcher can
 * query the Cambridge IELTS vocabulary dataset or compute band scores without
 * starting a server.
 */

export { createApiServer, startApiServer } from './server.js';
export { createRequestHandler } from './app.js';
export { DOMAIN_ROUTES, ROUTES, SCHOLAR_ROUTES } from './routes/index.js';
export { createMetaRoutes } from './routes/meta.js';
export { createScholarRoutes, PAPER_PATH, PAPER_PDF_PATH, SITEMAP_PATHS } from './routes/scholar.js';
export { openApiDocument } from './lib/openapi.js';
export { escapeHtml, renderDocs } from './lib/docs.js';
export { jsonLdBody, metaProperty, metaTag } from './lib/html.js';
export { isEntryPoint, runCli } from './lib/cli.js';
export { DEFAULT_CONFIG, parseCli, usage } from './lib/config.js';
export { clearDatasetCache, loadDataset } from './lib/dataset.js';
export * from './lib/http.js';
export * from './lib/band.js';
export * from './lib/errors.js';
export * from './lib/query.js';
export * from './lib/rng.js';
export * from './lib/route.js';
export * from './lib/search.js';
export * from './lib/citation.js';
export * from './lib/paper.js';
export * from './lib/pdf.js';
export * from './lib/scholar.js';
export * from './data/bands.js';
export * from './data/conversions.js';
export * from './data/citation.js';
export * from './data/corpus.js';
export * from './data/format.js';
export * from './data/questions.js';
export * from './data/rawscores.js';
export * from './data/resources.js';
export * from './data/tasks.js';
export * from './data/topics.js';
export * from './data/vocabulary.js';
export { API_VERSION, CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL, SERVICE_NAME } from './version.js';
export type * from './types.js';
