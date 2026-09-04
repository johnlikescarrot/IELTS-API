import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Writing Endpoints (/api/v1/writing)', () => {
  it('GET /api/v1/writing/prompts returns prompts with filtering and search', async () => {
    const res = await request(app).get('/api/v1/writing/prompts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const resTask2 = await request(app).get('/api/v1/writing/prompts?taskType=task2');
    expect(resTask2.status).toBe(200);
    expect(resTask2.body.data.every((p: { taskType: string }) => p.taskType === 'task2')).toBe(
      true
    );

    const resSearch = await request(app).get('/api/v1/writing/prompts?search=advertising');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBeGreaterThan(0);

    const resCat = await request(app).get('/api/v1/writing/prompts?category=Media');
    expect(resCat.status).toBe(200);
    expect(resCat.body.data.length).toBeGreaterThan(0);

    const resInvalid = await request(app).get('/api/v1/writing/prompts?taskType=task3');
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('INVALID_TASK_TYPE');
  });

  it('GET /api/v1/writing/prompts/:id returns prompt and sample essay details', async () => {
    const res = await request(app).get('/api/v1/writing/prompts/task2-001');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('task2-001');
    expect(res.body.data.sampleEssay).toBeDefined();
    expect(res.body.data.examinerFeedback).toBeDefined();

    const resNotFound = await request(app).get('/api/v1/writing/prompts/unknown-task-id');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('PROMPT_NOT_FOUND');
  });

  it('GET /api/v1/writing/prompts/random returns a random prompt', async () => {
    const res = await request(app).get('/api/v1/writing/prompts/random?taskType=task1');
    expect(res.status).toBe(200);
    expect(res.body.data.taskType).toBe('task1');

    const resInvalid = await request(app).get(
      '/api/v1/writing/prompts/random?taskType=invalidTask'
    );
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('INVALID_TASK_TYPE');
  });

  it('GET /api/v1/writing/band-descriptors returns IELTS writing rubrics', async () => {
    const resAll = await request(app).get('/api/v1/writing/band-descriptors');
    expect(resAll.status).toBe(200);
    expect(resAll.body.data.task1).toBeDefined();
    expect(resAll.body.data.task2).toBeDefined();

    const resTask1 = await request(app).get('/api/v1/writing/band-descriptors?taskType=task1');
    expect(resTask1.status).toBe(200);
    expect(resTask1.body.data.taskType).toBe('task1');

    const resInvalid = await request(app).get('/api/v1/writing/band-descriptors?taskType=task5');
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('INVALID_TASK_TYPE');
  });

  it('GET /api/v1/writing/cohesive-devices and /vocabulary-tiers return references', async () => {
    const resCohesive = await request(app).get('/api/v1/writing/cohesive-devices');
    expect(resCohesive.status).toBe(200);
    expect(resCohesive.body.data.addition).toBeDefined();

    const resTiers = await request(app).get('/api/v1/writing/vocabulary-tiers');
    expect(resTiers.status).toBe(200);
    expect(resTiers.body.data.band8Plus).toBeDefined();
  });

  it('POST /api/v1/writing/analyze performs full automated essay assessment', async () => {
    const essay = `Nowadays, environmental conservation has become a paramount global challenge. While some individuals assert that governments should bear primary responsibility, others argue that personal actions are equally essential.

On the one hand, state administrations hold the legislative authority to enforce stringent emissions caps and heavily subsidize green infrastructure. For example, national carbon pricing mechanisms have successfully compelled multinational corporations to minimize industrial pollution. Consequently, state-led initiatives catalyze structural ecological progress.

On the other hand, individual behavioral shifts are undeniably crucial. If the global populace fails to adopt sustainable habits, such as reducing single-use plastics and minimizing domestic power usage, legislative policies will have limited efficacy.

In conclusion, a symbiotic paradigm involving both government regulations and individual mindfulness is imperative to preserve the planetary ecosystem.`;

    const res = await request(app)
      .post('/api/v1/writing/analyze')
      .send({ text: essay, taskType: 'task2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.wordCount).toBeGreaterThan(120);
    expect(res.body.data.cohesionAndTransitions.totalCohesiveDevicesFound).toBeGreaterThan(2);
    expect(res.body.data.bandEstimation.estimatedBandRange).toBeDefined();

    // Error cases
    const resMissing = await request(app).post('/api/v1/writing/analyze').send({});
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error.code).toBe('INVALID_ESSAY_TEXT');

    const resInvalidTask = await request(app)
      .post('/api/v1/writing/analyze')
      .send({ text: essay, taskType: 'invalidTask' });
    expect(resInvalidTask.status).toBe(400);
    expect(resInvalidTask.body.error.code).toBe('INVALID_TASK_TYPE');
  });
});
