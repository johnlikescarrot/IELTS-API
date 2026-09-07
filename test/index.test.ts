import { describe, expect, it } from 'vitest';

import * as api from '../src/index.js';

describe('the package entry point', () => {
  it('exports the server builders', () => {
    expect(typeof api.createApiServer).toBe('function');
    expect(typeof api.startApiServer).toBe('function');
    expect(typeof api.createRequestHandler).toBe('function');
  });

  it('exports the route table and the documentation builders', () => {
    expect(api.ROUTES.length).toBeGreaterThan(15);
    expect(api.DOMAIN_ROUTES.every((route) => route.versioned)).toBe(true);
    expect(api.createMetaRoutes([])).toHaveLength(5);
    expect(typeof api.openApiDocument).toBe('function');
    expect(typeof api.renderDocs).toBe('function');
    expect(api.escapeHtml('<')).toBe('&lt;');
  });

  it('exports the command-line helpers', () => {
    expect(typeof api.runCli).toBe('function');
    expect(typeof api.isEntryPoint).toBe('function');
    expect(typeof api.parseCli).toBe('function');
    expect(typeof api.usage).toBe('function');
    expect(api.DEFAULT_CONFIG.port).toBe(3000);
  });

  it('exports the library helpers', () => {
    expect(typeof api.loadDataset).toBe('function');
    expect(typeof api.clearDatasetCache).toBe('function');
    expect(typeof api.roundBand).toBe('function');
    expect(typeof api.hashString).toBe('function');
    expect(typeof api.matchRoute).toBe('function');
    expect(typeof api.paginate).toBe('function');
    expect(typeof api.sendJson).toBe('function');
    expect(typeof api.badRequest).toBe('function');
    expect(api.COMMON_HEADERS['access-control-allow-origin']).toBe('*');
  });

  it('exports the stateless review and vocabulary-deck library contract', () => {
    const deck = api.createVocabularyDeck({ seed: 'sdk', on: '2026-09-07', limit: 1 });
    const card = deck.cards[0]!.state;
    expect(api.REVIEW_POLICY.algorithm).toBe('sm2-v1');
    expect(api.buildReviewQueue([card], '2026-09-07').items[0]?.card).toEqual(card);
    const next = api.scheduleReview(card, 4, '2026-09-07');
    expect(api.parseReviewCard(next.card).dueOn).toBe('2026-09-08');
    expect(api.createReviewCard('local-card', '2026-09-07').id).toBe('local-card');
  });

  it('exports the datasets', () => {
    expect(api.BAND_SCALE).toHaveLength(19);
    expect(api.WRITING_TOPICS.length).toBeGreaterThan(90);
    expect(api.SPEAKING_TOPICS.length).toBeGreaterThan(70);
    expect(api.TASK_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(api.RESOURCES.length).toBeGreaterThan(20);
    expect(api.CONVERSION_TARGETS).toContain('cefr');
    expect(api.allEntries().length).toBe(4174);
    expect(api.corpusStats().filesInRepository).toBe(404);
  });

  it('exports the build constants', () => {
    expect(api.API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(api.SERVICE_NAME).toBe('ielts-api');
    expect(api.CODE_LICENSE).toBe('MIT');
    expect(api.DATA_LICENSE).toBe('CC BY 4.0');
    expect(api.REPOSITORY_URL).toContain('github.com');
  });
});
