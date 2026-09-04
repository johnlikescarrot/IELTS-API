import type { StudyResource } from '../types/ielts.js';

/**
 * A catalogue of free IELTS study resources.
 *
 * Every listed resource is free. Where an official target URL is available it
 * is provided; otherwise the resource is described by type and category so
 * users can find an equivalent or a locally available copy.
 */
export const STUDY_RESOURCES: readonly StudyResource[] = [
  {
    id: 'resource-001',
    title: 'IELTS Listening Practice Tests',
    type: 'practice',
    skill: 'listening',
    description: 'Full-length listening tests with an answer key for the Academic module.',
    url: 'https://www.ielts.org/',
    tags: ['listening', 'practice', 'band-score'],
  },
  {
    id: 'resource-002',
    title: 'IELTS Academic Reading Passages',
    type: 'practice',
    skill: 'reading',
    description: 'Timed academic reading passages with question sets and conversion tables.',
    url: 'https://www.ielts.org/',
    tags: ['reading', 'academic', 'practice'],
  },
  {
    id: 'resource-003',
    title: 'Writing Task 2 Sample Answers',
    type: 'reference',
    skill: 'writing',
    description: 'Model essays at different band levels annotated against the four criteria.',
    tags: ['writing', 'task-2', 'sample'],
  },
  {
    id: 'resource-004',
    title: 'Speaking Part 2 Cue Cards',
    type: 'practice',
    skill: 'speaking',
    description: 'Cue-card prompts with preparation time and follow-up questions.',
    tags: ['speaking', 'cue-card', 'practice'],
  },
  {
    id: 'resource-005',
    title: 'Vocabulary by Topic',
    type: 'reference',
    skill: 'vocabulary',
    description: 'Topic-specific word lists for education, environment, health, and society.',
    tags: ['vocabulary', 'topics', 'lexical-resource'],
  },
  {
    id: 'resource-006',
    title: 'Band Descriptor Guide',
    type: 'guide',
    skill: 'writing',
    description: 'How the four writing and four speaking criteria translate into a band.',
    tags: ['writing', 'speaking', 'descriptors'],
  },
  {
    id: 'resource-007',
    title: 'Common Mistakes Handbook',
    type: 'guide',
    skill: 'writing',
    description: 'A concise guide to grammar and style errors that lower a writing band.',
    tags: ['writing', 'grammar', 'mistakes'],
  },
  {
    id: 'resource-008',
    title: 'Listening Raw Score Converter',
    type: 'tool',
    skill: 'listening',
    description:
      'Convert a raw listening score out of 40 into a band using the official-style table.',
    tags: ['listening', 'scoring', 'tool'],
  },
  {
    id: 'resource-009',
    title: 'Reading Raw Score Converter',
    type: 'tool',
    skill: 'reading',
    description: 'Convert a raw reading score out of 40 into a band for either module.',
    tags: ['reading', 'scoring', 'tool'],
  },
  {
    id: 'resource-010',
    title: 'Study Planner',
    type: 'guide',
    skill: 'general',
    description: 'A free eight-week plan balancing practice across all four skills.',
    tags: ['planning', 'study', 'general'],
  },
  {
    id: 'resource-011',
    title: 'Grammar Reference',
    type: 'reference',
    skill: 'writing',
    description: 'A concise reference for the grammatical structures rewarded at higher bands.',
    tags: ['grammar', 'writing', 'reference'],
  },
  {
    id: 'resource-012',
    title: 'Intonation in Speaking',
    type: 'video',
    skill: 'speaking',
    description: 'A short walkthrough of how stress and intonation affect pronunciation scores.',
    tags: ['speaking', 'pronunciation', 'video'],
  },
];

/**
 * Filter resources by an optional skill and an optional free-text query.
 */
export function filterResources(skill?: string, query?: string): readonly StudyResource[] {
  return STUDY_RESOURCES.filter((entry) => {
    if (skill && entry.skill !== skill) {
      return false;
    }
    if (query) {
      const needle = query.trim().toLowerCase();
      if (needle.length === 0) {
        return true;
      }
      const haystack = [entry.title, entry.description, ...entry.tags].join(' ').toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  });
}
