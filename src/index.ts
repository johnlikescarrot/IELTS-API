/**
 * Public entry point: everything needed to embed the IELTS API as a library or
 * to run it as a standalone HTTP service.
 */
export { API_VERSION, createApp } from './app.ts';
export { createServer, requestListener } from './server.ts';
export * from './core/bands.ts';
export * from './core/cefr.ts';
export * from './core/errors.ts';
export * from './core/router.ts';
export * from './core/text.ts';
export * from './core/validate.ts';
export * from './core/writing.ts';
export * from './data/prompts.ts';
export * from './data/vocabulary.ts';
export { openApiDocument } from './openapi.ts';
