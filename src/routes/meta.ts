/**
 * Service routes: discovery, health, OpenAPI document and documentation.
 */

import { archiveStats } from '../data/archive.js';
import { corpusStats } from '../data/corpus.js';
import { materialsStats } from '../data/materials.js';
import { practiceStats } from '../data/practiceTests.js';
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
          citationCff: '/citation.cff',
          citationBibtex: '/citation.bib',
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
        checks: ['process', 'vocabulary-dataset', 'corpus-index', 'practice-test-index', 'archive-index'],
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

  /** Citation File Format metadata for reference managers and archives. */
  function citationCff(): HandlerResult {
    return {
      raw: {
        contentType: 'application/yaml; charset=utf-8',
        body: `cff-version: 1.2.0\nmessage: If you use this software, please cite it.\ntitle: IELTS API\ntype: software\nversion: ${API_VERSION}\ndate-released: '2026-09-05'\nauthors:\n  - name: The IELTS API contributors\nlicense: MIT\nrepository-code: ${REPOSITORY_URL}\nurl: ${REPOSITORY_URL}\npreferred-citation:\n  type: software\n  title: IELTS API\n  version: ${API_VERSION}\n  url: ${REPOSITORY_URL}\n`,
      },
    };
  }

  /** BibTeX metadata for scholarly manuscripts. */
  function citationBibtex(): HandlerResult {
    return {
      raw: {
        contentType: 'application/x-bibtex; charset=utf-8',
        body: `@software{ielts_api_${API_VERSION.replaceAll('.', '_')},\n  author = {{The IELTS API contributors}},\n  title = {IELTS API},\n  version = {${API_VERSION}},\n  year = {2026},\n  url = {${REPOSITORY_URL}}\n}\n`,
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
    {
      method: 'GET',
      path: '/citation.cff',
      versioned: false,
      summary: 'Machine-readable Citation File Format metadata for this release.',
      handler: citationCff,
    },
    {
      method: 'GET',
      path: '/citation.bib',
      versioned: false,
      summary: 'BibTeX citation metadata for this release.',
      handler: citationBibtex,
    },
  ];
  serviceRoutes.push(...definitions);
  return definitions;
}
