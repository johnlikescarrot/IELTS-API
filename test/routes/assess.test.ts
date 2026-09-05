import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestServer } from '../helpers/server.js';

import type { TestServer } from '../helpers/server.js';
import type { WritingAssessment } from '../../src/types.js';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

const SAMPLE = encodeURIComponent(
  'Overall, the chart illustrates wheat exports in three regions between 1985 and 1990. ' +
    'Canada exported more wheat than the other regions although its exports fell sharply after 1988, ' +
    'whereas the European Community rose steadily because demand increased. Australia declined over time.',
);

describe('GET /v1/assess/writing', () => {
  it('assesses a Task 2 sample with criteria, overall estimate and meta', async () => {
    const text = encodeURIComponent(
      'Education matters. Because tuition fees rise, many students doubt whether a university degree is worth it. ' +
        'However, an apprenticeship can offer employability without debt. Furthermore, if governments funded trade schools, ' +
        'opportunity would widen. For example, Germany invests heavily. In conclusion, societies should value both paths.',
    );
    const response = await server.json<WritingAssessment>(`/v1/assess/writing?text=${text}`);
    expect(response.status).toBe(200);
    expect(response.data.task).toBe('task2');
    expect(response.data.criteria).toHaveLength(4);
    expect(response.data.criteria[0]!.criterion).toBe('task-response');
    expect(response.data.overall.estimate).toBeGreaterThanOrEqual(4);
    expect(response.data.overall.estimate).toBeLessThanOrEqual(8);
    expect(response.data.evidence.themeMatched).toBeTypeOf('string');
    expect(response.data.corpusContext.group).toBeTypeOf('string');
    expect(response.data.disclaimer).toContain('not an official score');
    expect(response.meta.rulesAvailable).toBe(25);
    expect(response.meta.taskMinimumWords).toBe(250);
    expect(response.meta.limits).toEqual({ maxCharacters: 4000 });
    expect(String(response.meta.method)).toContain('baseline of 6.5');
  });

  it('assesses a Task 1 sample and names the achievement criterion', async () => {
    const response = await server.json<WritingAssessment>(`/v1/assess/writing?task=task1&text=${SAMPLE}`);
    expect(response.data.criteria[0]!.criterion).toBe('task-achievement');
    const overviewRules = response.data.criteria[0]!.rules.map((rule) => rule.rule);
    expect(overviewRules).toContain('task1-overview-present');
    expect(response.meta.taskMinimumWords).toBe(150);
  });

  it('produces byte-identical output for identical input', async () => {
    const first = await server.json<WritingAssessment>(`/v1/assess/writing?text=${SAMPLE}`);
    const second = await server.json<WritingAssessment>(`/v1/assess/writing?text=${SAMPLE}`);
    expect(JSON.stringify(first.data)).toBe(JSON.stringify(second.data));
  });

  it('requires the text parameter', async () => {
    const response = await server.json('/v1/assess/writing');
    expect(response.status).toBe(400);
    expect(response.meta.error).toMatchObject({ code: 'bad_request', details: { parameter: 'text' } });
  });

  it('rejects text without analysable words', async () => {
    const response = await server.json('/v1/assess/writing?text=123%20%3D%20%2B%20456');
    expect(response.status).toBe(400);
    expect(response.meta.error).toMatchObject({ code: 'bad_request', details: { parameter: 'text' } });
  });

  it('rejects text above the character cap', async () => {
    const text = encodeURIComponent('word '.repeat(900));
    const response = await server.json(`/v1/assess/writing?text=${text}`);
    expect(response.status).toBe(400);
    expect(response.meta.error).toMatchObject({ details: { parameter: 'text', limit: '4000' } });
  });

  it('rejects an unknown task', async () => {
    const response = await server.json(
      `/v1/assess/writing?task=task3&text=${encodeURIComponent('One two three.')}`,
    );
    expect(response.status).toBe(400);
    expect(response.meta.error).toMatchObject({ details: { parameter: 'task' } });
  });
});
