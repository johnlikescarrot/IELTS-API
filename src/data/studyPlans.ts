import type { StudyPlan } from '../types.js';

export const studyPlans: StudyPlan[] = [
  {
    id: 'plan-4-week',
    title: '4-week IELTS sprint (band 6 to 6.5)',
    weeks: 4,
    hoursPerWeek: 10,
    level: 'Intermediate (B1–B2)',
    schedule: [
      {
        week: 1,
        focus: 'Foundations and diagnosis',
        tasks: [
          'Take a full timed mock and log weak question types',
          'Learn 60 vocabulary items (environment, education, health)',
          'Write 2 × Task 2 essays with plans',
        ],
      },
      {
        week: 2,
        focus: 'Reading and listening systems',
        tasks: [
          'Practise True/False/Not Given and headings daily',
          'Do 2 × listening Section 1–2 drills with spelling checks',
          'Record 3 × Part 2 answers (2 minutes each)',
        ],
      },
      {
        week: 3,
        focus: 'Writing accuracy',
        tasks: [
          'Rewrite week-1 essays fixing articles and agreement',
          'Write 2 × Task 1 reports with overviews',
          'Study 12 common mistakes from this API',
        ],
      },
      {
        week: 4,
        focus: 'Test simulation',
        tasks: [
          'Two full mocks under timed conditions',
          'Review every error in an error log',
          'Light revision and rest the day before the test',
        ],
      },
    ],
  },
  {
    id: 'plan-8-week',
    title: '8-week IELTS builder (band 5.5 to 6.5)',
    weeks: 8,
    hoursPerWeek: 7,
    level: 'Pre-intermediate to intermediate (A2–B2)',
    schedule: [
      {
        week: 1,
        focus: 'Diagnosis and grammar reset',
        tasks: ['Full mock test', 'Review articles, tenses and sentence structure'],
      },
      {
        week: 2,
        focus: 'Vocabulary core',
        tasks: ['Learn 80 items across 4 topics', 'Daily 15-minute collocation review'],
      },
      {
        week: 3,
        focus: 'Reading foundations',
        tasks: ['Skimming/scanning drills', 'Two mini reading sets'],
      },
      {
        week: 4,
        focus: 'Listening foundations',
        tasks: ['Number/spelling drills', 'Section 1–2 practice sets'],
      },
      {
        week: 5,
        focus: 'Writing Task 2 structure',
        tasks: ['Four full essays with feedback loops'],
      },
      {
        week: 6,
        focus: 'Writing Task 1 + speaking fluency',
        tasks: ['Three Task 1 reports', 'Six Part 1–2 recordings'],
      },
      {
        week: 7,
        focus: 'Mixed practice',
        tasks: ['One full mock', 'Targeted redo of weakest section'],
      },
      {
        week: 8,
        focus: 'Exam week',
        tasks: ['Final mock on day 1', 'Error-log review and rest'],
      },
    ],
  },
  {
    id: 'plan-12-week',
    title: '12-week IELTS mastery (band 6.5 to 7.5)',
    weeks: 12,
    hoursPerWeek: 6,
    level: 'Upper-intermediate to advanced (B2–C1)',
    schedule: [
      { week: 1, focus: 'Benchmark', tasks: ['Full mock and detailed error analysis'] },
      {
        week: 2,
        focus: 'Academic vocabulary depth',
        tasks: ['120 C1 items with collocations', 'Paraphrase drills'],
      },
      {
        week: 3,
        focus: 'Reading speed',
        tasks: ['Timed heading-matching sets', '19-minute per-passage pacing'],
      },
      {
        week: 4,
        focus: 'Listening precision',
        tasks: ['Section 3–4 drills', 'Distractor training'],
      },
      {
        week: 5,
        focus: 'Task 2 argumentation',
        tasks: ['Concession paragraphs', 'Three band-7+ essays'],
      },
      {
        week: 6,
        focus: 'Task 1 variety',
        tasks: ['Maps and processes', 'Mixed-chart comparisons'],
      },
      {
        week: 7,
        focus: 'Speaking coherence',
        tasks: ['Part 3 abstract practice', 'Discourse markers review'],
      },
      {
        week: 8,
        focus: 'Grammar polish',
        tasks: ['Complex sentences', 'Article/quantifier accuracy'],
      },
      { week: 9, focus: 'Mock and review', tasks: ['Full mock', 'Rewrite weak essays'] },
      {
        week: 10,
        focus: 'Stamina block',
        tasks: ['Back-to-back reading + writing days'],
      },
      { week: 11, focus: 'Final gaps', tasks: ['Top-20 personal error list cleared'] },
      { week: 12, focus: 'Taper', tasks: ['One gentle mock', 'Sleep and logistics'] },
    ],
  },
];
