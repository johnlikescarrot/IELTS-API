import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Speaking Endpoints (/api/v1/speaking)', () => {
  it('GET /api/v1/speaking/band-descriptors returns speaking criteria', async () => {
    const res = await request(app).get('/api/v1/speaking/band-descriptors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data['9'].fluencyAndCoherence).toBeDefined();
  });

  it('GET /api/v1/speaking/part1-topics returns topics with search and pagination', async () => {
    const res = await request(app).get('/api/v1/speaking/part1-topics');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const resSearch = await request(app).get('/api/v1/speaking/part1-topics?search=hometown');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/speaking/part1-topics/:id returns specific topic and handles 404', async () => {
    const res = await request(app).get('/api/v1/speaking/part1-topics/p1-001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('p1-001');

    const resNotFound = await request(app).get('/api/v1/speaking/part1-topics/nonexistent');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('TOPIC_NOT_FOUND');
  });

  it('GET /api/v1/speaking/part2-cue-cards returns cue cards with filters', async () => {
    const res = await request(app).get('/api/v1/speaking/part2-cue-cards');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const resCat = await request(app).get('/api/v1/speaking/part2-cue-cards?category=Environment');
    expect(resCat.status).toBe(200);
    expect(resCat.body.data.length).toBeGreaterThan(0);

    const resSearch = await request(app).get('/api/v1/speaking/part2-cue-cards?search=problem');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/speaking/part2-cue-cards/:id returns specific cue card', async () => {
    const res = await request(app).get('/api/v1/speaking/part2-cue-cards/p2-001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('p2-001');
    expect(res.body.data.bulletPoints.length).toBeGreaterThan(0);

    const resNotFound = await request(app).get('/api/v1/speaking/part2-cue-cards/unknown-cue-card');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('CUE_CARD_NOT_FOUND');
  });

  it('GET /api/v1/speaking/part2-cue-cards/random returns random cue card', async () => {
    const res = await request(app).get('/api/v1/speaking/part2-cue-cards/random');
    expect(res.status).toBe(200);
    expect(res.body.data.topic).toBeDefined();

    const resFilter = await request(app).get(
      '/api/v1/speaking/part2-cue-cards/random?category=People'
    );
    expect(resFilter.status).toBe(200);
    expect(resFilter.body.data.category).toContain('People');

    const resFallback = await request(app).get(
      '/api/v1/speaking/part2-cue-cards/random?category=NonExistentCategory'
    );
    expect(resFallback.status).toBe(200);
    expect(resFallback.body.data.topic).toBeDefined();
  });

  it('GET /api/v1/speaking/formulas and /transcripts return authentic study data', async () => {
    const resFormulas = await request(app).get('/api/v1/speaking/formulas');
    expect(resFormulas.status).toBe(200);
    expect(resFormulas.body.data.length).toBeGreaterThan(0);

    const resTranscripts = await request(app).get('/api/v1/speaking/transcripts');
    expect(resTranscripts.status).toBe(200);
    expect(resTranscripts.body.data.length).toBeGreaterThan(0);
  });
});
