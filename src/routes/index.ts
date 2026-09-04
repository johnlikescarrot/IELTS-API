import type { FastifyInstance } from 'fastify';
import {
  API_BASE,
  SERVICE_DESCRIPTION,
  SERVICE_NAME,
  SERVICE_VERSION,
  SOURCE_REPOSITORY,
} from '../config.js';
import { citation, topics } from '../data/index.js';
import { getResource, listResources, resourceCategories } from '../services/resources.js';
import { getTopic, listTopics } from '../services/topics.js';
import { getWritingSample, listWritingSamples } from '../services/writing.js';
import type { IndexResponse } from '../types.js';

const asList = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export function registerRoutes(app: FastifyInstance): void {
  app.get('/', async () => ({
    name: SERVICE_NAME,
    version: SERVICE_VERSION,
    description: SERVICE_DESCRIPTION,
    api: `${API_BASE}/index`,
    health: '/health',
  }));

  app.get('/health', async () => ({
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    uptime: Math.floor(process.uptime()),
  }));

  app.get(`${API_BASE}/index`, async (): Promise<IndexResponse> => ({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    documentation: '/',
    baseUrl: API_BASE,
    endpoints: {
      topics: `${API_BASE}/ielts/topics`,
      topic: `${API_BASE}/ielts/topics/:id`,
      resources: `${API_BASE}/ielts/resources`,
      resource: `${API_BASE}/ielts/resources/:id`,
      'writing-practice': `${API_BASE}/ielts/writing`,
      'writing-sample': `${API_BASE}/ielts/writing/:id`,
      citation: `${API_BASE}/ielts/citation`,
    },
  }));

  app.get(`${API_BASE}/ielts/topics`, async (request) => {
    const query = request.query as { q?: string; section?: string };
    return listTopics({ query: query.q, section: query.section });
  });

  app.get<{ Params: { id: string } }>(`${API_BASE}/ielts/topics/:id`, async (request, reply) => {
    const topic = getTopic(request.params.id);
    if (!topic) {
      return reply
        .code(404)
        .send({ error: 'topic_not_found', message: 'No topic matches the supplied id.' });
    }
    return {
      totalPoints: topic.sections.reduce((sum, section) => sum + section.points.length, 0),
      totalSections: topic.sections.length,
      ...topic,
    };
  });

  app.get(`${API_BASE}/ielts/resources`, async (request) => {
    const query = request.query as { category?: string; format?: string; q?: string };
    return listResources({
      category: asList(query.category),
      format: asList(query.format),
      query: asList(query.q),
    });
  });

  app.get(`${API_BASE}/ielts/resources/meta`, async () => ({
    total: resourcesTotal,
    categories: resourceCategories(),
  }));

  app.get<{ Params: { id: string } }>(`${API_BASE}/ielts/resources/:id`, async (request, reply) => {
    const resource = getResource(request.params.id);
    if (!resource) {
      return reply.code(404).send({
        error: 'resource_not_found',
        message: 'No resource matches the supplied id.',
      });
    }
    return resource;
  });

  app.get(`${API_BASE}/ielts/writing`, async (request) => {
    const query = request.query as { q?: string };
    return listWritingSamples(query.q ?? '');
  });

  app.get<{ Params: { id: string } }>(`${API_BASE}/ielts/writing/:id`, async (request, reply) => {
    const sample = getWritingSample(request.params.id);
    if (!sample) {
      return reply.code(404).send({
        error: 'writing_sample_not_found',
        message: 'No writing sample matches the supplied id.',
      });
    }
    return sample;
  });

  app.get(`${API_BASE}/ielts/citation`, async () => ({
    ...citation,
    source: { repository: SOURCE_REPOSITORY },
    topics: topics.length,
  }));
}

const resourcesTotal = listResources().total;
