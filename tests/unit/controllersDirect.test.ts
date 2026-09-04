import { Request, Response, NextFunction } from 'express';
import * as vocabCtrl from '../../src/controllers/vocabulary.controller';
import * as writingCtrl from '../../src/controllers/writing.controller';
import * as speakingCtrl from '../../src/controllers/speaking.controller';
import * as calcCtrl from '../../src/controllers/calculator.controller';
import * as collegesCtrl from '../../src/controllers/colleges.controller';
import * as resourcesCtrl from '../../src/controllers/resources.controller';
import * as practiceCtrl from '../../src/controllers/practice.controller';
import * as docsCtrl from '../../src/controllers/docs.controller';
import { AppError, errorHandler } from '../../src/middlewares/errorHandler';

interface MockResponse {
  statusCode: number;
  data: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createMockReqRes(
  options: {
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) {
  const req = {
    query: options.query || {},
    params: options.params || {},
    body: options.body || {},
    headers: options.headers || {},
    get: (header: string) => options.headers?.[header.toLowerCase()] || undefined,
    protocol: 'http'
  } as unknown as Request;

  const res: MockResponse = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.data = data;
      return this;
    }
  };

  const next: NextFunction = jest.fn();

  return { req, res: res as unknown as Response, next, mockRes: res };
}

describe('Direct Controller Coverage & Error Catch Blocks', () => {
  describe('Docs Controller', () => {
    it('handles openApiSpec with missing host and protocol fallbacks', () => {
      const { req, res, mockRes } = createMockReqRes();
      // @ts-expect-error testing missing get method
      delete (req as Record<string, unknown>).get;
      // @ts-expect-error testing missing protocol
      delete (req as Record<string, unknown>).protocol;
      docsCtrl.getOpenApiSpec(req, res);
      expect((mockRes.data as { servers: { url: string }[] }).servers[0].url).toContain(
        'localhost:3000'
      );
    });

    it('handles openApiSpec when req.get returns custom host header', () => {
      const { req, res, mockRes } = createMockReqRes({
        headers: { host: 'api.ielts-prep.io' }
      });
      docsCtrl.getOpenApiSpec(req, res);
      expect((mockRes.data as { servers: { url: string }[] }).servers[0].url).toContain(
        'api.ielts-prep.io'
      );
    });
  });

  describe('Calculator Controller', () => {
    it('handles raw-to-band when score is passed as a number directly and type is omitted', () => {
      const { req, res, next, mockRes } = createMockReqRes({
        query: { score: 35 }
      });
      calcCtrl.convertRawScoreToBand(req, res, next);
      expect(mockRes.statusCode).toBe(200);
      expect((mockRes.data as { data: { bandScore: number } }).data.bandScore).toBe(8.0);
    });

    it('handles exceptions in getTables if res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated res.json failure');
        }
      } as unknown as Response;

      calcCtrl.getTables(req, throwingRes, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Colleges Controller', () => {
    it('handles exceptions in getProvinces if res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      collegesCtrl.getProvinces(req, throwingRes, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Practice Controller', () => {
    it('handles invalid testType where testType is a truthy but non-reading/listening string', () => {
      const { req, res, next } = createMockReqRes({
        body: { testType: 'speakingMock', testId: 'read-test-001', answers: {} }
      });
      practiceCtrl.submitAnswers(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('handles exceptions in getReadingTests and getListeningTests if res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      practiceCtrl.getReadingTests(req, throwingRes, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      const next2 = jest.fn();
      practiceCtrl.getListeningTests(req, throwingRes, next2);
      expect(next2).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Resources Controller', () => {
    it('handles exceptions in getResources and getSkillsSummary if res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      resourcesCtrl.getResources(req, throwingRes, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      const next2 = jest.fn();
      resourcesCtrl.getSkillsSummary(req, throwingRes, next2);
      expect(next2).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Speaking Controller', () => {
    it('handles exceptions across speaking controller endpoints when res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      speakingCtrl.getSpeakingBandDescriptors(req, throwingRes, next);
      speakingCtrl.getPart1Topics(req, throwingRes, next);
      speakingCtrl.getPart2CueCards(req, throwingRes, next);
      speakingCtrl.getSpeakingFormulas(req, throwingRes, next);
      speakingCtrl.getPracticeTranscripts(req, throwingRes, next);
      speakingCtrl.getRandomCueCard(req, throwingRes, next);

      expect(next).toHaveBeenCalledTimes(6);
    });
  });

  describe('Vocabulary Controller', () => {
    it('handles empty or whitespace word parameter in getWordByName', () => {
      const { req, res, next } = createMockReqRes({
        params: { word: '   ' }
      });
      vocabCtrl.getWordByName(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));

      const { req: reqEmpty, res: resEmpty, next: nextEmpty } = createMockReqRes();
      vocabCtrl.getWordByName(reqEmpty, resEmpty, nextEmpty);
      expect(nextEmpty).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('handles getRandomWord with invalid count or large count', () => {
      const { req, res, next, mockRes } = createMockReqRes({
        query: { count: 'invalid' }
      });
      vocabCtrl.getRandomWord(req, res, next);
      expect(mockRes.statusCode).toBe(200);
      expect((mockRes.data as { data: { word: string } }).data.word).toBeDefined();

      const {
        req: reqLarge,
        res: resLarge,
        next: nextLarge,
        mockRes: mockResLarge
      } = createMockReqRes({
        query: { count: '500' }
      });
      vocabCtrl.getRandomWord(reqLarge, resLarge, nextLarge);
      expect(mockResLarge.statusCode).toBe(200);
      expect((mockResLarge.data as { data: unknown[] }).data.length).toBe(20);
    });

    it('handles exceptions across vocabulary endpoints when res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      vocabCtrl.getChapters(req, throwingRes, next);
      vocabCtrl.getVocabularyQuiz(req, throwingRes, next);
      vocabCtrl.getVocabularyFlashcards(req, throwingRes, next);
      vocabCtrl.getRandomWord(req, throwingRes, next);

      expect(next).toHaveBeenCalledTimes(4);
    });
  });

  describe('Writing Controller', () => {
    it('handles getRandomPrompt without taskType query', () => {
      const { req, res, next, mockRes } = createMockReqRes();
      writingCtrl.getRandomPrompt(req, res, next);
      expect(mockRes.statusCode).toBe(200);
      expect((mockRes.data as { data: { prompt: string } }).data.prompt).toBeDefined();
    });

    it('handles analyzeEssay without explicit taskType in body', () => {
      const { req, res, next, mockRes } = createMockReqRes({
        body: { text: 'This is a sample essay about global warming and technology.' }
      });
      writingCtrl.analyzeEssay(req, res, next);
      expect(mockRes.statusCode).toBe(200);
      expect(
        (mockRes.data as { data: { bandEstimation: { taskTypeAssumed: string } } }).data
          .bandEstimation.taskTypeAssumed
      ).toBe('task2');
    });

    it('handles exceptions in getCohesiveDevices and getVocabularyTiers when res.json throws', () => {
      const { req, next } = createMockReqRes();
      const throwingRes = {
        json: () => {
          throw new Error('Simulated failure');
        }
      } as unknown as Response;

      writingCtrl.getCohesiveDevices(req, throwingRes, next);
      writingCtrl.getVocabularyTiers(req, throwingRes, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('AppError Defaults and ErrorHandler Fallbacks', () => {
    it('tests AppError default constructor values', () => {
      const err = new AppError('Basic error message');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.details).toBeUndefined();
    });

    it('tests errorHandler fallback with empty error message and default 500', () => {
      const { req, res, next, mockRes } = createMockReqRes();
      const emptyErr = new Error('');
      errorHandler(emptyErr, req, res, next);
      expect(mockRes.statusCode).toBe(500);
      expect((mockRes.data as { error: { message: string } }).error.message).toBe(
        'An unexpected error occurred.'
      );
    });
  });
});
