import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { ExamTheme, SpeakingTopic, TaskType, WritingTopic } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('GET /v1/topics/writing', () => {
  it('returns prompts with facet metadata', async () => {
    const response = await server.json<WritingTopic[]>('/v1/topics/writing?limit=5');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(5);
    expect(response.meta.total).toBeGreaterThan(90);
    expect(Array.isArray(response.meta.categories)).toBe(true);
    expect(response.meta.questionTypes).toContain('opinion');
  });

  it('filters by category and question type', async () => {
    const response = await server.json<WritingTopic[]>('/v1/topics/writing?category=education&limit=50');
    expect(response.data.every((topic) => topic.category === 'education')).toBe(true);
    expect(response.meta.category).toBe('education');

    const byType = await server.json<WritingTopic[]>('/v1/topics/writing?type=problem-solution&limit=50');
    expect(byType.data.every((topic) => topic.questionType === 'problem-solution')).toBe(true);
  });

  it('searches prompt text', async () => {
    const response = await server.json<WritingTopic[]>(
      '/v1/topics/writing?q=artificial%20intelligence&limit=5',
    );
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.length).toBeLessThan(20);
  });

  it('rejects unknown categories and question types', async () => {
    expect((await server.json('/v1/topics/writing?category=astrophysics')).status).toBe(400);
    expect((await server.json('/v1/topics/writing?type=haiku')).status).toBe(400);
  });
});

describe('GET /v1/topics/speaking', () => {
  it('returns items from every part by default', async () => {
    const response = await server.json<SpeakingTopic[]>('/v1/topics/speaking?limit=100');
    const parts = new Set(response.data.map((topic) => topic.part));
    expect(parts.size).toBe(3);
    expect(response.meta.part).toBeNull();
  });

  it('filters by part', async () => {
    const response = await server.json<SpeakingTopic[]>('/v1/topics/speaking?part=2&limit=100');
    expect(response.data.every((topic) => topic.part === 2)).toBe(true);
    expect(response.meta.part).toBe(2);
  });

  it('searches topic text', async () => {
    const response = await server.json<SpeakingTopic[]>('/v1/topics/speaking?q=hometown');
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('rejects an out-of-range part', async () => {
    expect((await server.json('/v1/topics/speaking?part=4')).status).toBe(400);
  });
});

describe('GET /v1/tasks/writing', () => {
  it('returns every task family', async () => {
    const response = await server.json<TaskType[]>('/v1/tasks/writing');
    expect(response.data.length).toBeGreaterThanOrEqual(10);
    expect(response.meta.modules).toEqual(['academic', 'general-training']);
  });

  it('filters by module', async () => {
    const response = await server.json<TaskType[]>('/v1/tasks/writing?module=general-training');
    expect(response.data.every((task) => task.module === 'general-training')).toBe(true);
    expect(response.meta.module).toBe('general-training');
  });

  it('rejects unknown modules', async () => {
    expect((await server.json('/v1/tasks/writing?module=academic-writing')).status).toBe(400);
  });
});

describe('GET /v1/topics/themes', () => {
  it('returns the fifty recurring themes', async () => {
    const response = await server.json<ExamTheme[]>('/v1/topics/themes');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(50);
    expect(response.meta.total).toBe(50);
    expect(response.meta.group).toBeNull();
    expect(response.meta.skill).toBeNull();
    expect(response.meta.groups).toContain('environment');
  });

  it('filters by group, paper and free text', async () => {
    const group = await server.json<ExamTheme[]>('/v1/topics/themes?group=health');
    expect(group.data.every((theme) => theme.group === 'health')).toBe(true);
    expect(group.meta.group).toBe('health');

    const speaking = await server.json<ExamTheme[]>('/v1/topics/themes?skill=speaking');
    expect(speaking.data.every((theme) => theme.skills.includes('speaking'))).toBe(true);

    const search = await server.json<ExamTheme[]>('/v1/topics/themes?q=recycling');
    expect(search.data).toHaveLength(1);
    expect(search.data[0]!.group).toBe('environment');
  });

  it('rejects unknown groups and papers', async () => {
    expect((await server.json('/v1/topics/themes?group=nope')).status).toBe(400);
    expect((await server.json('/v1/topics/themes?skill=nope')).status).toBe(400);
  });
});
