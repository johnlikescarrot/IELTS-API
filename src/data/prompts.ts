/**
 * Open practice content. Every item here is originally authored for this
 * project and released under the repository's MIT licence, so the dataset can
 * be redistributed and cited without any licensing friction.
 */

/** A writing task prompt. */
export interface WritingPrompt {
  readonly id: string;
  readonly module: 'academic' | 'general';
  readonly task: 1 | 2;
  readonly topic: string;
  readonly prompt: string;
  readonly minimumWords: number;
  readonly suggestedMinutes: number;
}

/** A speaking prompt covering all three parts of the interview. */
export interface SpeakingPrompt {
  readonly id: string;
  readonly part: 1 | 2 | 3;
  readonly topic: string;
  readonly questions: readonly string[];
}

/** A reading passage with comprehension items. */
export interface ReadingPassage {
  readonly id: string;
  readonly title: string;
  readonly module: 'academic' | 'general';
  readonly wordCount: number;
  readonly text: string;
  readonly questions: readonly {
    readonly id: string;
    readonly type: 'true-false-notgiven' | 'multiple-choice' | 'short-answer';
    readonly question: string;
    readonly options?: readonly string[];
    readonly answer: string;
  }[];
}

/** Writing prompts across both modules and both tasks. */
export const WRITING_PROMPTS: readonly WritingPrompt[] = [
  {
    id: 'w-a1-001',
    module: 'academic',
    task: 1,
    topic: 'urbanisation',
    prompt:
      'A fictional coastal district counted journeys made by bicycle, ferry, bus, and private car in 2016, 2020, and 2024. Summarise the main patterns you would report from a chart containing those figures, making relevant comparisons.',
    minimumWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w-a1-002',
    module: 'academic',
    task: 1,
    topic: 'energy',
    prompt:
      'A fictional diagram shows discarded orange peel moving through collection, drying, pressing, and moulding stages to become biodegradable food containers. Summarise the process by selecting and reporting its main stages.',
    minimumWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w-a2-001',
    module: 'academic',
    task: 2,
    topic: 'education',
    prompt:
      'A town council is considering a shared tool library where residents could borrow drills, sewing machines, and gardening equipment. Discuss the benefits and drawbacks of funding this service with local taxes, then give your own view.',
    minimumWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w-a2-002',
    module: 'academic',
    task: 2,
    topic: 'environment',
    prompt:
      'Food-delivery platforms often offer very fast delivery by default. Some people think cities should require platforms to display the emissions of each delivery option. To what extent do you agree or disagree?',
    minimumWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w-g1-001',
    module: 'general',
    task: 1,
    topic: 'letters',
    prompt:
      'You recently joined a volunteer repair café that needs more visitors. Write to its coordinator. Explain why you joined, describe one difficulty new visitors may face, and suggest an event that could attract local residents.',
    minimumWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w-g2-001',
    module: 'general',
    task: 2,
    topic: 'work',
    prompt:
      'Some employers offer staff one paid day each year to learn a skill unrelated to their current job. Do the advantages of this policy outweigh its disadvantages?',
    minimumWords: 250,
    suggestedMinutes: 40,
  },
];

/** Speaking prompts for parts 1-3. */
export const SPEAKING_PROMPTS: readonly SpeakingPrompt[] = [
  {
    id: 's-p1-001',
    part: 1,
    topic: 'hometown',
    questions: [
      'Which small place near where you live would you recommend to a visitor?',
      'What makes that place useful or enjoyable?',
      'Has the way people use public spaces near you changed recently?',
      'Would you like more public spaces of that kind in the future?',
    ],
  },
  {
    id: 's-p1-002',
    part: 1,
    topic: 'technology',
    questions: [
      'Which digital tool saves you the most time in an ordinary week?',
      'What would make that tool easier for beginners to use?',
      'Do people sometimes rely on digital tools when a simpler method would be better?',
    ],
  },
  {
    id: 's-p2-001',
    part: 2,
    topic: 'a memorable journey',
    questions: [
      'Describe a journey during which you noticed an unexpected detail. You should say: where you were travelling, what you noticed, how it changed your experience, and explain why you still remember it.',
    ],
  },
  {
    id: 's-p2-002',
    part: 2,
    topic: 'a skill you learned',
    questions: [
      'Describe a practical skill you learned after making a mistake. You should say: what happened, how you learned the skill, when you first used it successfully, and explain why it remains useful.',
    ],
  },
  {
    id: 's-p3-001',
    part: 3,
    topic: 'travel and society',
    questions: [
      'How might slower travel change the way visitors understand a place?',
      'Which kinds of tourism spending are most likely to stay within a local community?',
      'How should governments balance access to popular places with residents’ daily needs?',
    ],
  },
];

/** Reading passages with answer keys. */
export const READING_PASSAGES: readonly ReadingPassage[] = [
  {
    id: 'r-a-001',
    title: 'The Quiet Return of the Urban Tram',
    module: 'academic',
    wordCount: 118,
    text: 'Trams disappeared from most Western cities during the middle of the twentieth century, displaced by buses and private cars. In the last three decades, however, planners have rediscovered them. Modern light-rail vehicles are quiet, accessible and comparatively cheap to operate once the track is laid. Cities from Bordeaux to Melbourne report that the arrival of a tram line raises the value of adjacent property and shifts a measurable share of commuters away from cars. Critics note that construction disrupts businesses for months and that the capital cost per kilometre remains high. Nonetheless, where population density is sufficient, the operating economics of trams tend to improve steadily over a thirty-year horizon.',
    questions: [
      {
        id: 'r-a-001-q1',
        type: 'true-false-notgiven',
        question:
          'Trams were removed from many Western cities because of competition from cars and buses.',
        answer: 'true',
      },
      {
        id: 'r-a-001-q2',
        type: 'true-false-notgiven',
        question: 'Tram construction is cheaper per kilometre than building a road.',
        answer: 'not given',
      },
      {
        id: 'r-a-001-q3',
        type: 'short-answer',
        question: 'Over what period do tram operating economics tend to improve?',
        answer: 'thirty years',
      },
    ],
  },
  {
    id: 'r-g-001',
    title: 'Community Library Notice',
    module: 'general',
    wordCount: 74,
    text: 'The community library is open from 9am to 7pm on weekdays and from 10am to 4pm on Saturdays. Membership is free for all residents; proof of address is required at registration. Members may borrow up to eight items for three weeks, and loans can be renewed twice online unless another member has reserved the item. Late returns incur no fine, but borrowing rights are suspended until overdue items are returned.',
    questions: [
      {
        id: 'r-g-001-q1',
        type: 'multiple-choice',
        question: 'How many items may a member borrow at one time?',
        options: ['Three', 'Six', 'Eight', 'Twelve'],
        answer: 'Eight',
      },
      {
        id: 'r-g-001-q2',
        type: 'true-false-notgiven',
        question: 'Members are charged a fee when items are returned late.',
        answer: 'false',
      },
    ],
  },
];
