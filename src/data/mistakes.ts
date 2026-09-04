import type { WritingMistake } from '../types/ielts.js';

/**
 * A set of common IELTS Writing mistakes with corrections and explanations.
 *
 * The examples demonstrate recurring errors in grammar, academic style, and
 * coherence. Entries are original and written for this API.
 */
export const WRITING_MISTAKES: readonly WritingMistake[] = [
  {
    id: 'mistake-001',
    incorrect: 'Nowadays, more and more people is using the internet.',
    correct: 'Nowadays, more and more people are using the internet.',
    explanation: 'Subject-verb agreement: the plural noun "people" requires the plural verb "are".',
    category: 'grammar',
  },
  {
    id: 'mistake-002',
    incorrect: 'There is many reasons for this trend.',
    correct: 'There are many reasons for this trend.',
    explanation:
      'The verb agrees with the noun that follows: "many reasons" is plural, so use "there are".',
    category: 'grammar',
  },
  {
    id: 'mistake-003',
    incorrect: 'In my opinion, I think that the government should act.',
    correct: 'In my opinion, the government should act.',
    explanation:
      'Redundant language: "In my opinion" and "I think" express the same idea; keep only one.',
    category: 'academic-style',
  },
  {
    id: 'mistake-004',
    incorrect: 'This essay will discuss about the causes.',
    correct: 'This essay will discuss the causes.',
    explanation: 'The verb "discuss" is transitive and does not take the preposition "about".',
    category: 'grammar',
  },
  {
    id: 'mistake-005',
    incorrect: 'People nowadays have a lot of money than before.',
    correct: 'People nowadays have more money than before.',
    explanation:
      'Comparative forms: use "more + adjective" rather than "a lot of" to compare quantities.',
    category: 'grammar',
  },
  {
    id: 'mistake-006',
    incorrect: 'Some children are addicted of video games.',
    correct: 'Some children are addicted to video games.',
    explanation: 'Preposition collocations: "addicted to" is the correct pattern.',
    category: 'grammar',
  },
  {
    id: 'mistake-007',
    incorrect: 'The government should to build more schools.',
    correct: 'The government should build more schools.',
    explanation: 'Modal verbs such as "should" are followed by the bare infinitive without "to".',
    category: 'grammar',
  },
  {
    id: 'mistake-008',
    incorrect: 'On the one hand, ... On the other hand, ...',
    correct: 'On the one hand, ... On the other hand, ... (with balanced, contrasting points)',
    explanation:
      'These cohesive devices must introduce genuinely opposing ideas; using them loosely weakens coherence.',
    category: 'coherence',
  },
  {
    id: 'mistake-009',
    incorrect: 'The main reason is because of pollution.',
    correct: 'The main reason is pollution.',
    explanation:
      'Avoid the "reason is because" construction; use "the reason is (that)" or "because".',
    category: 'grammar',
  },
  {
    id: 'mistake-010',
    incorrect: 'Actually, this is a very important issue. Actually, ...',
    correct: 'This is a very important issue. Moreover, ...',
    explanation:
      'Overusing "actually" as a filler damages cohesion; choose precise linking words instead.',
    category: 'coherence',
  },
  {
    id: 'mistake-011',
    incorrect: 'We must to solve this problem very fast.',
    correct: 'We must solve this problem very quickly.',
    explanation:
      'Use the adverb "quickly" to modify a verb, and remove the unnecessary "to" after "must".',
    category: 'academic-style',
  },
  {
    id: 'mistake-012',
    incorrect: 'In conclusion, I recommend to invest in education.',
    correct: 'In conclusion, I recommend investing in education.',
    explanation: 'The verb "recommend" takes a gerund, not a to-infinitive.',
    category: 'grammar',
  },
];

/**
 * Search writing mistakes by a free-text query against the incorrect/correct
 * text, explanation, and category.
 */
export function searchMistakes(query: string): readonly WritingMistake[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return WRITING_MISTAKES;
  }
  return WRITING_MISTAKES.filter((entry) => {
    const haystack = [entry.incorrect, entry.correct, entry.explanation, entry.category]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
