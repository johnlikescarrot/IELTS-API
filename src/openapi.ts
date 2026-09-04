import { API_VERSION } from './version.js';

function collection(path: string, description: string): Record<string, unknown> {
  return {
    get: {
      summary: description,
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      ],
      responses: { '200': { description: `${path} result page` } },
    },
  };
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IELTS-API',
    version: API_VERSION,
    description:
      'Free, no-auth IELTS practice API. Vocabulary, writing prompts and samples, speaking topics, reading/listening practice, grammar, phrases, study plans and band-score calculators. No API key required.',
    license: { name: 'MIT' },
  },
  servers: [{ url: 'https://ielts-api.example.org' }],
  tags: [
    { name: 'meta', description: 'Service info and dataset statistics' },
    { name: 'vocabulary', description: 'Searchable IELTS vocabulary' },
    { name: 'writing', description: 'Task 1/2 prompts, samples, tips, common mistakes' },
    { name: 'speaking', description: 'Part 1/2/3 topics and tips' },
    { name: 'reading', description: 'Question types, tips and practice sets' },
    { name: 'listening', description: 'Question types, tips and practice sets' },
    {
      name: 'language',
      description: 'Grammar rules, collocations, idioms, phrasal verbs',
    },
    { name: 'plans', description: 'Week-by-week study plans' },
    { name: 'calculators', description: 'Band-score converters' },
  ],
  paths: {
    '/': {
      get: {
        summary: 'API welcome and endpoint index',
        responses: { '200': { description: 'Welcome payload' } },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Health payload' } },
      },
    },
    '/openapi.json': {
      get: {
        summary: 'This OpenAPI document',
        responses: { '200': { description: 'OpenAPI JSON' } },
      },
    },
    '/api/v1/meta': {
      get: {
        summary: 'Dataset counts',
        responses: { '200': { description: 'Counts payload' } },
      },
    },
    '/api/v1/vocabulary': collection(
      'vocabulary',
      'Search vocabulary by word, level, category or part of speech',
    ),
    '/api/v1/vocabulary/random': {
      get: {
        summary: 'Random vocabulary items',
        responses: { '200': { description: 'Random items' } },
      },
    },
    '/api/v1/vocabulary/{id}': {
      get: {
        summary: 'Vocabulary entry by id',
        responses: {
          '200': { description: 'Entry' },
          '404': { description: 'Unknown id' },
        },
      },
    },
    '/api/v1/writing/task1': collection('task1', 'Writing Task 1 prompts'),
    '/api/v1/writing/task2': collection('task2', 'Writing Task 2 prompts'),
    '/api/v1/writing/samples': collection('samples', 'Band-scored writing samples'),
    '/api/v1/writing/tips': {
      get: { summary: 'Writing tips', responses: { '200': { description: 'Tips' } } },
    },
    '/api/v1/writing/common-mistakes': collection(
      'mistakes',
      'Common writing mistakes with corrections',
    ),
    '/api/v1/speaking/part1': collection('part1', 'Speaking Part 1 topics'),
    '/api/v1/speaking/part2': collection('part2', 'Speaking Part 2 cue cards'),
    '/api/v1/speaking/part3': collection('part3', 'Speaking Part 3 topics'),
    '/api/v1/speaking/tips': {
      get: { summary: 'Speaking tips', responses: { '200': { description: 'Tips' } } },
    },
    '/api/v1/reading/question-types': {
      get: {
        summary: 'Reading question types',
        responses: { '200': { description: 'Question types' } },
      },
    },
    '/api/v1/reading/tips': {
      get: { summary: 'Reading tips', responses: { '200': { description: 'Tips' } } },
    },
    '/api/v1/reading/practice': {
      get: {
        summary: 'Reading practice sets',
        responses: { '200': { description: 'Practice sets' } },
      },
    },
    '/api/v1/listening/question-types': {
      get: {
        summary: 'Listening question types',
        responses: { '200': { description: 'Question types' } },
      },
    },
    '/api/v1/listening/tips': {
      get: { summary: 'Listening tips', responses: { '200': { description: 'Tips' } } },
    },
    '/api/v1/listening/practice': {
      get: {
        summary: 'Listening practice sets',
        responses: { '200': { description: 'Practice sets' } },
      },
    },
    '/api/v1/grammar': collection('grammar', 'Grammar rules with examples'),
    '/api/v1/grammar/{id}': {
      get: {
        summary: 'Grammar rule by id',
        responses: {
          '200': { description: 'Rule' },
          '404': { description: 'Unknown id' },
        },
      },
    },
    '/api/v1/collocations': collection('collocations', 'Academic collocations'),
    '/api/v1/idioms': collection('idioms', 'Idioms for speaking'),
    '/api/v1/phrasal-verbs': collection('phrasal-verbs', 'Phrasal verbs with examples'),
    '/api/v1/resources': collection(
      'resources',
      'Curated links to free external IELTS collections',
    ),
    '/api/v1/study-plans': {
      get: { summary: 'Study plans', responses: { '200': { description: 'Plans' } } },
    },
    '/api/v1/study-plans/{id}': {
      get: {
        summary: 'Study plan by id',
        responses: {
          '200': { description: 'Plan' },
          '404': { description: 'Unknown id' },
        },
      },
    },
    '/api/v1/calculators/overall': {
      get: {
        summary: 'Overall band from four component scores',
        responses: {
          '200': { description: 'Overall band' },
          '400': { description: 'Invalid score' },
        },
      },
    },
    '/api/v1/calculators/listening': {
      get: {
        summary: 'Listening raw score (0-40) to band',
        responses: {
          '200': { description: 'Listening band' },
          '400': { description: 'Invalid raw score' },
        },
      },
    },
    '/api/v1/calculators/reading': {
      get: {
        summary: 'Reading raw score (0-40) to band',
        responses: {
          '200': { description: 'Reading band' },
          '400': { description: 'Invalid raw score or type' },
        },
      },
    },
  },
};
