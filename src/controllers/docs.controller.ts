import { Request, Response } from 'express';

export function getHealth(req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'IELTS-API'
  });
}

export function getApiOverview(req: Request, res: Response): void {
  res.json({
    name: 'IELTS-API',
    version: '1.0.0',
    description:
      'High-performance, free, unauthenticated IELTS API providing 4,300+ vocabulary terms, band score calculators, writing analysis, speaking question banks, practice tests, and institutional requirements.',
    authentication: 'None required (100% Free and Public)',
    endpoints: {
      documentation: {
        openapiSpec: '/api/v1/openapi.json',
        interactiveDocs: '/api/v1/docs'
      },
      health: '/api/v1/health',
      vocabulary: {
        list: 'GET /api/v1/vocabulary',
        getById: 'GET /api/v1/vocabulary/:id',
        getByWord: 'GET /api/v1/vocabulary/word/:word',
        random: 'GET /api/v1/vocabulary/random',
        chapters: 'GET /api/v1/vocabulary/chapters',
        quiz: 'GET /api/v1/vocabulary/quiz',
        flashcards: 'GET /api/v1/vocabulary/flashcards'
      },
      writing: {
        prompts: 'GET /api/v1/writing/prompts',
        promptById: 'GET /api/v1/writing/prompts/:id',
        randomPrompt: 'GET /api/v1/writing/prompts/random',
        bandDescriptors: 'GET /api/v1/writing/band-descriptors',
        cohesiveDevices: 'GET /api/v1/writing/cohesive-devices',
        vocabularyTiers: 'GET /api/v1/writing/vocabulary-tiers',
        analyzeEssay: 'POST /api/v1/writing/analyze'
      },
      speaking: {
        bandDescriptors: 'GET /api/v1/speaking/band-descriptors',
        part1Topics: 'GET /api/v1/speaking/part1-topics',
        part1TopicById: 'GET /api/v1/speaking/part1-topics/:id',
        part2CueCards: 'GET /api/v1/speaking/part2-cue-cards',
        cueCardById: 'GET /api/v1/speaking/part2-cue-cards/:id',
        randomCueCard: 'GET /api/v1/speaking/part2-cue-cards/random',
        formulas: 'GET /api/v1/speaking/formulas',
        transcripts: 'GET /api/v1/speaking/transcripts'
      },
      calculator: {
        overall: 'POST or GET /api/v1/calculator/overall',
        rawToBand: 'GET /api/v1/calculator/raw-to-band',
        targetPlanner: 'POST /api/v1/calculator/target-planner',
        clb: 'POST or GET /api/v1/calculator/clb',
        tables: 'GET /api/v1/calculator/tables'
      },
      colleges: {
        list: 'GET /api/v1/colleges',
        byId: 'GET /api/v1/colleges/:id',
        byProvince: 'GET /api/v1/colleges/provinces'
      },
      resources: {
        list: 'GET /api/v1/resources',
        byId: 'GET /api/v1/resources/:id',
        summary: 'GET /api/v1/resources/summary'
      },
      practice: {
        readingTests: 'GET /api/v1/practice/reading',
        readingTestById: 'GET /api/v1/practice/reading/:id',
        listeningTests: 'GET /api/v1/practice/listening',
        listeningTestById: 'GET /api/v1/practice/listening/:id',
        submit: 'POST /api/v1/practice/submit'
      }
    }
  });
}

export function getOpenApiSpec(req: Request, res: Response): void {
  const host = (req.headers && req.headers.host) || 'localhost:3000';
  const protocol = req.protocol || 'http';

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'IELTS-API',
      version: '1.0.0',
      description:
        'Comprehensive, free, unauthenticated IELTS API with vocabulary, scoring calculators, writing analysis, speaking topics, practice tests, and institutional requirements.',
      contact: {
        name: 'IELTS-API Maintainers'
      }
    },
    servers: [
      {
        url: `${protocol}://${host}`,
        description: 'Current Environment'
      }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': { description: 'API service is operational' }
          }
        }
      },
      '/api/v1/vocabulary': {
        get: {
          summary: 'List and filter IELTS vocabulary',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'chapter', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 22 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'prefix', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            {
              name: 'sort',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['word_asc', 'word_desc', 'id_asc', 'id_desc', 'chapter_asc', 'chapter_desc']
              }
            }
          ],
          responses: {
            '200': { description: 'Paginated list of vocabulary items' }
          }
        }
      },
      '/api/v1/vocabulary/{id}': {
        get: {
          summary: 'Get vocabulary item by numeric ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Vocabulary item found' },
            '404': { description: 'Vocabulary item not found' }
          }
        }
      },
      '/api/v1/vocabulary/word/{word}': {
        get: {
          summary: 'Get vocabulary item by word string',
          parameters: [{ name: 'word', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Vocabulary item found' },
            '404': { description: 'Word not found' }
          }
        }
      },
      '/api/v1/vocabulary/random': {
        get: {
          summary: 'Get random IELTS vocabulary items',
          parameters: [
            { name: 'count', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'chapter', in: 'query', schema: { type: 'integer' } }
          ],
          responses: { '200': { description: 'Random vocabulary item(s)' } }
        }
      },
      '/api/v1/vocabulary/chapters': {
        get: {
          summary: 'Get all 22 vocabulary chapters metadata & sample words',
          responses: { '200': { description: 'Chapter summaries' } }
        }
      },
      '/api/v1/vocabulary/quiz': {
        get: {
          summary: 'Generate IELTS vocabulary quiz questions',
          parameters: [
            { name: 'count', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'chapter', in: 'query', schema: { type: 'integer' } },
            {
              name: 'type',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['multipleChoice', 'definitionMatch', 'phoneticMatch']
              }
            }
          ],
          responses: { '200': { description: 'Generated quiz questions' } }
        }
      },
      '/api/v1/vocabulary/flashcards': {
        get: {
          summary: 'Generate IELTS vocabulary flashcards',
          parameters: [
            { name: 'count', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'chapter', in: 'query', schema: { type: 'integer' } }
          ],
          responses: { '200': { description: 'Generated flashcards' } }
        }
      },
      '/api/v1/writing/prompts': {
        get: {
          summary: 'List IELTS writing prompts and sample band 7-9 essays',
          parameters: [
            { name: 'taskType', in: 'query', schema: { type: 'string', enum: ['task1', 'task2'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: { '200': { description: 'List of writing prompts' } }
        }
      },
      '/api/v1/writing/analyze': {
        post: {
          summary:
            'Analyze IELTS essay for word count, readability, cohesive devices, and estimated band score',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: { type: 'string' },
                    taskType: { type: 'string', enum: ['task1', 'task2'], default: 'task2' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Detailed essay evaluation' } }
        }
      },
      '/api/v1/calculator/overall': {
        post: {
          summary: 'Calculate overall IELTS band score from 4 sub-scores',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['listening', 'reading', 'writing', 'speaking'],
                  properties: {
                    listening: { type: 'number', minimum: 0, maximum: 9 },
                    reading: { type: 'number', minimum: 0, maximum: 9 },
                    writing: { type: 'number', minimum: 0, maximum: 9 },
                    speaking: { type: 'number', minimum: 0, maximum: 9 }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Overall band score and CEFR level' } }
        }
      },
      '/api/v1/calculator/raw-to-band': {
        get: {
          summary: 'Convert raw test score (0-40) to IELTS Band Score',
          parameters: [
            {
              name: 'score',
              in: 'query',
              required: true,
              schema: { type: 'integer', minimum: 0, maximum: 40 }
            },
            {
              name: 'type',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['academicReading', 'generalTrainingReading', 'listening'],
                default: 'academicReading'
              }
            }
          ],
          responses: { '200': { description: 'Calculated band score' } }
        }
      },
      '/api/v1/colleges': {
        get: {
          summary: 'List Canadian colleges and their IELTS entry requirements',
          parameters: [
            { name: 'province', in: 'query', schema: { type: 'string' } },
            { name: 'provinceCode', in: 'query', schema: { type: 'string' } },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: { '200': { description: 'List of colleges' } }
        }
      }
    }
  };

  res.json(spec);
}
