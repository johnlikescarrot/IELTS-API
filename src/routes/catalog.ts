/**
 * Self-documenting endpoint catalog served at `/` and `/v1`.
 */

export interface EndpointDoc {
  readonly method: string;
  readonly path: string;
  readonly description: string;
  readonly query?: readonly string[];
  readonly body?: Readonly<Record<string, string>>;
}

export interface ApiIndex {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly authentication: 'none';
  readonly cost: 'free';
  readonly docs: readonly EndpointDoc[];
}

export const API_VERSION = '1.0.0';
export const API_NAME = 'IELTS API';

export const ENDPOINTS: readonly EndpointDoc[] = [
  { method: 'GET', path: '/health', description: 'Liveness probe with uptime and version.' },
  { method: 'GET', path: '/v1', description: 'This endpoint catalog.' },
  {
    method: 'GET',
    path: '/v1/vocab/awl',
    description: 'Overview of the 10 Academic Word List sublists (570 word families).'
  },
  {
    method: 'GET',
    path: '/v1/vocab/awl/sublists/:sublist',
    description: 'Words in one AWL sublist, paginated.',
    query: ['page (1-...)', 'limit (1-100)']
  },
  {
    method: 'GET',
    path: '/v1/vocab/awl/words/:word',
    description: 'Details for one AWL word family.'
  },
  {
    method: 'GET',
    path: '/v1/vocab/awl/random',
    description: 'Random AWL words; deterministic when `seed` is provided.',
    query: ['count (1-50)', 'sublist (1-10)', 'seed']
  },
  { method: 'GET', path: '/v1/vocab/topics', description: 'List of topic vocabulary packs.' },
  { method: 'GET', path: '/v1/vocab/topics/:topicId', description: 'One topic vocabulary pack.' },
  {
    method: 'GET',
    path: '/v1/vocab/search',
    description: 'Search the AWL and topic vocabulary at once.',
    query: ['q (required, 1-60 chars)', 'scope (awl | topics | all)', 'limit (1-50)']
  },
  {
    method: 'GET',
    path: '/v1/questions',
    description: 'Browse the question bank.',
    query: ['skill (speaking | writing)', 'part (1-3)', 'topic (substring)', 'page', 'limit']
  },
  { method: 'GET', path: '/v1/questions/:id', description: 'One question by id.' },
  {
    method: 'GET',
    path: '/v1/questions/random',
    description: 'One random question, deterministic with `seed`.',
    query: ['skill', 'part', 'topic', 'seed']
  },
  {
    method: 'GET',
    path: '/v1/scoring/tables',
    description: 'All raw-to-band conversion tables with the accuracy disclaimer.'
  },
  {
    method: 'GET',
    path: '/v1/scoring/conversion',
    description: 'Convert one raw score to a band.',
    query: ['module (listening | reading-academic | reading-general-training)', 'raw (0-40)']
  },
  {
    method: 'POST',
    path: '/v1/scoring/overall',
    description: 'Calculate the overall band from four skill scores (half-band steps).',
    body: {
      listening: '0-9 in 0.5 steps',
      reading: '0-9 in 0.5 steps',
      writing: '0-9 in 0.5 steps',
      speaking: '0-9 in 0.5 steps'
    }
  },
  { method: 'GET', path: '/v1/bands', description: 'The nine-band scale overview.' },
  { method: 'GET', path: '/v1/bands/:band', description: 'Overview of one band (1-9).' },
  {
    method: 'GET',
    path: '/v1/bands/writing/:task',
    description: 'Writing band descriptors by task.',
    query: ['task (1 | 2)', 'criterion (optional: filters to one criterion)']
  },
  {
    method: 'GET',
    path: '/v1/bands/speaking',
    description: 'Speaking band descriptors for all criteria.',
    query: ['criterion (optional: filters to one criterion)']
  },
  {
    method: 'GET',
    path: '/v1/mistakes',
    description: 'Common IELTS mistakes with corrections.',
    query: ['category', 'page', 'limit']
  },
  { method: 'GET', path: '/v1/mistakes/:id', description: 'One mistake by id.' },
  {
    method: 'GET',
    path: '/v1/mistakes/random',
    description: 'Error-correction quiz, deterministic with `seed`.',
    query: ['count (1-20)', 'seed']
  },
  {
    method: 'GET',
    path: '/v1/practice/mock-test',
    description: 'A complete mock test (Speaking 1-3 + Writing 1-2) with timing and instructions.',
    query: ['seed']
  },
  {
    method: 'GET',
    path: '/v1/practice/vocab-quiz',
    description: 'Multiple-choice vocabulary quiz.',
    query: ['count (1-20)', 'topicId', 'seed']
  },
  {
    method: 'GET',
    path: '/v1/practice/study-plan',
    description: 'A generated week-by-week study plan.',
    query: ['currentBand (1-9, 0.5 steps)', 'targetBand (>= currentBand)', 'weeks (1-52)', 'seed']
  }
];

export function getApiIndex(): ApiIndex {
  return {
    name: API_NAME,
    version: API_VERSION,
    description:
      'A free, no-authentication IELTS preparation API: Academic Word List vocabulary, topic vocabulary, question banks, band descriptors, score conversion, common mistakes and practice material.',
    authentication: 'none',
    cost: 'free',
    docs: ENDPOINTS
  };
}
