import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { WordbookItem, WordbookStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/wordbook', () => {
  it('returns provenance, statistics and the cross-validation table', async () => {
    const response = await server.json<{
      meta: { repository: string };
      stats: WordbookStats;
      books: { book: number }[];
    }>('/v1/wordbook');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Iamdacai/ielts-vocab-system');
    expect(response.data.stats.rows).toBe(4323);
    expect(response.data.stats.crossCambridge.shared).toBe(2315);
    expect(response.data.books).toHaveLength(18);
    expect(response.meta.rows).toBe(4323);
    expect(String(response.meta.note)).toContain('not redistributed');
  });
});

describe('GET /v1/wordbook/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<WordbookItem[]>('/v1/wordbook/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(4323);
    expect(response.meta.sort).toBe('word');
    expect(response.meta.order).toBe('asc');
    expect(response.meta.query).toBeNull();
    expect(response.meta.book).toBeNull();
    expect(response.meta.shared).toBeNull();
    expect(response.meta.agrees).toBeNull();
  });

  it('searches by headword', async () => {
    const response = await server.json<WordbookItem[]>('/v1/wordbook/items?q=abandon');
    expect(response.data.map((item) => item.word)).toEqual(['abandon', 'abandonment']);
    expect(response.meta.query).toBe('abandon');
    const exact = await server.json<WordbookItem[]>('/v1/wordbook/items?q=abandonment');
    expect(exact.data).toHaveLength(1);
  });

  it('filters by claimed volume', async () => {
    const response = await server.json<WordbookItem[]>('/v1/wordbook/items?book=7,12&limit=100');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.every((item) => item.book === 7 || item.book === 12)).toBe(true);
    expect(response.meta.book).toEqual([7, 12]);
  });

  it('rejects volumes outside the claimed range', async () => {
    const response = await server.json('/v1/wordbook/items?book=19');
    expect(response.status).toBe(400);
    const error = response.meta.error as { code: string; details: Record<string, string> };
    expect(error.code).toBe('bad_request');
    expect(error.details.received).toBe('19');

    const text = await server.json('/v1/wordbook/items?book=seven');
    expect(text.status).toBe(400);
  });

  it('filters by membership and agreement', async () => {
    const shared = await server.json<WordbookItem[]>('/v1/wordbook/items?shared=true&limit=5');
    expect(shared.data.every((item) => item.shared)).toBe(true);
    expect(shared.meta.total).toBe(2315);

    const missing = await server.json<WordbookItem[]>('/v1/wordbook/items?shared=no&limit=5');
    expect(missing.data.every((item) => !item.shared)).toBe(true);
    expect(missing.meta.total).toBe(2008);

    const agrees = await server.json<WordbookItem[]>('/v1/wordbook/items?agrees=1&limit=5');
    expect(agrees.data.every((item) => item.volumeAgrees)).toBe(true);
    expect(agrees.meta.total).toBe(110);

    const bad = await server.request('/v1/wordbook/items?shared=maybe');
    expect(bad.status).toBe(400);
  });

  it('sorts by claimed volume', async () => {
    const response = await server.json<WordbookItem[]>('/v1/wordbook/items?sort=book&order=desc&limit=2');
    expect(response.data.every((item) => item.book === 18)).toBe(true);
    expect(response.meta.sort).toBe('book');
  });

  it('rejects invalid sort keys and page sizes', async () => {
    expect((await server.request('/v1/wordbook/items?sort=length')).status).toBe(400);
    expect((await server.request('/v1/wordbook/items?limit=0')).status).toBe(400);
  });
});

describe('GET /v1/wordbook/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<WordbookStats>('/v1/wordbook/stats');
    expect(response.status).toBe(200);
    expect(response.data.rows).toBe(4323);
    expect(response.data.crossCambridge.jaccard).toBe(0.3745);
    expect(response.data.completeness.phonetic).toBe(0);
  });
});

describe('GET /v1/wordbook/books', () => {
  it('returns the per-volume cross-validation rows', async () => {
    const response = await server.json<{ book: number; wordbookWords: number }[]>('/v1/wordbook/books');
    expect(response.data).toHaveLength(18);
    expect(response.data[6]).toMatchObject({ book: 7, wordbookWords: 220, agreesWithVolume: 0 });
    expect(response.meta.count).toBe(18);
    expect(response.meta.sharedTotal).toBe(2315);
    expect(response.meta.agreementTotal).toBe(110);
    expect(String(response.meta.caveat)).toContain('cambridge_book');
  });
});

describe('GET /v1/wordbook/audit', () => {
  it('returns the findings with their pinned evidence', async () => {
    const response = await server.json<{
      findings: { id: string; severity: string }[];
      sources: Record<string, { sha1: string }>;
      method: string;
    }>('/v1/wordbook/audit');
    const ids = response.data.findings.map((finding) => finding.id);
    expect(response.meta.count).toBe(ids.length);
    expect(ids).toContain('strategy-doc-code-divergence');
    expect(
      response.data.findings.every((finding) => ['low', 'medium', 'high'].includes(finding.severity)),
    ).toBe(true);
    expect(response.data.sources.spacedRepetition?.sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(response.data.method).toContain('blob SHA-1');
    expect(response.meta.repository).toContain('Iamdacai');
    expect(response.meta.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
