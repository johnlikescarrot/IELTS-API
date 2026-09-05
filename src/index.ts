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
export { DOMAIN_ROUTES, ROUTES } from './routes/index.js';
export { createMetaRoutes } from './routes/meta.js';
export { openApiDocument } from './lib/openapi.js';
export { escapeHtml, renderDocs } from './lib/docs.js';
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
export * from './lib/lexgraph.js';
export * from './lib/drills.js';
export * from './data/bands.js';
export * from './data/conversions.js';
export * from './data/corpus.js';
export * from './data/frameworks.js';
export * from './data/materials.js';
export * from './data/practiceTests.js';
export * from './data/questionTypes.js';
export * from './data/resources.js';
export * from './data/tasks.js';
export * from './data/themes.js';
export * from './data/topics.js';
export * from './data/vocabulary.js';
export { API_VERSION, CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL, SERVICE_NAME } from './version.js';
export type * from './types.js';
