import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { topics, resources, writingSamples } from '../src/data/index.js';

describe('IELTS API routes', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the root metadata document', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      name: 'ielts-api',
      version: '1.0.0',
      api: '/api/v1/index',
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });

  it('serves a health endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'ielts-api' });
  });

  it('serves the API index', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/index' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.baseUrl).toBe('/api/v1');
    expect(body.endpoints.topics).toBe('/api/v1/ielts/topics');
  });

  it('lists all topics without filters', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/topics' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBe(topics.length);
    expect(body.total).toBe(topics.length);
    expect(body.topics[0]).toMatchObject({ id: 1, name: 'Advertising' });
  });

  it('filters topics by query and section', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ielts/topics?q=advertising&section=positives',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.topics.map((topic: { id: number }) => topic.id)).toContain(1);
  });

  it('returns a topic by id including point counts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/topics/1' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ id: 1, name: 'Advertising' });
    expect(body.totalPoints).toBeGreaterThan(0);
    expect(body.totalSections).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown topic id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/topics/999' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(expect.objectContaining({ error: 'topic_not_found' }));
  });

  it('lists resources without filters', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/resources' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBe(resources.length);
    expect(body.total).toBe(resources.length);
    expect(body.resources[0]).toHaveProperty('sourceUrl');
  });

  it('filters resources by category and format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ielts/resources?category=writing&format=epub&q=writing',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.count).toBeGreaterThan(0);
    expect(
      body.resources.every(
        (resource: { category: string; format: string }) =>
          resource.category === 'writing' && resource.format === 'epub',
      ),
    ).toBe(true);
  });

  it('serves resource metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/resources/meta' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(resources.length);
    expect(body.categories).toContain('writing');
  });

  it('returns a resource by id', async () => {
    const resource = resources[0];
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/ielts/resources/${resource.id}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: resource.id });
  });

  it('returns 404 for an unknown resource id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/resources/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(expect.objectContaining({ error: 'resource_not_found' }));
  });

  it('lists writing samples and filters by query', async () => {
    const all = await app.inject({ method: 'GET', url: '/api/v1/ielts/writing' });
    expect(all.statusCode).toBe(200);
    expect(all.json().count).toBe(writingSamples.length);

    const filtered = await app.inject({
      method: 'GET',
      url: '/api/v1/ielts/writing?q=advertising',
    });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json().count).toBe(1);
  });

  it('returns a writing sample by id', async () => {
    const sample = writingSamples[0];
    const response = await app.inject({ method: 'GET', url: `/api/v1/ielts/writing/${sample.id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: sample.id, band: 7 });
  });

  it('returns 404 for an unknown writing sample id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/writing/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(expect.objectContaining({ error: 'writing_sample_not_found' }));
  });

  it('serves scholarly citation metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/ielts/citation' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ year: 2026, doi: '10.0000/ielts-api.v1' });
    expect(body.topics).toBe(topics.length);
  });

  it('returns 404 with no-store for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/not-a-route' });
    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual(expect.objectContaining({ error: 'route_not_found' }));
  });

  it('handles unexpected route errors', async () => {
    app.get('/boom', async () => {
      throw new Error('boom');
    });
    const response = await app.inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(expect.objectContaining({ error: 'internal_error' }));
  });
});
