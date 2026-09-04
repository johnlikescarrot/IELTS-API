import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/lib/errors.js';
import {
  getTopic,
  listTopics,
  randomVocab,
  searchVocab
} from '../../src/services/vocab.service.js';

describe('listTopics', () => {
  it('lists all twelve topic packs with word counts', () => {
    const topics = listTopics();
    expect(topics).toHaveLength(12);
    expect(topics.every((topic) => topic.wordCount === 8)).toBe(true);
    expect(topics.map((topic) => topic.id)).toContain('education');
  });
});

describe('getTopic', () => {
  it('returns a pack by id, case-insensitively', () => {
    expect(getTopic('education').topic).toBe('Education');
    expect(getTopic('EDUCATION').topic).toBe('Education');
  });

  it('throws NotFoundError for unknown ids', () => {
    expect(() => getTopic('astronomy')).toThrow(NotFoundError);
  });
});

describe('searchVocab', () => {
  it('matches terms first', () => {
    const hits = searchVocab('carbon emissions', 10);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.matchedIn).toBe('term');
    expect(hits[0]?.entry.term).toBe('carbon emissions');
  });

  it('matches meanings when the term does not match', () => {
    const hits = searchVocab('wind or solar', 10);
    expect(hits.some((hit) => hit.matchedIn === 'meaning')).toBe(true);
  });

  it('matches collocations as a last resort', () => {
    const hits = searchVocab('combat deforestation', 10);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.matchedIn === 'collocation')).toBe(true);
  });

  it('is case-insensitive and limited', () => {
    const hits = searchVocab('CARBON', 1);
    expect(hits).toHaveLength(1);
  });

  it('returns an empty array without matches', () => {
    expect(searchVocab('quantum chromodynamics', 10)).toEqual([]);
  });
});

describe('randomVocab', () => {
  it('is deterministic with a seed', () => {
    expect(randomVocab({ count: 4, seed: 'v' })).toEqual(randomVocab({ count: 4, seed: 'v' }));
  });

  it('restricts to one topic when topicId is given', () => {
    const entries = randomVocab({ count: 5, topicId: 'health', seed: 'h' });
    expect(entries).toHaveLength(5);
    expect(entries.every((entry) => entry.topicId === 'health')).toBe(true);
  });

  it('clamps count to the pool size', () => {
    const entries = randomVocab({ count: 500, topicId: 'health', seed: 'clamp' });
    expect(entries).toHaveLength(8);
  });

  it('throws for an unknown topic', () => {
    expect(() => randomVocab({ count: 3, topicId: 'nope', seed: 'x' })).toThrow(NotFoundError);
  });
});
