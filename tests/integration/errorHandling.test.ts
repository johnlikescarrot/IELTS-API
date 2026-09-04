import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { createApp } from '../../src/app';
import { errorHandler, AppError } from '../../src/middlewares/errorHandler';
import { notFoundHandler } from '../../src/middlewares/notFoundHandler';
import { requestLogger } from '../../src/middlewares/requestLogger';

const app = createApp();

describe('Error Handling and Middleware', () => {
  it('returns 404 JSON for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.message).toContain('Cannot GET /api/v1/non-existent-route-xyz');
  });

  it('handles AppError with custom status codes and details', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test-app-error', () => {
      throw new AppError('Custom validation error message', 422, 'VALIDATION_FAILED', {
        field: 'username'
      });
    });
    testApp.use(errorHandler);

    return request(testApp)
      .get('/test-app-error')
      .then((res) => {
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
        expect(res.body.error.details).toEqual({ field: 'username' });
      });
  });

  it('handles unexpected generic errors and custom error statuses', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test-generic-error', () => {
      throw new Error('Unexpected crash occurred');
    });
    testApp.get('/test-status-error', (req: Request, res: Response, next: NextFunction) => {
      const err = new Error('Custom status error') as Error & { status?: number };
      err.status = 503;
      next(err);
    });
    testApp.use(errorHandler);

    return request(testApp)
      .get('/test-generic-error')
      .then((res) => {
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(res.body.error.message).toBe('Unexpected crash occurred');
      })
      .then(() =>
        request(testApp)
          .get('/test-status-error')
          .then((res) => {
            expect(res.status).toBe(503);
            expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
          })
      );
  });

  it('tests requestLogger in non-test mode', (done) => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const testApp = express();
    testApp.use(requestLogger);
    testApp.get('/log-test', (req, res) => {
      res.status(200).send('ok');
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    request(testApp)
      .get('/log-test')
      .expect(200)
      .end(() => {
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
        done();
      });
  });

  it('tests notFoundHandler directly', () => {
    const testApp = express();
    testApp.use(notFoundHandler);

    return request(testApp)
      .post('/custom-missing-path')
      .then((res) => {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
      });
  });
});
