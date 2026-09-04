import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Resources Endpoints (/api/v1/resources)', () => {
  it('GET /api/v1/resources lists all resources with filtering and search', async () => {
    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const resSkill = await request(app).get('/api/v1/resources?skill=writing');
    expect(resSkill.status).toBe(200);
    expect(
      resSkill.body.data.every((r: { skill: string }) => r.skill.toLowerCase().includes('writing'))
    ).toBe(true);

    const resCat = await request(app).get('/api/v1/resources?category=Templates');
    expect(resCat.status).toBe(200);
    expect(resCat.body.data.length).toBeGreaterThan(0);

    const resFmt = await request(app).get('/api/v1/resources?format=PDF');
    expect(resFmt.status).toBe(200);
    expect(resFmt.body.data.every((r: { format: string }) => r.format === 'PDF')).toBe(true);

    const resSearch = await request(app).get('/api/v1/resources?search=Simon');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/resources/:id returns single resource and handles 404', async () => {
    const res = await request(app).get('/api/v1/resources/res-001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('res-001');

    const resNotFound = await request(app).get('/api/v1/resources/unknown-resource');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('GET /api/v1/resources/summary returns breakdown by skill', async () => {
    const res = await request(app).get('/api/v1/resources/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].skill).toBeDefined();
    expect(res.body.data[0].resourceCount).toBeGreaterThan(0);
  });
});
