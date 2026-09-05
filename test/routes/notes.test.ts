import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { StudyNoteItem, StudyNotesStats } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/notes', () => {
  it('returns provenance, statistics and facets', async () => {
    const response = await server.json<{
      meta: { repository: string; note: string };
      stats: StudyNotesStats;
    }>('/v1/notes');
    expect(response.status).toBe(200);
    expect(response.data.meta.repository).toContain('Oxidaner/ielts');
    expect(response.data.meta.note).toContain('not redistributed');
    expect(response.data.stats.filesInRepository).toBe(2385);
    const facets = response.meta.facets as { skill: string[]; category: string[] };
    expect(facets.skill).toContain('writing');
    expect(facets.category).toContain('question-bank');
  });

  it('exposes the speaking-bank counts', async () => {
    const response = await server.json<{ stats: StudyNotesStats }>('/v1/notes');
    expect(response.data.stats.speakingBank.questions).toBe(200);
    expect(response.data.stats.speakingBank.part2CueCards).toBe(22);
  });
});

describe('GET /v1/notes/stats', () => {
  it('returns statistics only', async () => {
    const response = await server.json<StudyNotesStats>('/v1/notes/stats');
    expect(response.data.indexedFiles).toBe(2353);
    expect(response.data.byFormat.pdf).toBe(1282);
    expect(String(response.meta.note)).toContain('not redistributed');
  });
});

describe('GET /v1/notes/items', () => {
  it('paginates the index', async () => {
    const response = await server.json<StudyNoteItem[]>('/v1/notes/items?limit=2');
    expect(response.data).toHaveLength(2);
    expect(response.meta.total).toBe(2353);
    expect(response.meta.sort).toBe('title');
    expect(String(response.meta.note)).toContain('not redistributed');
  });

  it('filters by skill, category and format', async () => {
    const skill = await server.json<StudyNoteItem[]>('/v1/notes/items?skill=speaking&limit=50');
    expect(skill.data.every((item) => item.skill === 'speaking')).toBe(true);

    const category = await server.json<StudyNoteItem[]>('/v1/notes/items?category=methodology&limit=50');
    expect(category.data.every((item) => item.category === 'methodology')).toBe(true);
    expect(category.meta.total).toBe(2);

    const format = await server.json<StudyNoteItem[]>('/v1/notes/items?format=md&limit=50');
    expect(format.data.every((item) => item.format === 'md')).toBe(true);
  });

  it('searches free text, including the Chinese folder names', async () => {
    const response = await server.json<StudyNoteItem[]>('/v1/notes/items?q=听力&limit=5');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.query).toBe('听力');
    expect(response.data.every((item) => item.path.includes('听力'))).toBe(true);
  });

  it('sorts by size and path', async () => {
    const size = await server.json<StudyNoteItem[]>('/v1/notes/items?sort=size&order=desc&limit=2');
    expect(size.data[0]!.sizeBytes).toBeGreaterThanOrEqual(size.data[1]!.sizeBytes);

    const path = await server.json<StudyNoteItem[]>('/v1/notes/items?sort=path&limit=2');
    expect(path.data[0]!.path.localeCompare(path.data[1]!.path)).toBeLessThanOrEqual(0);
  });

  it('rejects unknown facet values', async () => {
    expect((await server.json('/v1/notes/items?skill=nope')).status).toBe(400);
    expect((await server.json('/v1/notes/items?category=nope')).status).toBe(400);
    expect((await server.json('/v1/notes/items?format=nope')).status).toBe(400);
    expect((await server.json('/v1/notes/items?sort=nope')).status).toBe(400);
  });
});
