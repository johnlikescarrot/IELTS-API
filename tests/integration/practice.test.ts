import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Practice Endpoints (/api/v1/practice)', () => {
  it('GET /api/v1/practice/reading and /listening lists available tests', async () => {
    const resRead = await request(app).get('/api/v1/practice/reading');
    expect(resRead.status).toBe(200);
    expect(resRead.body.data.length).toBeGreaterThan(0);

    const resListen = await request(app).get('/api/v1/practice/listening');
    expect(resListen.status).toBe(200);
    expect(resListen.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/practice/reading/:id and /listening/:id return full tests and handle 404', async () => {
    const resRead = await request(app).get('/api/v1/practice/reading/read-test-001');
    expect(resRead.status).toBe(200);
    expect(resRead.body.data.passage).toBeDefined();
    expect(resRead.body.data.questions.length).toBeGreaterThan(0);

    const resReadNotFound = await request(app).get('/api/v1/practice/reading/non-existent-test');
    expect(resReadNotFound.status).toBe(404);
    expect(resReadNotFound.body.error.code).toBe('TEST_NOT_FOUND');

    const resListen = await request(app).get('/api/v1/practice/listening/listen-test-001');
    expect(resListen.status).toBe(200);
    expect(resListen.body.data.transcript).toBeDefined();

    const resListenNotFound = await request(app).get(
      '/api/v1/practice/listening/non-existent-listen'
    );
    expect(resListenNotFound.status).toBe(404);
    expect(resListenNotFound.body.error.code).toBe('TEST_NOT_FOUND');
  });

  it('POST /api/v1/practice/submit evaluates answers', async () => {
    const res = await request(app)
      .post('/api/v1/practice/submit')
      .send({
        testType: 'reading',
        testId: 'read-test-001',
        answers: { q1: 'TRUE', q2: 'B', q3: 'C' }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.scorePercentage).toBe(100);
    expect(res.body.data.estimatedBand).toBe(9.0);
  });

  it('POST /api/v1/practice/submit validates request body', async () => {
    const resMissingType = await request(app).post('/api/v1/practice/submit').send({});
    expect(resMissingType.status).toBe(400);
    expect(resMissingType.body.error.code).toBe('INVALID_TEST_TYPE');

    const resMissingId = await request(app)
      .post('/api/v1/practice/submit')
      .send({ testType: 'reading' });
    expect(resMissingId.status).toBe(400);
    expect(resMissingId.body.error.code).toBe('MISSING_TEST_ID');

    const resMissingAnswers = await request(app)
      .post('/api/v1/practice/submit')
      .send({ testType: 'reading', testId: 'read-test-001' });
    expect(resMissingAnswers.status).toBe(400);
    expect(resMissingAnswers.body.error.code).toBe('INVALID_ANSWERS');
  });
});
