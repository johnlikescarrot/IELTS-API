/**
 * Original IELTS-style Speaking cue cards. Each card describes what the
 * candidate should talk about for 1–2 minutes in Part 2, plus discussion
 * prompts used in the Part 3 follow-up. Written from scratch for this project.
 */
export interface CueCard {
  id: string;
  category: string;
  topic: string;
  instruction: string;
  bulletPoints: readonly string[];
  followUpQuestions: readonly string[];
}

export const CUE_CARDS: readonly CueCard[] = [
  {
    id: "cc-places-01",
    category: "People & Places",
    topic: "A place you like to relax",
    instruction:
      "Describe a place where you like to relax. You should say where it is, when you go there, what you do there, and explain why it helps you to relax.",
    bulletPoints: ["where the place is", "how you found it", "what you do there"],
    followUpQuestions: [
      "Why do people find it harder to relax today than in the past?",
      "Do you think cities provide enough quiet spaces for people?",
    ],
  },
  {
    id: "cc-places-02",
    category: "People & Places",
    topic: "A city you have visited",
    instruction:
      "Describe a city you have visited that impressed you. You should say which city it was, when you visited it, what you saw and did, and explain why it impressed you.",
    bulletPoints: ["the name of the city", "the reason for your visit", "what you did there"],
    followUpQuestions: [
      "What makes some cities more attractive to tourists than others?",
      "How does tourism affect the character of a city?",
    ],
  },
  {
    id: "cc-people-01",
    category: "People & Places",
    topic: "A person who has influenced you",
    instruction:
      "Describe a person who has had a big influence on your life. You should say who this person is, how you know them, what they did, and explain why they influenced you.",
    bulletPoints: [
      "who the person is",
      "your relationship with them",
      "what you learned from them",
    ],
    followUpQuestions: [
      "Are role models important for young people?",
      "Do teachers influence students more than family members do?",
    ],
  },
  {
    id: "cc-people-02",
    category: "People & Places",
    topic: "A good friend",
    instruction:
      "Describe a good friend you have. You should say who they are, how long you have known them, what you do together, and explain why they are a good friend.",
    bulletPoints: ["who they are", "how you met", "what you share in common"],
    followUpQuestions: [
      "Has the meaning of friendship changed with social media?",
      "What qualities do people look for in a friend?",
    ],
  },
  {
    id: "cc-objects-01",
    category: "Objects & Experiences",
    topic: "An object that is important to you",
    instruction:
      "Describe an object you own that is important to you. You should say what it is, how you got it, how often you use it, and explain why it matters to you.",
    bulletPoints: ["what the object is", "when you got it", "what it looks like"],
    followUpQuestions: [
      "Why do people become attached to certain possessions?",
      "Do you think we place too much value on material things?",
    ],
  },
  {
    id: "cc-experiences-01",
    category: "Objects & Experiences",
    topic: "A special meal",
    instruction:
      "Describe a special meal you remember well. You should say where you had it, who you were with, what you ate, and explain why it was special.",
    bulletPoints: ["where and when you had it", "who was there", "what food was served"],
    followUpQuestions: [
      "Why is sharing food an important social activity?",
      "How have eating habits changed in your country?",
    ],
  },
  {
    id: "cc-experiences-02",
    category: "Objects & Experiences",
    topic: "A skill you learned",
    instruction:
      "Describe a practical skill you learned that has been useful. You should say what the skill is, how you learned it, whether it was easy to learn, and explain why it has been useful.",
    bulletPoints: ["what the skill is", "how you learned it", "how long it took"],
    followUpQuestions: [
      "Are practical skills valued as much as academic ones?",
      "Should schools teach more practical skills?",
    ],
  },
  {
    id: "cc-experiences-03",
    category: "Objects & Experiences",
    topic: "A journey that took longer than expected",
    instruction:
      "Describe a journey that took longer than you expected. You should say where you were going, how you travelled, what happened, and explain how you felt about the delay.",
    bulletPoints: ["your destination", "the reason for the delay", "what you did while waiting"],
    followUpQuestions: [
      "How can travelling become less stressful?",
      "Has technology made journeys easier or more complicated?",
    ],
  },
  {
    id: "cc-workstudy-01",
    category: "Work & Study",
    topic: "A subject you enjoyed at school",
    instruction:
      "Describe a subject you enjoyed at school. You should say what it was, why you chose to focus on it, what you learned, and explain why you enjoyed it.",
    bulletPoints: ["the name of the subject", "your teacher", "what you remember about it"],
    followUpQuestions: [
      "Why do some students lose interest in learning?",
      "How should schools motivate students?",
    ],
  },
  {
    id: "cc-workstudy-02",
    category: "Work & Study",
    topic: "A job you would like to try",
    instruction:
      "Describe a job you would like to try in the future. You should say what the job is, why you are interested in it, what skills it requires, and explain why you have not done it yet.",
    bulletPoints: ["what the job involves", "why it attracts you", "the skills it needs"],
    followUpQuestions: [
      "Do young people choose careers mainly for money or satisfaction?",
      "How is the job market likely to change?",
    ],
  },
  {
    id: "cc-leisure-01",
    category: "Leisure & Media",
    topic: "A book you have enjoyed",
    instruction:
      "Describe a book you have enjoyed reading. You should say what the book is, what it is about, when you read it, and explain why you enjoyed it.",
    bulletPoints: ["the title and author", "the story or content", "how you got it"],
    followUpQuestions: [
      "Are people reading fewer books because of the internet?",
      "What makes a book worth reading?",
    ],
  },
  {
    id: "cc-leisure-02",
    category: "Leisure & Media",
    topic: "A film or series you watched recently",
    instruction:
      "Describe a film or series you watched recently. You should say what it was, what it was about, who you watched it with, and explain what you thought of it.",
    bulletPoints: ["the title", "the genre and plot", "why you chose it"],
    followUpQuestions: [
      "Why are streaming services so popular?",
      "Do films and series influence people's behaviour?",
    ],
  },
];

/** Flat list of cue-card categories. */
export const CUE_CARD_CATEGORIES: readonly string[] = [
  ...new Set(CUE_CARDS.map((card) => card.category)),
];

/** Practical guidance about the three parts of the Speaking test. */
export interface SpeakingPartGuide {
  part: 1 | 2 | 3;
  name: string;
  duration: string;
  task: string;
  typicalTopics: readonly string[];
  tip: string;
}

export const SPEAKING_PARTS: readonly SpeakingPartGuide[] = [
  {
    part: 1,
    name: "Introduction and interview",
    duration: "4–5 minutes",
    task: "Answer general questions about yourself and familiar topics.",
    typicalTopics: ["home", "work or study", "hobbies", "food", "travel"],
    tip: "Give answers of two to four sentences and avoid memorised replies.",
  },
  {
    part: 2,
    name: "Long turn",
    duration: "1 minute preparation + 1–2 minutes speaking",
    task: "Speak about a topic on a cue card, covering all the prompts.",
    typicalTopics: ["a person", "a place", "an object", "an experience"],
    tip: "Use the minute to plan; cover every prompt and keep talking until asked to stop.",
  },
  {
    part: 3,
    name: "Two-way discussion",
    duration: "4–5 minutes",
    task: "Discuss more abstract questions linked to the Part 2 topic.",
    typicalTopics: ["society", "culture", "the future", "causes and effects"],
    tip: "Extend your ideas with reasons and examples; you can be analytical here.",
  },
];

/** Retrieve a single cue card by id. */
export function getCueCard(id: string): CueCard | undefined {
  return CUE_CARDS.find((card) => card.id === id);
}
