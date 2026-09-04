import type { SpeakingTopic, Tip } from '../types.js';

export const speakingPart1: SpeakingTopic[] = [
  {
    id: 'sp1-01',
    part: 1,
    topic: 'Hometown',
    questions: [
      'Where is your hometown?',
      'What do you like most about it?',
      'Has it changed much in recent years?',
      'Would you like to live there in the future?',
    ],
    samplePoints: [
      'location and size',
      'a favourite place or memory',
      'one recent change',
      'future wish with a reason',
    ],
  },
  {
    id: 'sp1-02',
    part: 1,
    topic: 'Work and studies',
    questions: [
      'Do you work or study?',
      'What do you enjoy about it?',
      'What is the most difficult part?',
      'What are your plans for the next year?',
    ],
    samplePoints: [
      'current role',
      'one enjoyable aspect',
      'one challenge',
      'a realistic next step',
    ],
  },
  {
    id: 'sp1-03',
    part: 1,
    topic: 'Music',
    questions: [
      'What kind of music do you like?',
      'How often do you listen to music?',
      'Have your tastes changed over time?',
      'Do you play a musical instrument?',
    ],
    samplePoints: [
      'a genre with an example',
      'when and where you listen',
      'old vs current taste',
      'instrument or wish to learn',
    ],
  },
  {
    id: 'sp1-04',
    part: 1,
    topic: 'Food and cooking',
    questions: [
      'What is your favourite meal?',
      'Do you enjoy cooking?',
      'Where do people in your country usually eat?',
      'Has your diet changed recently?',
    ],
    samplePoints: [
      'a dish and why',
      'cooking ability',
      'home vs restaurant habits',
      'a recent healthy change',
    ],
  },
  {
    id: 'sp1-05',
    part: 1,
    topic: 'Travel',
    questions: [
      'Do you like travelling?',
      'What was your last trip?',
      'Do you prefer cities or countryside?',
      'Where would you like to go next?',
    ],
    samplePoints: [
      'general attitude',
      'one memorable trip',
      'a clear preference with reason',
      'a dream destination',
    ],
  },
  {
    id: 'sp1-06',
    part: 1,
    topic: 'Technology',
    questions: [
      'How much time do you spend online each day?',
      'What do you mainly use the internet for?',
      'Has technology changed how you study or work?',
      'Could you live without a smartphone?',
    ],
    samplePoints: [
      'daily screen time',
      'main uses',
      'one big change',
      'honest answer with reason',
    ],
  },
];

export const speakingPart2: SpeakingTopic[] = [
  {
    id: 'sp2-01',
    part: 2,
    topic: 'Describe a skill you would like to learn',
    questions: [
      'You should say: what the skill is, why you want to learn it, how you would learn it, and how it would help you.',
    ],
    samplePoints: [
      'name the skill',
      'motivation (work, hobby, family)',
      'learning steps',
      'future benefit',
    ],
  },
  {
    id: 'sp2-02',
    part: 2,
    topic: 'Describe a memorable journey',
    questions: [
      'You should say: where you went, who you travelled with, what you did, and why it was memorable.',
    ],
    samplePoints: ['destination', 'companions', 'two highlights', 'lasting impression'],
  },
  {
    id: 'sp2-03',
    part: 2,
    topic: 'Describe a person who taught you something important',
    questions: [
      'You should say: who the person is, how you know them, what they taught you, and why it mattered.',
    ],
    samplePoints: ['relationship', 'context', 'the lesson', 'impact on you'],
  },
  {
    id: 'sp2-04',
    part: 2,
    topic: 'Describe a place in your country you recommend to visitors',
    questions: [
      'You should say: where it is, what it looks like, what visitors can do there, and why you recommend it.',
    ],
    samplePoints: ['location', 'appearance', 'activities', 'recommendation reason'],
  },
  {
    id: 'sp2-05',
    part: 2,
    topic: 'Describe a time you helped someone',
    questions: [
      'You should say: who you helped, why they needed help, what you did, and how you felt afterwards.',
    ],
    samplePoints: ['the person', 'the situation', 'your actions', 'your feelings'],
  },
  {
    id: 'sp2-06',
    part: 2,
    topic: 'Describe a book or film that influenced you',
    questions: [
      'You should say: what it was, when you read or saw it, what it was about, and how it influenced you.',
    ],
    samplePoints: ['title', 'when', 'brief summary', 'personal influence'],
  },
];

export const speakingPart3: SpeakingTopic[] = [
  {
    id: 'sp3-01',
    part: 3,
    topic: 'Education',
    questions: [
      'How has education changed in your country?',
      'Should university be free for everyone?',
      'What skills will children need in the future?',
    ],
    samplePoints: ['past vs present', 'fairness vs cost', 'digital and social skills'],
  },
  {
    id: 'sp3-02',
    part: 3,
    topic: 'Environment',
    questions: [
      'Who is mainly responsible for protecting the environment?',
      'Can individuals make a real difference?',
      'Should governments tax polluting products?',
    ],
    samplePoints: [
      'shared responsibility',
      'small actions add up',
      'pros and cons of green taxes',
    ],
  },
  {
    id: 'sp3-03',
    part: 3,
    topic: 'Technology and society',
    questions: [
      'Has social media improved communication?',
      'What are the risks of artificial intelligence?',
      'Will robots replace many jobs?',
    ],
    samplePoints: ['connection vs isolation', 'bias, jobs, safety', 'which jobs and why'],
  },
  {
    id: 'sp3-04',
    part: 3,
    topic: 'Cities and transport',
    questions: [
      'Why do so many people move to big cities?',
      'How can traffic problems be solved?',
      'Is public transport better than cars?',
    ],
    samplePoints: [
      'jobs and services',
      'pricing and investment',
      'compare cost, comfort, environment',
    ],
  },
  {
    id: 'sp3-05',
    part: 3,
    topic: 'Work and careers',
    questions: [
      'Is job-hopping good for young people?',
      'What makes a good manager?',
      'Will working from home continue to grow?',
    ],
    samplePoints: [
      'variety vs stability',
      'communication and fairness',
      'technology and balance',
    ],
  },
  {
    id: 'sp3-06',
    part: 3,
    topic: 'Culture and tourism',
    questions: [
      'Why is it important to protect traditions?',
      'Does tourism damage local culture?',
      'How can countries attract visitors responsibly?',
    ],
    samplePoints: [
      'identity and community',
      'benefits vs harm',
      'limits and local benefit',
    ],
  },
];

export const speakingTips: Tip[] = [
  {
    id: 'st-01',
    title: 'Extend every answer',
    detail:
      'Give a direct answer plus one reason or example. One-sentence replies limit your fluency score.',
  },
  {
    id: 'st-02',
    title: 'Use the one-minute preparation well',
    detail:
      'In Part 2, note four keywords — one per bullet — and a past-tense verb list to stay fluent.',
  },
  {
    id: 'st-03',
    title: 'Speak in full past tenses for stories',
    detail:
      'Part 2 stories need past simple, past continuous and present perfect used accurately.',
  },
  {
    id: 'st-04',
    title: 'Paraphrase the question',
    detail:
      'Restating the question with synonyms demonstrates range and buys thinking time.',
  },
  {
    id: 'st-05',
    title: 'Handle Part 3 abstractly',
    detail:
      'Generalise with “tend to”, “in general”, conditionals and concession clauses, then illustrate briefly.',
  },
  {
    id: 'st-06',
    title: 'Ask for clarification naturally',
    detail:
      '“Sorry, do you mean…?” is acceptable once or twice and far better than silence.',
  },
  {
    id: 'st-07',
    title: 'Mind fluency over fancy words',
    detail:
      'A natural pace with self-correction beats memorised idioms delivered mechanically.',
  },
  {
    id: 'st-08',
    title: 'Record and time yourself',
    detail:
      'Practise Part 2 for a full two minutes; most candidates under-run and lose the chance to show range.',
  },
];
