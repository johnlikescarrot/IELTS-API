import { topics } from '../data/index.js';
import type { Topic } from '../types.js';

export interface TopicSummary {
  id: number;
  name: string;
  sectionsCount: number;
  pointCount: number;
}

const includes = (value: string, needle: string): boolean =>
  needle.length === 0 || value.toLowerCase().includes(needle.toLowerCase()) === true;

const topicPointCount = (topic: Topic): number =>
  topic.sections.reduce((sum, section) => sum + section.points.length, 0);

const toSummary = (topic: Topic): TopicSummary => ({
  id: topic.id,
  name: topic.name,
  sectionsCount: topic.sections.length,
  pointCount: topicPointCount(topic),
});

const topicMatchesSearch = (topic: Topic, query: string): boolean => {
  const haystack = [
    topic.name,
    ...topic.sections.flatMap((section) => [section.title, ...section.points]),
  ].join(' ');
  return includes(haystack, query);
};

const topicMatchesSection = (topic: Topic, section: string): boolean =>
  topic.sections.some((candidate) => includes(candidate.title, section));

export function listTopics(
  options: {
    query?: string | undefined;
    section?: string | undefined;
  } = {},
): {
  count: number;
  total: number;
  topics: TopicSummary[];
} {
  const query = options.query?.trim() ?? '';
  const section = options.section?.trim() ?? '';
  const filtered = topics.filter(
    (topic) => topicMatchesSearch(topic, query) && topicMatchesSection(topic, section),
  );
  return { count: filtered.length, total: topics.length, topics: filtered.map(toSummary) };
}

export function getTopic(id: string | number): Topic | undefined {
  const numericId = typeof id === 'number' ? id : Number(id);
  if (Number.isNaN(numericId) || numericId <= 0) {
    return undefined;
  }
  return topics.find((topic) => topic.id === numericId);
}
