import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Calculator Endpoints (/api/v1/calculator)', () => {
  describe('Overall Band Score Calculator', () => {
    it('calculates overall score via POST', async () => {
      const res = await request(app)
        .post('/api/v1/calculator/overall')
        .send({ listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallBandScore).toBe(7.0);
      expect(res.body.data.exactAverage).toBe(7.0);
      expect(res.body.data.cefrLevel).toBe('C1');
    });

    it('calculates overall score via GET query params', async () => {
      const res = await request(app).get(
        '/api/v1/calculator/overall?listening=6.5&reading=6.5&writing=6.5&speaking=6.5'
      );
      expect(res.status).toBe(200);
      expect(res.body.data.overallBandScore).toBe(6.5);
    });

    it('returns error when subscores are missing or invalid', async () => {
      const resMissing = await request(app)
        .post('/api/v1/calculator/overall')
        .send({ listening: 7.0 });
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('MISSING_SKILL_SCORES');

      const resInvalidScore = await request(app)
        .post('/api/v1/calculator/overall')
        .send({ listening: 'invalid', reading: 7.0, writing: 6.5, speaking: 7.0 });
      expect(resInvalidScore.status).toBe(400);
      expect(resInvalidScore.body.error.code).toBe('INVALID_SCORE');
    });
  });

  describe('Raw to Band Score Converter', () => {
    it('converts raw scores accurately', async () => {
      const resAcad = await request(app).get(
        '/api/v1/calculator/raw-to-band?score=36&type=academicReading'
      );
      expect(resAcad.status).toBe(200);
      expect(resAcad.body.data.bandScore).toBe(8.0);

      const resGen = await request(app).get(
        '/api/v1/calculator/raw-to-band?score=34&type=generalTrainingReading'
      );
      expect(resGen.status).toBe(200);
      expect(resGen.body.data.bandScore).toBe(7.0);

      const resList = await request(app).get(
        '/api/v1/calculator/raw-to-band?score=30&type=listening'
      );
      expect(resList.status).toBe(200);
      expect(resList.body.data.bandScore).toBe(7.0);
    });

    it('handles validation errors for raw scores and types', async () => {
      const resMissing = await request(app).get('/api/v1/calculator/raw-to-band');
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('MISSING_RAW_SCORE');

      const resOutOfRange = await request(app).get('/api/v1/calculator/raw-to-band?score=45');
      expect(resOutOfRange.status).toBe(400);
      expect(resOutOfRange.body.error.code).toBe('INVALID_RAW_SCORE');

      const resInvalidType = await request(app).get(
        '/api/v1/calculator/raw-to-band?score=30&type=unknownTest'
      );
      expect(resInvalidType.status).toBe(400);
      expect(resInvalidType.body.error.code).toBe('INVALID_TEST_TYPE');
    });
  });

  describe('Target Score Planner', () => {
    it('calculates target roadmap', async () => {
      const res = await request(app)
        .post('/api/v1/calculator/target-planner')
        .send({
          targetOverall: 7.5,
          knownScores: { listening: 8.0, reading: 7.5 }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.achievable).toBe(true);
      expect(res.body.data.remainingSkillsCount).toBe(2);
    });

    it('validates target planner inputs', async () => {
      const resMissing = await request(app).post('/api/v1/calculator/target-planner').send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('MISSING_TARGET_OVERALL');

      const resInvalidTarget = await request(app)
        .post('/api/v1/calculator/target-planner')
        .send({ targetOverall: 12 });
      expect(resInvalidTarget.status).toBe(400);
      expect(resInvalidTarget.body.error.code).toBe('INVALID_TARGET_SCORE');

      const resInvalidScores = await request(app)
        .post('/api/v1/calculator/target-planner')
        .send({ targetOverall: 7.0, knownScores: 'invalid' });
      expect(resInvalidScores.status).toBe(400);
      expect(resInvalidScores.body.error.code).toBe('INVALID_KNOWN_SCORES');
    });
  });

  describe('CLB Converter and Tables', () => {
    it('converts scores to Canadian Language Benchmark via POST and GET', async () => {
      const resPost = await request(app)
        .post('/api/v1/calculator/clb')
        .send({ listening: 8.0, reading: 7.0, writing: 7.0, speaking: 7.0 });
      expect(resPost.status).toBe(200);
      expect(resPost.body.data.minimumClbLevel).toBe(9);
      expect(resPost.body.data.expressEntryEligible).toBe(true);

      const resGet = await request(app).get(
        '/api/v1/calculator/clb?listening=6.0&reading=6.0&writing=6.0&speaking=6.0'
      );
      expect(resGet.status).toBe(200);
      expect(resGet.body.data.minimumClbLevel).toBe(7);

      const resMissing = await request(app).post('/api/v1/calculator/clb').send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('MISSING_SKILL_SCORES');

      const resInvalid = await request(app)
        .post('/api/v1/calculator/clb')
        .send({ listening: 'bad', reading: 7.0, writing: 7.0, speaking: 7.0 });
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error.code).toBe('INVALID_SCORE');
    });

    it('GET /api/v1/calculator/tables returns complete reference datasets', async () => {
      const res = await request(app).get('/api/v1/calculator/tables');
      expect(res.status).toBe(200);
      expect(res.body.data.academicReading).toBeDefined();
      expect(res.body.data.generalTrainingReading).toBeDefined();
      expect(res.body.data.listening).toBeDefined();
      expect(res.body.data.clbMapping).toBeDefined();
    });
  });
});
