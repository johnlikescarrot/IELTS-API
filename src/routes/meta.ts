/**
 * Service routes: discovery, health, OpenAPI document and documentation.
 */

import { archiveStats } from '../data/archive.js';
import { corpusStats } from '../data/corpus.js';
import { materialsStats } from '../data/materials.js';
import { practiceStats } from '../data/practiceTests.js';
import { RAW_SCORE_MODULES } from '../data/rawScores.js';
import { testcenterStats } from '../data/testcenter.js';
import { vocabularyStats } from '../data/vocabulary.js';
import { renderDocs } from '../lib/docs.js';
import { openApiDocument } from '../lib/openapi.js';
import { CODE_LICENSE, DATA_LICENSE, REPOSITORY_URL, SERVICE_NAME, API_VERSION } from '../version.js';

import type { RouteContext, HandlerResult } from '../lib/route.js';
import type { RouteDefinition } from '../lib/route.js';

/** Summary of the datasets behind the API. */
function datasetSummary(): Record<string, number> {
  const words = vocabularyStats();
  const corpus = corpusStats();
  const practice = practiceStats();
  const materials = materialsStats();
  const archive = archiveStats();
  const testcenter = testcenterStats();
  return {
    vocabularyWords: words.words,
    vocabularyOccurrences: words.occurrences,
    cambridgeVolumes: words.volumes,
    corpusFiles: corpus.filesInRepository,
    corpusIeltsRelevantFiles: corpus.ieltsRelevantFiles,
    practiceItems: practice.indexedItems,
    practiceQuestions: practice.questions,
    materialsFiles: materials.filesInRepository,
    materialsIndexedFiles: materials.indexedFiles,
    archiveFiles: archive.indexedFiles,
    archiveAudioTracks: archive.audioTracks,
    archiveEssays: archive.assignments.essays,
    rawScoreTables: RAW_SCORE_MODULES.length,
    testcenterPapers: testcenter.catalog.items,
    testcenterCambridgePapers: testcenter.catalog.cambridgePapers,
    testcenterGroups: testcenter.taxonomy.listening.groups + testcenter.taxonomy.reading.groups,
    testcenterTaggedQuestions:
      testcenter.taxonomy.listening.questions + testcenter.taxonomy.reading.questions,
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
        },
        datasets: datasetSummary(),
        citation: {
          cff: `${REPOSITORY_URL}/blob/main/CITATION.cff`,
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
      meta: {
        checks: [
          'process',
          'vocabulary-dataset',
          'corpus-index',
          'practice-test-index',
          'archive-index',
          'raw-score-tables',
          'testcenter-index',
        ],
      },
    };
  }

  /** The OpenAPI 3.1 document, served without the response envelope. */
  function openapi(context: RouteContext): HandlerResult {
    const base = `${context.url.origin}/`;
    return {
      raw: {
        contentType: 'application/json; charset=utf-8',
        body: `${JSON.stringify(openApiDocument(routes, base, API_VERSION), null, 2)}\n`,
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

  const definitions: RouteDefinition[] = [
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
