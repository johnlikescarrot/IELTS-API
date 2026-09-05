import { describe, expect, it } from 'vitest';

import {
  READING_TOPIC_GROUPS,
  READING_TOPICS,
  findReadingTopic,
  readingTopicStats,
  slugifyTitle,
} from '../../src/data/reading-topics.js';

describe('READING_TOPICS', () => {
  it('holds the fifty topics, ranked and grouped', () => {
    expect(READING_TOPICS).toHaveLength(50);
    expect(READING_TOPICS[0]?.rank).toBe(1);
    expect(READING_TOPICS[49]?.rank).toBe(50);
    expect(new Set(READING_TOPICS.map((topic) => topic.id)).size).toBe(READING_TOPICS.length);
  });

  it('uses only known groups', () => {
    expect(READING_TOPICS.every((topic) => READING_TOPIC_GROUPS.includes(topic.group))).toBe(true);
    for (const group of READING_TOPIC_GROUPS) {
      expect(READING_TOPICS.some((topic) => topic.group === group)).toBe(true);
    }
  });

  it('attaches five collocations and a prompt to each topic', () => {
    for (const topic of READING_TOPICS) {
      expect(topic.collocations).toHaveLength(5);
      expect(topic.collocations.every((chunk) => chunk.includes('—'))).toBe(true);
      expect(topic.studyPrompt.length).toBeGreaterThan(20);
      expect(topic.commonIn).toContain('reading');
      expect(
        topic.commonIn.every((surface) =>
          ['reading', 'listening', 'writing-task-2', 'speaking-part-2', 'speaking-part-3'].includes(surface),
        ),
      ).toBe(true);
    }
  });

  it('marks lecture-heavy topics with listening exposure', () => {
    const nuclear = findReadingTopic('nuclear-energy');
    expect(nuclear?.commonIn).toContain('listening');
    const recycling = findReadingTopic('recycling-waste-management');
    expect(recycling?.commonIn).not.toContain('listening');
  });
});

describe('readingTopicStats', () => {
  it('counts per group', () => {
    const stats = readingTopicStats();
    expect(stats.topics ?? 0).toBe(50);
    expect(stats.groups).toBe(READING_TOPIC_GROUPS.length);
    const sum = READING_TOPIC_GROUPS.reduce((total, group) => total + (stats[group] ?? 0), 0);
    expect(sum).toBe(50);
  });
});

describe('slugifyTitle', () => {
  it('slugifies human titles', () => {
    expect(slugifyTitle('  Space exploration!! ')).toBe('space-exploration');
    expect(slugifyTitle('A / B & C')).toBe('a-b-c');
  });
});

describe('findReadingTopic', () => {
  it('resolves ids', () => {
    expect(findReadingTopic('climate-change-global-warming')?.group).toBe('environment');
  });

  it('returns undefined for unknown ids', () => {
    expect(findReadingTopic('beekeeping')).toBeUndefined();
  });
});
