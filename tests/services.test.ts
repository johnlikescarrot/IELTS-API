import { describe, expect, it } from 'vitest';
import { topics } from '../src/data/index.js';
import { getTopic, listTopics } from '../src/services/topics.js';
import { getResource, listResources } from '../src/services/resources.js';
import { getWritingSample, listWritingSamples } from '../src/services/writing.js';
import { startServer } from '../src/server.js';

describe('topic service', () => {
  it('finds a topic by numeric id', () => {
    expect(getTopic(1)?.name).toBe('Advertising');
  });

  it('finds a topic by string id', () => {
    expect(getTopic('2')?.name).toBe('Animal rights');
  });

  it('returns undefined for non-numeric ids and bounded ids', () => {
    expect(getTopic('abc')).toBeUndefined();
    expect(getTopic(-1)).toBeUndefined();
    expect(getTopic(0)).toBeUndefined();
    expect(getTopic(999)).toBeUndefined();
  });

  it('lists summaries with an empty options object', () => {
    const result = listTopics();
    expect(result.count).toBe(topics.length);
    expect(result.topics[0]?.sectionsCount).toBeGreaterThan(0);
  });

  it('returns no topics for unmatched queries and sections', () => {
    expect(listTopics({ query: 'zzz-no-match' }).count).toBe(0);
    expect(listTopics({ section: 'zzz-no-match' }).count).toBe(0);
  });

  it('filters by section across every topic', () => {
    const result = listTopics({ query: 'advertising', section: 'negatives' });
    expect(result.topics.map((topic) => topic.id)).toContain(1);
  });
});

describe('resource service', () => {
  it('finds a resource by id', () => {
    const all = listResources();
    expect(getResource(all.resources[0]?.id ?? 'missing')?.id).toBe(all.resources[0]?.id);
  });

  it('returns undefined for unknown ids', () => {
    expect(getResource('missing-id')).toBeUndefined();
  });

  it('filters by category, format and query', () => {
    const filtered = listResources({ category: 'writing', format: 'epub', query: 'writing' });
    expect(filtered.count).toBeGreaterThan(0);
    expect(filtered.resources[0]?.category).toBe('writing');
  });

  it('returns empty results for a non-matching query', () => {
    expect(listResources({ query: 'zzz-does-not-exist' }).count).toBe(0);
  });
});

describe('writing service', () => {
  it('finds a writing sample by id', () => {
    expect(getWritingSample('test-3-task-2-band-7')?.band).toBe(7);
  });

  it('returns undefined for unknown ids', () => {
    expect(getWritingSample('missing')).toBeUndefined();
  });

  it('lists and filters writing samples', () => {
    expect(listWritingSamples().count).toBe(1);
    expect(listWritingSamples('advertising').count).toBe(1);
    expect(listWritingSamples('zzz').count).toBe(0);
  });
});

describe('server', () => {
  it('starts and stops on an ephemeral port', async () => {
    const server = await startServer({ port: 0, host: '127.0.0.1' });
    expect(server.server.listening).toBe(true);
    await server.close();
    expect(server.server.listening).toBe(false);
  });
});
