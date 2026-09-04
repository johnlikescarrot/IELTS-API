/**
 * Common mistakes made by IELTS candidates in Writing and Speaking,
 * with corrections, the reason the version is wrong, and which assessed
 * criterion the error typically damages. Original study content.
 */

export type MistakeCategory =
  | 'articles'
  | 'prepositions'
  | 'subject-verb-agreement'
  | 'word-choice'
  | 'countable-uncountable'
  | 'punctuation'
  | 'register'
  | 'cohesion';

export type CriterionImpact =
  | 'Grammatical Range and Accuracy'
  | 'Lexical Resource'
  | 'Coherence and Cohesion'
  | 'Task Response'
  | 'Task Achievement';

export interface Mistake {
  readonly id: string;
  readonly category: MistakeCategory;
  readonly wrong: string;
  readonly correct: string;
  readonly explanation: string;
  readonly impacts: readonly CriterionImpact[];
}

export const MISTAKES: readonly Mistake[] = [
  {
    id: 'mist-001',
    category: 'articles',
    wrong: 'The government should invest in the education of children.',
    correct: 'Governments should invest in the education of children.',
    explanation:
      'Use the uncountable plural or zero article for abstract generalisations: "education" as a concept takes no article, and "the government" refers to one specific government.',
    impacts: ['Grammatical Range and Accuracy']
  },
  {
    id: 'mist-002',
    category: 'subject-verb-agreement',
    wrong: 'The number of students have increased significantly.',
    correct: 'The number of students has increased significantly.',
    explanation:
      'The subject is "the number", which is singular. Compare with "a number of students have...", which is plural.',
    impacts: ['Grammatical Range and Accuracy']
  },
  {
    id: 'mist-003',
    category: 'countable-uncountable',
    wrong: 'The government provided many informations about the new policy.',
    correct: 'The government provided a lot of information about the new policy.',
    explanation:
      '"Information" is uncountable in English: it has no plural form and cannot follow "many". Use "a lot of", "much" or "some" instead.',
    impacts: ['Lexical Resource', 'Grammatical Range and Accuracy']
  },
  {
    id: 'mist-004',
    category: 'prepositions',
    wrong: 'In the other hand, remote work can isolate employees.',
    correct: 'On the other hand, remote work can isolate employees.',
    explanation:
      'The fixed phrase is "on the other hand". Prepositions in fixed phrases must be memorised as chunks.',
    impacts: ['Lexical Resource', 'Coherence and Cohesion']
  },
  {
    id: 'mist-005',
    category: 'word-choice',
    wrong: 'Nowadays, most of people work longer hours than in the past.',
    correct: 'Nowadays, most people work longer hours than in the past.',
    explanation:
      '"Most people" means people in general. "Most of the people" is only used when referring to a specific, limited group.',
    impacts: ['Grammatical Range and Accuracy', 'Lexical Resource']
  },
  {
    id: 'mist-006',
    category: 'word-choice',
    wrong: 'The chart shows the number of visitors rose up steadily.',
    correct: 'The chart shows the number of visitors rose steadily.',
    explanation:
      '"Rose" already contains the idea of upward movement; "up" is redundant. Avoid tautology such as "rise up", "increase up", or "return back".',
    impacts: ['Lexical Resource', 'Task Achievement']
  },
  {
    id: 'mist-007',
    category: 'punctuation',
    wrong: 'Although technology saves time, but it also creates stress.',
    correct: 'Although technology saves time, it also creates stress.',
    explanation:
      'A subordinate clause introduced by "although" cannot be joined to "but" in the same sentence; use one linker only.',
    impacts: ['Grammatical Range and Accuracy', 'Coherence and Cohesion']
  },
  {
    id: 'mist-008',
    category: 'cohesion',
    wrong: 'Firstly, ... Secondly, ... Thirdly, ... Fourthly, ...',
    correct: 'First, ... Second, ... In addition, ... Finally, ...',
    explanation:
      '"Firstly/secondly/thirdly" chains sound mechanical and dated. Prefer "First", "Second", "Furthermore", "Finally" and vary your sequencing language.',
    impacts: ['Coherence and Cohesion', 'Lexical Resource']
  },
  {
    id: 'mist-009',
    category: 'register',
    wrong: 'A lot of kids these days are addicted to their phones.',
    correct: 'Many young people nowadays are excessively dependent on their smartphones.',
    explanation:
      'IELTS Academic writing rewards formal register: avoid colloquial words like "kids", "a lot of" and "these days" in Task 2 essays.',
    impacts: ['Lexical Resource', 'Task Response']
  },
  {
    id: 'mist-010',
    category: 'subject-verb-agreement',
    wrong: 'Everyone in the class have their own laptop.',
    correct: 'Everyone in the class has their own laptop.',
    explanation:
      'Indefinite pronouns such as "everyone", "each" and "nobody" take a singular verb, even though they refer to many people.',
    impacts: ['Grammatical Range and Accuracy']
  },
  {
    id: 'mist-011',
    category: 'countable-uncountable',
    wrong: 'We should give students more advices about their careers.',
    correct: 'We should give students more advice about their careers.',
    explanation:
      '"Advice" is uncountable. Use "pieces of advice" or "guidance" if you need a countable structure.',
    impacts: ['Lexical Resource', 'Grammatical Range and Accuracy']
  },
  {
    id: 'mist-012',
    category: 'articles',
    wrong: 'The pollution is a serious problem in the most of cities.',
    correct: 'Pollution is a serious problem in most cities.',
    explanation:
      'Uncountable nouns used in a general sense ("pollution") take no article, and "most" is used without "of" before a bare plural noun.',
    impacts: ['Grammatical Range and Accuracy']
  },
  {
    id: 'mist-013',
    category: 'word-choice',
    wrong: 'Studying abroad can widen your horizon and get many benefits.',
    correct: 'Studying abroad can broaden your horizons and bring many benefits.',
    explanation:
      'The idiom is "broaden your horizons", and subjects "broaden" ideas while they "bring" or "offer" benefits. Learn collocations as whole units.',
    impacts: ['Lexical Resource']
  },
  {
    id: 'mist-014',
    category: 'prepositions',
    wrong: 'The graph illustrates the changes of consumer spending.',
    correct: 'The graph illustrates the changes in consumer spending.',
    explanation:
      'Use "changes in" + noun when describing data. "Change of" refers to an act of changing something into something else.',
    impacts: ['Lexical Resource', 'Task Achievement']
  },
  {
    id: 'mist-015',
    category: 'punctuation',
    wrong: 'Cities are crowded, noisy and polluted, however many people still prefer them.',
    correct: 'Cities are crowded, noisy and polluted; however, many people still prefer them.',
    explanation:
      '"However" is not a coordinating conjunction: it cannot join two independent clauses after a comma. Use a semicolon, or start a new sentence.',
    impacts: ['Grammatical Range and Accuracy', 'Coherence and Cohesion']
  },
  {
    id: 'mist-016',
    category: 'word-choice',
    wrong: 'The percentage of people who smoke are decreasing.',
    correct: 'The percentage of people who smoke is decreasing.',
    explanation:
      '"The percentage" is the singular subject; "of people who smoke" is a modifying phrase. Watch for agreement with the true head noun in data description.',
    impacts: ['Grammatical Range and Accuracy', 'Task Achievement']
  },
  {
    id: 'mist-017',
    category: 'cohesion',
    wrong: 'This essay will discuss about the causes and effects of unemployment.',
    correct: 'This essay will discuss the causes and effects of unemployment.',
    explanation:
      '"Discuss" is transitive: it takes a direct object without "about". Similar traps: "consider", "emphasise", "investigate".',
    impacts: ['Lexical Resource', 'Coherence and Cohesion']
  },
  {
    id: 'mist-018',
    category: 'register',
    wrong: 'I reckon that the government should totally ban cars from city centres.',
    correct: 'It could be argued that governments should prohibit private cars from city centres.',
    explanation:
      'Academic writing prefers impersonal or measured language to personal, emphatic expressions like "I reckon" and "totally".',
    impacts: ['Lexical Resource', 'Task Response']
  },
  {
    id: 'mist-019',
    category: 'subject-verb-agreement',
    wrong: 'One of the main reasons are the lack of affordable housing.',
    correct: 'One of the main reasons is the lack of affordable housing.',
    explanation:
      'The subject is "one", so the verb is singular. The plural noun inside "of the main reasons" does not control agreement.',
    impacts: ['Grammatical Range and Accuracy']
  },
  {
    id: 'mist-020',
    category: 'countable-uncountable',
    wrong: 'There were less accidents on the roads after the new law.',
    correct: 'There were fewer accidents on the roads after the new law.',
    explanation:
      'Use "fewer" with countable nouns (accidents) and "less" with uncountable nouns (traffic).',
    impacts: ['Grammatical Range and Accuracy']
  }
];
