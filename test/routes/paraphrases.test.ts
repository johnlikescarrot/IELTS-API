import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ParaphraseGroup } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/paraphrases', () => {
  it('lists every group with statistics', async () => {
    const response = await server.json<ParaphraseGroup[]>('/v1/paraphrases?limit=100');
    expect(response.status).toBe(200);
    expect(response.meta.total).toBe(79);
    expect(response.data).toHaveLength(79);
    expect(response.meta.hasMore).toBe(false);
    expect(response.meta.stats).toMatchObject({ groups: 79, terms: 459 });
    expect(response.meta.partsOfSpeech).toEqual(['verb', 'adj/adv', 'noun']);
  });

  it('paginates', async () => {
    const response = await server.json<ParaphraseGroup[]>('/v1/paraphrases?limit=5&offset=5');
    expect(response.data).toHaveLength(5);
    expect(response.meta.offset).toBe(5);
    expect(response.meta.hasMore).toBe(true);
  });

  it('filters by part of speech', async () => {
    const response = await server.json<ParaphraseGroup[]>('/v1/paraphrases?pos=noun');
    expect(response.meta.pos).toBe('noun');
    expect(response.data.every((group) => group.pos === 'noun')).toBe(true);
    expect(response.data).toHaveLength(19);
  });

  it('searches senses, glosses and terms', async () => {
    const english = await server.json<ParaphraseGroup[]>('/v1/paraphrases?q=reservation');
    expect(english.data.map((group) => group.id)).toContain('verb-01');
    const chinese = await server.json<ParaphraseGroup[]>('/v1/paraphrases?q=预定');
    expect(chinese.data.map((group) => group.id)).toContain('verb-01');
    const empty = await server.json<ParaphraseGroup[]>('/v1/paraphrases?q=xyzzy-nothing');
    expect(empty.data).toHaveLength(0);
    expect(empty.meta.total).toBe(0);
  });

  it('sorts by id and by term count in both directions', async () => {
    const byTerms = await server.json<ParaphraseGroup[]>('/v1/paraphrases?sort=terms&order=desc&limit=3');
    const sizes = byTerms.data.map((group) => group.terms.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));

    const descending = await server.json<ParaphraseGroup[]>('/v1/paraphrases?sort=id&order=desc&limit=1');
    expect(descending.data[0]?.id).toBe('verb-39');
  });

  it('rejects unknown enums and malformed pagination', async () => {
    expect((await server.json('/v1/paraphrases?pos=adjective')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?sort=zebra')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?order=up')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?limit=zero')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?limit=0')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?limit=101')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?offset=-1')).status).toBe(400);
    expect((await server.json('/v1/paraphrases?limit=1&limit=2')).status).toBe(400);
  });
});

describe('GET /v1/paraphrases/mechanisms', () => {
  it('lists the five paraphrase mechanisms with provenance', async () => {
    const response = await server.json<{ id: string }[]>('/v1/paraphrases/mechanisms');
    expect(response.status).toBe(200);
    expect(response.meta.count).toBe(5);
    expect(response.data.map((mechanism) => mechanism.id)).toContain('hyponymy');
    const source = response.meta.source as { repository: string };
    expect(source.repository).toBe('https://github.com/Oxidaner/ielts');
  });
});

describe('GET /v1/paraphrases/:id', () => {
  it('returns one group', async () => {
    const response = await server.json<ParaphraseGroup>('/v1/paraphrases/adj-adv-04');
    expect(response.status).toBe(404);
  });

  it('accepts the identifier as written in the dataset', async () => {
    const response = await server.json<ParaphraseGroup>(
      `/v1/paraphrases/${encodeURIComponent('adj/adv-04')}`,
    );
    expect(response.status).toBe(200);
    expect(response.data.gloss).toBe('attractive; impressive; appealing');
  });

  it('404s for unknown identifiers', async () => {
    const response = await server.json('/v1/paraphrases/does-not-exist');
    expect(response.status).toBe(404);
    const details = (response.meta.error as { details: Record<string, string> }).details;
    expect(details.partsOfSpeech).toBe('verb,adj/adv,noun');
  });
});
