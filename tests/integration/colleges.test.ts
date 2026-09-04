import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Colleges Endpoints (/api/v1/colleges)', () => {
  it('GET /api/v1/colleges returns colleges list with filters', async () => {
    const res = await request(app).get('/api/v1/colleges');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(20);
    expect(res.body.meta.totalItems).toBe(30);

    const resProv = await request(app).get('/api/v1/colleges?province=Ontario');
    expect(resProv.status).toBe(200);
    expect(resProv.body.data.every((c: { province: string }) => c.province === 'Ontario')).toBe(
      true
    );

    const resCode = await request(app).get('/api/v1/colleges?provinceCode=BC');
    expect(resCode.status).toBe(200);
    expect(resCode.body.data.every((c: { provinceCode: string }) => c.provinceCode === 'BC')).toBe(
      true
    );

    const resCity = await request(app).get('/api/v1/colleges?city=Toronto');
    expect(resCity.status).toBe(200);
    expect(resCity.body.data.every((c: { city: string }) => c.city === 'Toronto')).toBe(true);

    const resType = await request(app).get('/api/v1/colleges?type=Polytechnic');
    expect(resType.status).toBe(200);
    expect(resType.body.data.length).toBeGreaterThan(0);

    const resMin = await request(app).get('/api/v1/colleges?minOverall=6.0');
    expect(resMin.status).toBe(200);
    expect(resMin.body.data.length).toBeGreaterThan(0);

    const resSearch = await request(app).get('/api/v1/colleges?search=Seneca');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.some((c: { name: string }) => c.name.includes('Seneca'))).toBe(true);
  });

  it('GET /api/v1/colleges validates minOverall parameter', async () => {
    const res = await request(app).get('/api/v1/colleges?minOverall=invalidScore');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SCORE');
  });

  it('GET /api/v1/colleges/:id returns single college and handles 400/404', async () => {
    const res = await request(app).get('/api/v1/colleges/1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toContain('Seneca');

    const resNotFound = await request(app).get('/api/v1/colleges/9999');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('COLLEGE_NOT_FOUND');

    const resInvalid = await request(app).get('/api/v1/colleges/invalid-id');
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('INVALID_ID');
  });

  it('GET /api/v1/colleges/provinces returns aggregated statistics', async () => {
    const res = await request(app).get('/api/v1/colleges/provinces');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].provinceCode).toBeDefined();
    expect(res.body.data[0].collegeCount).toBeGreaterThan(0);
  });
});
