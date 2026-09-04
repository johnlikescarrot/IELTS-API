import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Health and Documentation Endpoints', () => {
  it('GET /health returns health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('IELTS-API');
    expect(res.body.version).toBe('1.0.0');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('GET /api/v1/health returns health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET / and GET /api return API overview and endpoint guide', async () => {
    const resRoot = await request(app).get('/');
    expect(resRoot.status).toBe(200);
    expect(resRoot.body.name).toBe('IELTS-API');
    expect(resRoot.body.authentication).toContain('Free');
    expect(resRoot.body.endpoints.vocabulary).toBeDefined();

    const resApi = await request(app).get('/api');
    expect(resApi.status).toBe(200);
    expect(resApi.body.name).toBe('IELTS-API');
  });

  it('GET /api/v1/openapi.json returns valid OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('IELTS-API');
    expect(res.body.paths['/api/v1/vocabulary']).toBeDefined();
  });

  it('GET /api/v1/docs serves HTML documentation', async () => {
    const res = await request(app).get('/api/v1/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
