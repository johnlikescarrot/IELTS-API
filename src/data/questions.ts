/**
 * IELTS-style practice question bank.
 *
 * Original questions written in the format of the four IELTS papers:
 * - Speaking Part 1 (interview), Part 2 (long turn / cue card), Part 3 (discussion)
 * - Writing Task 1 (Academic: data description; General Training: letters)
 * - Writing Task 2 (essay)
 *
 * These are practice materials inspired by the publicly documented test
 * format. IELTS(R) is a registered trademark of its respective owners; this
 * project is not affiliated with or endorsed by them.
 */

export type Skill = 'speaking' | 'writing';

export interface SpeakingPart1Topic {
  readonly id: string;
  readonly skill: 'speaking';
  readonly part: 1;
  readonly topic: string;
  readonly questions: readonly string[];
}

export interface SpeakingPart2CueCard {
  readonly id: string;
  readonly skill: 'speaking';
  readonly part: 2;
  readonly topic: string;
  readonly task: string;
  readonly prompts: readonly string[];
  readonly preparationSeconds: 60;
  readonly speakingSeconds: 120;
}

export interface SpeakingPart3Set {
  readonly id: string;
  readonly skill: 'speaking';
  readonly part: 3;
  readonly topic: string;
  readonly questions: readonly string[];
}

export interface AcademicTask1Question {
  readonly id: string;
  readonly skill: 'writing';
  readonly part: 1;
  readonly variant: 'academic';
  readonly visualType: string;
  readonly topic: string;
  readonly prompt: string;
  readonly minWords: 150;
  readonly suggestedMinutes: 20;
}

export interface GeneralTask1Question {
  readonly id: string;
  readonly skill: 'writing';
  readonly part: 1;
  readonly variant: 'general-training';
  readonly letterTone: 'formal' | 'semi-formal' | 'informal';
  readonly topic: string;
  readonly prompt: string;
  readonly minWords: 150;
  readonly suggestedMinutes: 20;
}

export interface Task2Question {
  readonly id: string;
  readonly skill: 'writing';
  readonly part: 2;
  readonly essayType:
    'opinion' | 'discussion' | 'problem-solution' | 'advantages-disadvantages' | 'double-question';
  readonly topic: string;
  readonly prompt: string;
  readonly minWords: 250;
  readonly suggestedMinutes: 40;
}

export type Question =
  | SpeakingPart1Topic
  | SpeakingPart2CueCard
  | SpeakingPart3Set
  | AcademicTask1Question
  | GeneralTask1Question
  | Task2Question;

const SPEAKING_PART_1: readonly SpeakingPart1Topic[] = [
  {
    id: 'sp1-work-study',
    skill: 'speaking',
    part: 1,
    topic: 'Work and studies',
    questions: [
      'Do you work or are you a student?',
      'What do you find most interesting about your work or studies?',
      'Is there anything you would like to change about your work or studies?',
      'What was your first day at work or school like?'
    ]
  },
  {
    id: 'sp1-home',
    skill: 'speaking',
    part: 1,
    topic: 'Home and accommodation',
    questions: [
      'Do you live in a house or an apartment?',
      'What is your favourite room in your home?',
      'Would you like to move to a different home in the future?',
      'How is the accommodation in your hometown different from where you live now?'
    ]
  },
  {
    id: 'sp1-hometown',
    skill: 'speaking',
    part: 1,
    topic: 'Hometown',
    questions: [
      'Where is your hometown?',
      'What do people from your hometown do for entertainment?',
      'Has your hometown changed much in recent years?',
      'Would you like to live in your hometown when you are older?'
    ]
  },
  {
    id: 'sp1-weather',
    skill: 'speaking',
    part: 1,
    topic: 'Weather and seasons',
    questions: [
      'What kind of weather do you like most?',
      'Does the weather affect your mood?',
      'Do you prefer hot or cold seasons?',
      'Is the weather in your country becoming more extreme?'
    ]
  },
  {
    id: 'sp1-hobbies',
    skill: 'speaking',
    part: 1,
    topic: 'Hobbies and free time',
    questions: [
      'What do you do in your free time?',
      'Did you have any hobbies when you were a child?',
      'Do you prefer doing hobbies alone or with other people?',
      'Are there any new hobbies you would like to take up?'
    ]
  },
  {
    id: 'sp1-food',
    skill: 'speaking',
    part: 1,
    topic: 'Food and cooking',
    questions: [
      'What is your favourite meal of the day?',
      'Can you cook?',
      'Do you prefer eating at home or eating out?',
      'Have your eating habits changed since you were a child?'
    ]
  },
  {
    id: 'sp1-technology',
    skill: 'speaking',
    part: 1,
    topic: 'Technology',
    questions: [
      'How often do you use a computer or a phone?',
      'What app could you not live without?',
      'Has technology changed the way you study or work?',
      'Do you think people rely too much on electronic devices?'
    ]
  },
  {
    id: 'sp1-travel',
    skill: 'speaking',
    part: 1,
    topic: 'Travel and holidays',
    questions: [
      'Do you like travelling?',
      'What was the best trip you have ever taken?',
      'Do you prefer travelling with friends or alone?',
      'Where would you like to travel next?'
    ]
  },
  {
    id: 'sp1-sport',
    skill: 'speaking',
    part: 1,
    topic: 'Sport and exercise',
    questions: [
      'Do you do any sport or exercise regularly?',
      'What sport is popular in your country?',
      'Did you play any sports when you were at school?',
      'Would you like to watch a live sporting event?'
    ]
  },
  {
    id: 'sp1-reading',
    skill: 'speaking',
    part: 1,
    topic: 'Reading and books',
    questions: [
      'Do you enjoy reading?',
      'What kind of books do you read most often?',
      'Did you read much when you were a child?',
      'Do you prefer paper books or e-books?'
    ]
  }
];

const SPEAKING_PART_2: readonly SpeakingPart2CueCard[] = [
  {
    id: 'sp2-person-you-admire',
    skill: 'speaking',
    part: 2,
    topic: 'People',
    task: 'Describe a person you admire.',
    prompts: [
      'who this person is',
      'how you know this person',
      'what this person has achieved',
      'and explain why you admire this person'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-place-visited',
    skill: 'speaking',
    part: 2,
    topic: 'Places',
    task: 'Describe an interesting place you have visited.',
    prompts: [
      'where it is',
      'when you visited it',
      'what you did there',
      'and explain why you found it interesting'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-memorable-journey',
    skill: 'speaking',
    part: 2,
    topic: 'Travel',
    task: 'Describe a memorable journey you have taken.',
    prompts: [
      'where you were travelling to',
      'who you were travelling with',
      'what happened during the journey',
      'and explain why the journey was memorable'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-useful-skill',
    skill: 'speaking',
    part: 2,
    topic: 'Skills and learning',
    task: 'Describe a useful skill you learned outside school or work.',
    prompts: [
      'what the skill is',
      'how you learned it',
      'how long it took you to learn',
      'and explain why this skill is useful'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-book-story',
    skill: 'speaking',
    part: 2,
    topic: 'Media',
    task: 'Describe a book or a story that had a strong effect on you.',
    prompts: [
      'what it was about',
      'when you read or heard it',
      'what happens in it',
      'and explain why it affected you so strongly'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-technology-item',
    skill: 'speaking',
    part: 2,
    topic: 'Technology',
    task: 'Describe a piece of technology you find difficult to live without.',
    prompts: [
      'what it is',
      'when you started using it',
      'how often you use it',
      'and explain why you find it difficult to live without'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-good-news',
    skill: 'speaking',
    part: 2,
    topic: 'Life events',
    task: 'Describe a time when you received some good news.',
    prompts: [
      'what the news was',
      'how you received it',
      'who was involved',
      'and explain why the news was so good'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-helping-someone',
    skill: 'speaking',
    part: 2,
    topic: 'Life events',
    task: 'Describe a time when you helped someone.',
    prompts: [
      'who you helped',
      'why they needed help',
      'how you helped them',
      'and explain how you felt after helping them'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-environment-problem',
    skill: 'speaking',
    part: 2,
    topic: 'Environment',
    task: 'Describe an environmental problem in your country.',
    prompts: [
      'what the problem is',
      'what causes it',
      'how it affects people or nature',
      'and explain what could be done to solve it'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-favorite-meal',
    skill: 'speaking',
    part: 2,
    topic: 'Food',
    task: 'Describe a meal you really enjoyed.',
    prompts: [
      'what the meal was',
      'where you ate it',
      'who you were with',
      'and explain why you enjoyed it so much'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-future-plan',
    skill: 'speaking',
    part: 2,
    topic: 'Plans and ambitions',
    task: 'Describe a plan you have for the future.',
    prompts: [
      'what the plan is',
      'when you intend to carry it out',
      'what you need to do to achieve it',
      'and explain why this plan is important to you'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  },
  {
    id: 'sp2-tradition',
    skill: 'speaking',
    part: 2,
    topic: 'Culture',
    task: 'Describe a tradition or custom from your country.',
    prompts: [
      'what the tradition is',
      'when people follow it',
      'what people usually do',
      'and explain why it is important in your culture'
    ],
    preparationSeconds: 60,
    speakingSeconds: 120
  }
];

const SPEAKING_PART_3: readonly SpeakingPart3Set[] = [
  {
    id: 'sp3-education-society',
    skill: 'speaking',
    part: 3,
    topic: 'Education in society',
    questions: [
      'Should university education be free for everyone?',
      'How has education changed in your country over the last few decades?',
      'Do you think online learning will replace traditional classrooms?',
      'What skills do schools fail to teach that adults actually need?'
    ]
  },
  {
    id: 'sp3-work-life',
    skill: 'speaking',
    part: 3,
    topic: 'Work and careers',
    questions: [
      'Why do some people change jobs so frequently nowadays?',
      'Is it better to work for a large company or a small one?',
      'How might artificial intelligence change the jobs people do?',
      'Should the retirement age be raised?'
    ]
  },
  {
    id: 'sp3-technology-society',
    skill: 'speaking',
    part: 3,
    topic: 'Technology and society',
    questions: [
      'Do you think social media has made people more or less connected?',
      'Should there be stricter laws about how companies use personal data?',
      'How can older people be encouraged to use new technology?',
      'Will technology eventually solve the problems it creates?'
    ]
  },
  {
    id: 'sp3-environment-policy',
    skill: 'speaking',
    part: 3,
    topic: 'Environment and policy',
    questions: [
      'Who is mainly responsible for protecting the environment: governments, companies, or individuals?',
      'Are green taxes an effective way to change behaviour?',
      'How can cities become more environmentally friendly?',
      'Is economic growth compatible with protecting the planet?'
    ]
  },
  {
    id: 'sp3-health',
    skill: 'speaking',
    part: 3,
    topic: 'Health and lifestyles',
    questions: [
      'Why do so many people find it hard to exercise regularly?',
      'Should governments spend more on preventing illness rather than treating it?',
      'How has people’s diet changed in your country in recent years?',
      'Do you think mental health is taken seriously enough in the workplace?'
    ]
  },
  {
    id: 'sp3-cities',
    skill: 'speaking',
    part: 3,
    topic: 'Cities and urban life',
    questions: [
      'What are the biggest problems facing large cities today?',
      'Should governments encourage people to move out of big cities?',
      'How can public transport be improved?',
      'Do you think cities will look very different in fifty years?'
    ]
  },
  {
    id: 'sp3-media-truth',
    skill: 'speaking',
    part: 3,
    topic: 'News and media',
    questions: [
      'Where do most people get their news nowadays, and why has this changed?',
      'How can readers tell whether a news story is trustworthy?',
      'Should governments be able to restrict what the media publish?',
      'Will traditional newspapers disappear completely?'
    ]
  },
  {
    id: 'sp3-culture-global',
    skill: 'speaking',
    part: 3,
    topic: 'Culture and globalisation',
    questions: [
      'Does globalisation make national cultures stronger or weaker?',
      'Why do young people around the world share similar tastes in music and fashion?',
      'Should countries protect their traditional industries and arts?',
      'What are the advantages of living in a multicultural society?'
    ]
  },
  {
    id: 'sp3-crime-law',
    skill: 'speaking',
    part: 3,
    topic: 'Crime and punishment',
    questions: [
      'What are the main causes of crime in modern societies?',
      'Is prison the most effective punishment for serious crimes?',
      'Should young offenders be treated differently from adults?',
      'How can communities help to reduce crime?'
    ]
  },
  {
    id: 'sp3-money-happiness',
    skill: 'speaking',
    part: 3,
    topic: 'Money and happiness',
    questions: [
      'Can money buy happiness?',
      'Why do some wealthy people continue working instead of retiring?',
      'Is it better to save money or to spend it on experiences?',
      'How important is financial education in schools?'
    ]
  }
];

type AcademicTask1Raw = Omit<AcademicTask1Question, 'minWords' | 'suggestedMinutes'>;
type GeneralTask1Raw = Omit<GeneralTask1Question, 'minWords' | 'suggestedMinutes'>;
type Task2Raw = Omit<Task2Question, 'minWords' | 'suggestedMinutes'>;

const TASK_1_MIN_WORDS = 150;
const TASK_1_SUGGESTED_MINUTES = 20;
const TASK_2_MIN_WORDS = 250;
const TASK_2_SUGGESTED_MINUTES = 40;

const WRITING_TASK_1_ACADEMIC: readonly AcademicTask1Question[] = (
  [
    {
      id: 'wa1-population-growth',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'line graph',
      topic: 'Population',
      prompt:
        'The line graph shows the population (in millions) of four countries — Australia, Brazil, India and Kenya — between 1950 and 2020, with projections to 2050. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-energy-mix',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'pie charts',
      topic: 'Energy',
      prompt:
        'The two pie charts compare the sources of electricity generation in one European country in 2005 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-household-spending',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'table',
      topic: 'Household spending',
      prompt:
        'The table shows the average weekly household spending (in dollars) on five categories — food, housing, transport, leisure and clothing — in 1995, 2005 and 2015. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-transport-modes',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'bar chart',
      topic: 'Transport',
      prompt:
        'The bar chart shows the percentage of commuters who travelled to work by car, public transport, bicycle and on foot in one city in 1990, 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-tourist-numbers',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'line graph',
      topic: 'Tourism',
      prompt:
        'The graph below shows the number of international visitors (in thousands) to three coastal towns between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-education-enrolment',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'bar chart and table',
      topic: 'Education',
      prompt:
        'The chart shows university enrolment (in thousands) in six subjects in 2010 and 2025, and the table shows the proportion of female students in each subject. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-recycling-process',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'process diagram',
      topic: 'Recycling',
      prompt:
        'The diagram illustrates how glass bottles are recycled, from collection to being sold again as new containers. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    },
    {
      id: 'wa1-library-floorplan',
      skill: 'writing',
      part: 1,
      variant: 'academic',
      visualType: 'maps',
      topic: 'Public buildings',
      prompt:
        'The maps show changes made to a public library between 1990 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
    }
  ] as readonly AcademicTask1Raw[]
).map((question) => ({
  ...question,
  minWords: TASK_1_MIN_WORDS,
  suggestedMinutes: TASK_1_SUGGESTED_MINUTES
}));

const WRITING_TASK_1_GENERAL: readonly GeneralTask1Question[] = (
  [
    {
      id: 'wg1-job-application',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'formal',
      topic: 'Work',
      prompt:
        'You have seen an advertisement for a part-time job at a local museum. Write a letter applying for the position. In your letter: explain why you are interested in the job, describe your relevant experience, and say when you would be available for an interview.'
    },
    {
      id: 'wg1-complaint-appliance',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'formal',
      topic: 'Consumer issues',
      prompt:
        'You recently bought a kitchen appliance online, but it arrived damaged and stopped working after two days. Write a letter to the company. In your letter: describe the problem, explain how the situation has affected you, and state what action you would like the company to take.'
    },
    {
      id: 'wg1-course-absence',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'formal',
      topic: 'Education',
      prompt:
        'You need to take two weeks off from an evening course you are attending. Write a letter to the course coordinator. In your letter: explain why you need the time off, describe how you plan to keep up with the work, and ask about any deadlines you should be aware of.'
    },
    {
      id: 'wg1-neighbor-noise',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'semi-formal',
      topic: 'Neighbours',
      prompt:
        'Your neighbour plays loud music late at night, which is affecting your sleep. Write a letter to your neighbour. In your letter: describe the situation, explain how it is affecting you, and suggest a possible solution.'
    },
    {
      id: 'wg1-friend-visit',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'informal',
      topic: 'Friends',
      prompt:
        'A friend from another country is coming to visit you next month and has asked for advice about what to pack. Write a letter to your friend. In your letter: describe the weather at that time of year, suggest the clothes and items they should bring, and mention any events you have planned for their visit.'
    },
    {
      id: 'wg1-thanks-teacher',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'semi-formal',
      topic: 'Gratitude',
      prompt:
        'A former teacher helped you apply to university and you have just been accepted. Write a letter to the teacher. In your letter: tell them the good news, thank them for their help, and invite them to visit you at the university.'
    },
    {
      id: 'wg1-lost-item',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'formal',
      topic: 'Lost property',
      prompt:
        'You left an important document on a train last week. Write a letter to the railway company’s lost property office. In your letter: describe the document and where you think you left it, explain why the document is important to you, and say what you would like the company to do.'
    },
    {
      id: 'wg1-party-invitation',
      skill: 'writing',
      part: 1,
      variant: 'general-training',
      letterTone: 'informal',
      topic: 'Social life',
      prompt:
        'You are organising a surprise party for a mutual friend and want to invite another friend to help. Write a letter to this friend. In your letter: explain why you are organising the party, describe your plans for the evening, and ask them to help with one particular task.'
    }
  ] as readonly GeneralTask1Raw[]
).map((question) => ({
  ...question,
  minWords: TASK_1_MIN_WORDS,
  suggestedMinutes: TASK_1_SUGGESTED_MINUTES
}));

const WRITING_TASK_2: readonly Task2Question[] = (
  [
    {
      id: 'wt2-university-free',
      skill: 'writing',
      part: 2,
      essayType: 'opinion',
      topic: 'Education',
      prompt:
        'Some people believe university education should be free for all students, while others think students should pay for their own studies. To what extent do you agree or disagree?'
    },
    {
      id: 'wt2-remote-work',
      skill: 'writing',
      part: 2,
      essayType: 'advantages-disadvantages',
      topic: 'Work',
      prompt:
        'Working from home has become common since the COVID-19 pandemic. Do the advantages of remote work outweigh the disadvantages?'
    },
    {
      id: 'wt2-plastic-ban',
      skill: 'writing',
      part: 2,
      essayType: 'opinion',
      topic: 'Environment',
      prompt:
        'Some countries have banned single-use plastics completely. Others believe recycling is a better solution. Discuss both views and give your own opinion.'
    },
    {
      id: 'wt2-child-obesity',
      skill: 'writing',
      part: 2,
      essayType: 'problem-solution',
      topic: 'Health',
      prompt:
        'Childhood obesity is increasing in many countries. What problems does this cause, and what measures can schools and parents take to address it?'
    },
    {
      id: 'wt2-social-media-youth',
      skill: 'writing',
      part: 2,
      essayType: 'double-question',
      topic: 'Technology',
      prompt:
        'Young people spend more time on social media than any previous generation. Why is this the case, and is this development positive or negative overall?'
    },
    {
      id: 'wt2-language-loss',
      skill: 'writing',
      part: 2,
      essayType: 'discussion',
      topic: 'Language',
      prompt:
        'Some people argue that the spread of English as a global language threatens smaller languages. Others believe a common language brings more benefits than harm. Discuss both views and give your own opinion.'
    },
    {
      id: 'wt2-public-transport',
      skill: 'writing',
      part: 2,
      essayType: 'opinion',
      topic: 'Cities',
      prompt:
        'To reduce traffic congestion, some governments provide free public transport for everyone. To what extent do you agree or disagree with this approach?'
    },
    {
      id: 'wt2-ai-jobs',
      skill: 'writing',
      part: 2,
      essayType: 'double-question',
      topic: 'Technology',
      prompt:
        'Artificial intelligence is expected to replace many jobs in the next few decades. Which types of jobs are most at risk, and how should societies prepare for this change?'
    },
    {
      id: 'wt2-prison-vs-education',
      skill: 'writing',
      part: 2,
      essayType: 'discussion',
      topic: 'Crime',
      prompt:
        'Some people think the best way to reduce crime is to give longer prison sentences. Others believe education and rehabilitation are more effective. Discuss both views and give your own opinion.'
    },
    {
      id: 'wt2-tourism-impact',
      skill: 'writing',
      part: 2,
      essayType: 'advantages-disadvantages',
      topic: 'Tourism',
      prompt:
        'International tourism has grown rapidly in the last fifty years. What are the advantages and disadvantages of this development for the countries people visit?'
    },
    {
      id: 'wt2-homework-debate',
      skill: 'writing',
      part: 2,
      essayType: 'opinion',
      topic: 'Education',
      prompt:
        'Some schools have abolished homework, arguing that children should spend their evenings on other activities. To what extent do you agree or disagree?'
    },
    {
      id: 'wt2-gender-roles',
      skill: 'writing',
      part: 2,
      essayType: 'discussion',
      topic: 'Society',
      prompt:
        'In many countries, men and women now share household and childcare duties more equally than in the past. Some people welcome this change, while others think traditional roles are better. Discuss both views and give your own opinion.'
    },
    {
      id: 'wt2-online-shopping',
      skill: 'writing',
      part: 2,
      essayType: 'problem-solution',
      topic: 'Consumerism',
      prompt:
        'The growth of online shopping is causing many small local shops to close. What problems does this trend cause, and what can be done to support local businesses?'
    },
    {
      id: 'wt2-space-money',
      skill: 'writing',
      part: 2,
      essayType: 'opinion',
      topic: 'Science',
      prompt:
        'Some people believe governments should spend less on space exploration and more on solving problems on Earth. To what extent do you agree or disagree?'
    },
    {
      id: 'wt2-elderly-care',
      skill: 'writing',
      part: 2,
      essayType: 'double-question',
      topic: 'Ageing',
      prompt:
        'Populations in many countries are ageing rapidly. What challenges will this create for governments and families, and how can these challenges be managed?'
    },
    {
      id: 'wt2-volunteer-work',
      skill: 'writing',
      part: 2,
      essayType: 'advantages-disadvantages',
      topic: 'Community',
      prompt:
        'Some school systems require teenagers to do unpaid community work as part of their studies. Do the advantages of compulsory volunteering outweigh the disadvantages?'
    }
  ] as readonly Task2Raw[]
).map((question) => ({
  ...question,
  minWords: TASK_2_MIN_WORDS,
  suggestedMinutes: TASK_2_SUGGESTED_MINUTES
}));

export const QUESTIONS: readonly Question[] = [
  ...SPEAKING_PART_1,
  ...SPEAKING_PART_2,
  ...SPEAKING_PART_3,
  ...WRITING_TASK_1_ACADEMIC,
  ...WRITING_TASK_1_GENERAL,
  ...WRITING_TASK_2
];
