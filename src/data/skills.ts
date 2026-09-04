import type { PracticeSet, QuestionType, Tip } from '../types.js';

export const readingQuestionTypes: QuestionType[] = [
  {
    id: 'rq-01',
    name: 'Multiple choice',
    description:
      'Choose one correct answer (or more) from four options about the passage.',
    strategy:
      'Read the question stem first, predict the answer, then eliminate distractors with line references.',
  },
  {
    id: 'rq-02',
    name: 'True / False / Not Given',
    description: 'Decide whether statements agree with the writer’s claims.',
    strategy:
      'Match every keyword of the statement. If any part is missing from the text, choose Not Given.',
  },
  {
    id: 'rq-03',
    name: 'Yes / No / Not Given',
    description: 'Decide whether statements agree with the writer’s opinions.',
    strategy:
      'Distinguish facts from opinions; look for attitude words like “essential”, “harmful”.',
  },
  {
    id: 'rq-04',
    name: 'Matching headings',
    description: 'Choose the heading that best captures each paragraph’s main idea.',
    strategy:
      'Read first and last sentences, then match the overall point — not a single detail.',
  },
  {
    id: 'rq-05',
    name: 'Matching information',
    description: 'Find which paragraph contains specific details.',
    strategy: 'Scan for unique nouns and numbers; several paragraphs may look similar.',
  },
  {
    id: 'rq-06',
    name: 'Matching names / views',
    description: 'Match researchers or people to their findings or opinions.',
    strategy:
      'Skim for capitalised names first, then read the surrounding claim carefully.',
  },
  {
    id: 'rq-07',
    name: 'Sentence completion',
    description: 'Complete sentences with words taken from the passage.',
    strategy: 'Respect the word limit strictly; check grammar fit before moving on.',
  },
  {
    id: 'rq-08',
    name: 'Summary completion',
    description: 'Fill gaps in a summary using words from the passage or a word bank.',
    strategy: 'Predict the word type for each gap, then scan the matching section.',
  },
  {
    id: 'rq-09',
    name: 'Table / flow-chart completion',
    description: 'Complete structured notes with words from the text.',
    strategy: 'Use row and column headings to locate the right paragraph fast.',
  },
  {
    id: 'rq-10',
    name: 'Short-answer questions',
    description: 'Answer with a limited number of words from the passage.',
    strategy: 'Copy exact words; extra words beyond the limit lose the mark.',
  },
];

export const readingTips: Tip[] = [
  {
    id: 'rt-01',
    title: 'Skim before you scan',
    detail:
      'Spend 2 minutes on headings and topic sentences so scanning later is targeted.',
  },
  {
    id: 'rt-02',
    title: 'Answer in question order groups',
    detail:
      'Most sets follow passage order — use a found answer to bound the next search.',
  },
  {
    id: 'rt-03',
    title: 'Watch the word limit',
    detail: '“No more than two words” means two. Hyphenated words count as one.',
  },
  {
    id: 'rt-04',
    title: 'Paraphrase is the test',
    detail:
      'Questions restate the text with synonyms; matching identical words alone is a trap.',
  },
  {
    id: 'rt-05',
    title: 'Leave 1 minute per passage to transfer',
    detail: 'On paper, misaligned answer-sheet transfers are a classic score leak.',
  },
  {
    id: 'rt-06',
    title: 'Don’t over-invest in one item',
    detail: 'After 90 seconds, guess, mark and move on — all questions carry one mark.',
  },
];

export const readingPractice: PracticeSet[] = [
  {
    id: 'rp-01',
    title: 'Academic mini-set: urban green spaces',
    passages: 1,
    questions: 13,
    timeMinutes: 20,
    skills: ['matching headings', 'True / False / Not Given', 'sentence completion'],
    instructions:
      'Read one 800-word passage and answer 13 questions in 20 minutes without a dictionary.',
  },
  {
    id: 'rp-02',
    title: 'General Training mini-set: workplace notices',
    passages: 2,
    questions: 14,
    timeMinutes: 20,
    skills: ['short answers', 'matching information', 'multiple choice'],
    instructions:
      'Practise fast scanning on short texts before attempting long passages.',
  },
  {
    id: 'rp-03',
    title: 'Full Academic set: three passages',
    passages: 3,
    questions: 40,
    timeMinutes: 60,
    skills: ['all question types'],
    instructions:
      'Simulate test conditions: 60 minutes, no pauses, transfer answers at the end.',
  },
];

export const listeningQuestionTypes: QuestionType[] = [
  {
    id: 'lq-01',
    name: 'Form / note completion',
    description: 'Fill gaps with words or numbers heard in everyday conversations.',
    strategy: 'Predict word type and listen for spelling of names and numbers.',
  },
  {
    id: 'lq-02',
    name: 'Multiple choice',
    description: 'Choose answers about opinions, attitudes or detailed facts.',
    strategy: 'Options are paraphrased; wait for the full turn before choosing.',
  },
  {
    id: 'lq-03',
    name: 'Map / plan labelling',
    description: 'Label buildings, rooms or routes on a visual.',
    strategy:
      'Track the speaker’s position with compass words: opposite, beside, corner.',
  },
  {
    id: 'lq-04',
    name: 'Matching',
    description: 'Match items such as speakers, events or features.',
    strategy:
      'Note synonyms while listening; the recording rarely repeats option wording.',
  },
  {
    id: 'lq-05',
    name: 'Table completion',
    description: 'Complete rows and columns during talks or discussions.',
    strategy: 'Follow the row order; answers come in sequence.',
  },
  {
    id: 'lq-06',
    name: 'Sentence / summary completion',
    description: 'Complete academic summaries with up to the stated word limit.',
    strategy: 'Grammar-check each gap; plural and tense errors lose marks.',
  },
];

export const listeningTips: Tip[] = [
  {
    id: 'lt-01',
    title: 'Use every pause to pre-read',
    detail: 'Underline keywords and predict answers before the audio starts.',
  },
  {
    id: 'lt-02',
    title: 'Expect distractors',
    detail:
      'Speakers often correct themselves (“No, Thursday, not Tuesday”). Keep listening to the end.',
  },
  {
    id: 'lt-03',
    title: 'Guard spelling and plurals',
    detail: 'A correct word with wrong spelling scores zero; double-check proper nouns.',
  },
  {
    id: 'lt-04',
    title: 'Follow signposts',
    detail:
      'Words like “however”, “firstly” and “in contrast” mark where answers appear.',
  },
  {
    id: 'lt-05',
    title: 'Write then transfer carefully',
    detail: 'Use the 10 minutes (paper test) to check word limits and handwriting.',
  },
];

export const listeningPractice: PracticeSet[] = [
  {
    id: 'lp-01',
    title: 'Section 1 drill: booking and enquiries',
    passages: 1,
    questions: 10,
    timeMinutes: 12,
    skills: ['form completion', 'numbers and spelling'],
    instructions: 'Dictate-style drill: play once, then replay only the missed items.',
  },
  {
    id: 'lp-02',
    title: 'Sections 3–4 drill: academic discussion',
    passages: 2,
    questions: 20,
    timeMinutes: 25,
    skills: ['matching', 'multiple choice', 'summary completion'],
    instructions: 'Focus on opinion language and lecture signposts.',
  },
  {
    id: 'lp-03',
    title: 'Full listening mock: four sections',
    passages: 4,
    questions: 40,
    timeMinutes: 40,
    skills: ['all question types'],
    instructions:
      'Play straight through with no pauses, then score against the band table.',
  },
];
