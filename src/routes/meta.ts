/**
 * Service routes: discovery, health, OpenAPI document and documentation.
 */

import { practiceStats } from '../data/practice.js';
import { corpusStats } from '../data/corpus.js';
import { vocabularyStats } from '../data/vocabulary.js';
import { renderResearch } from '../lib/research.js';
import { renderDocs } from '../lib/docs.js';
import { openApiDocument } from '../lib/openapi.js';
import { CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL, SERVICE_NAME, API_VERSION } from '../version.js';

import type { HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Summary of the datasets behind the API. */
function datasetSummary(): Record<string, number> {
  const words = vocabularyStats();
  const corpus = corpusStats();
  return {
    vocabularyWords: words.words,
    vocabularyOccurrences: words.occurrences,
    cambridgeVolumes: words.volumes,
    corpusFiles: corpus.filesInRepository,
    corpusIeltsRelevantFiles: corpus.ieltsRelevantFiles,
    practiceUnits: practiceStats().units,
  };
}

/**
 * Build the service routes.
 *
 * @param routes - The versioned routes to advertise and document.
 * @param startedAt - Process start time, used by `/health`.
 */
export function createMetaRoutes(
  routes: readonly RouteDefinition[],
  startedAt: number = Date.now(),
): RouteDefinition[] {
  /** Service routes, populated once the definitions are built. */
  const serviceRoutes: RouteDefinition[] = [];

  /** Service index. */
  function root(): HandlerResult {
    return {
      data: {
        name: SERVICE_NAME,
        version: API_VERSION,
        description: 'A free, open, no-authentication REST API for IELTS preparation research.',
        authentication: 'none',
        cors: 'public (*)',
        licenses: { code: CODE_LICENSE, data: DATA_LICENSE },
        repository: REPOSITORY_URL,
        endpoints: {
          documentation: '/docs',
          openapi: '/openapi.json',
          health: '/health',
          api: '/v1',
          research: '/research',
          practice: '/v1/practice',
        },
        datasets: datasetSummary(),
        citation: {
          cff: `${REPOSITORY_URL}/blob/main/CITATION.cff`,
          report: '/research',
          note: 'Please cite this API when you use it in research.',
        },
      },
      meta: { count: routes.length },
    };
  }

  /** Versioned endpoint index. */
  function v1(): HandlerResult {
    return {
      data: routes.map((route) => ({
        method: route.method,
        path: route.path,
        summary: route.summary,
      })),
      meta: { count: routes.length, version: 'v1', stability: 'stable', authentication: 'none' },
    };
  }

  /** Liveness and dataset availability. */
  function health(): HandlerResult {
    return {
      data: {
        status: 'ok',
        version: API_VERSION,
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        datasets: datasetSummary(),
      },
      meta: { checks: ['process', 'vocabulary-dataset', 'corpus-index', 'practice-index'] },
    };
  }

  /** The OpenAPI 3.1 document, served without the response envelope. */
  function openapi(): HandlerResult {
    return {
      raw: {
        contentType: 'application/json; charset=utf-8',
        body: `${JSON.stringify(openApiDocument([...routes, ...serviceRoutes], '/', API_VERSION), null, 2)}\n`,
      },
    };
  }

  /** The documentation page. */
  function docs(): HandlerResult {
    return {
      raw: {
        contentType: 'text/html; charset=utf-8',
        body: renderDocs([...routes, ...serviceRoutes], API_VERSION, REPOSITORY_URL),
      },
    };
  }

  function research(): HandlerResult {
    return { raw: { contentType: 'text/html; charset=utf-8', body: renderResearch(API_VERSION) } };
  }

  const definitions: RouteDefinition[] = [
    {
      method: 'GET',
      path: '/research',
      versioned: false,
      summary: 'Full technical report draft: methods, results, limitations and citation metadata.',
      handler: research,
    },
    {
      method: 'GET',
      path: '/',
      versioned: false,
      summary: 'Service index and dataset summary.',
      handler: root,
    },
    { method: 'GET', path: '/v1', versioned: false, summary: 'List every versioned endpoint.', handler: v1 },
    {
      method: 'GET',
      path: '/health',
      versioned: false,
      summary: 'Health and dataset availability.',
      handler: health,
    },
    {
      method: 'GET',
      path: '/openapi.json',
      versioned: false,
      summary: 'OpenAPI 3.1 document generated from the live route table.',
      handler: openapi,
    },
    {
      method: 'GET',
      path: '/docs',
      versioned: false,
      summary: 'Human-readable documentation.',
      handler: docs,
    },
  ];
  serviceRoutes.push(...definitions);
  return definitions;
}
