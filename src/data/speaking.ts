/**
 * A corpus of IELTS Speaking prompts for Parts 1, 2 and 3.
 *
 * Part 1 items are short personal questions on familiar topics, Part 2 items are
 * long-turn cue cards with bullet prompts, and Part 3 items are abstract
 * discussion questions thematically linked to a Part 2 card. All items are
 * original and redistributable under this project's licence.
 *
 * @packageDocumentation
 */

/** The three parts of the Speaking test. */
export type SpeakingPart = 1 | 2 | 3;

/** A Part 1 or Part 3 question. */
export interface SpeakingQuestion {
  /** Stable identifier. */
  readonly id: string;
  /** The part the question belongs to. */
  readonly part: 1 | 3;
  /** Broad topic label. */
  readonly topic: string;
  /** The question text. */
  readonly question: string;
}

/** A Part 2 long-turn cue card. */
export interface SpeakingCueCard {
  /** Stable identifier. */
  readonly id: string;
  /** Always 2. */
  readonly part: 2;
  /** Broad topic label. */
  readonly topic: string;
  /** The opening instruction, for example "Describe a book you enjoyed". */
  readonly prompt: string;
  /** The bullet points the candidate must cover. */
  readonly bullets: readonly string[];
  /** The closing instruction. */
  readonly closing: string;
  /** Preparation time in seconds. */
  readonly preparationSeconds: number;
  /** Minimum expected speaking time in seconds. */
  readonly minimumSpeakingSeconds: number;
  /** Maximum expected speaking time in seconds. */
  readonly maximumSpeakingSeconds: number;
}

function question(
  id: string,
  part: 1 | 3,
  topic: string,
  text: string,
): SpeakingQuestion {
  return { id, part, topic, question: text };
}

function cueCard(
  id: string,
  topic: string,
  prompt: string,
  bullets: readonly string[],
  closing: string,
): SpeakingCueCard {
  return {
    id,
    part: 2,
    topic,
    prompt,
    bullets,
    closing,
    preparationSeconds: 60,
    minimumSpeakingSeconds: 60,
    maximumSpeakingSeconds: 120,
  };
}

/** Part 1 and Part 3 questions. */
export const SPEAKING_QUESTIONS: readonly SpeakingQuestion[] = Object.freeze([
  question("s1-home-01", 1, "hometown", "Where is your hometown?"),
  question(
    "s1-home-02",
    1,
    "hometown",
    "What do you like most about the place where you grew up?",
  ),
  question(
    "s1-home-03",
    1,
    "hometown",
    "Has your hometown changed much in recent years?",
  ),
  question(
    "s1-work-01",
    1,
    "work and study",
    "Do you work or are you a student?",
  ),
  question(
    "s1-work-02",
    1,
    "work and study",
    "What is the most interesting part of your work or your course?",
  ),
  question(
    "s1-work-03",
    1,
    "work and study",
    "Would you like to change anything about your job or your studies?",
  ),
  question("s1-food-01", 1, "food", "What kind of food do you usually eat?"),
  question(
    "s1-food-02",
    1,
    "food",
    "Do you prefer eating at home or eating out?",
  ),
  question("s1-tech-01", 1, "technology", "How often do you use a computer?"),
  question(
    "s1-tech-02",
    1,
    "technology",
    "Which application on your phone do you use the most?",
  ),
  question("s1-travel-01", 1, "travel", "Do you enjoy travelling by train?"),
  question(
    "s1-travel-02",
    1,
    "travel",
    "What is the longest journey you have ever made?",
  ),
  question("s1-weather-01", 1, "weather", "What is the weather like today?"),
  question(
    "s1-weather-02",
    1,
    "weather",
    "Which season do you enjoy most, and why?",
  ),
  question(
    "s3-education-01",
    3,
    "education",
    "Why do you think some subjects are valued more highly than others in schools?",
  ),
  question(
    "s3-education-02",
    3,
    "education",
    "Should universities be free for everyone? What would the consequences be?",
  ),
  question(
    "s3-technology-01",
    3,
    "technology",
    "In what ways has technology changed the way people form friendships?",
  ),
  question(
    "s3-technology-02",
    3,
    "technology",
    "Do you think artificial intelligence will make certain professions disappear?",
  ),
  question(
    "s3-environment-01",
    3,
    "environment",
    "Who should bear the greatest responsibility for reducing pollution: individuals, companies or governments?",
  ),
  question(
    "s3-environment-02",
    3,
    "environment",
    "How can cities be redesigned so that people rely less on cars?",
  ),
  question(
    "s3-culture-01",
    3,
    "culture",
    "Why do traditional crafts survive in some countries but disappear in others?",
  ),
  question(
    "s3-culture-02",
    3,
    "culture",
    "Is it important for children to learn about the history of other cultures?",
  ),
  question(
    "s3-work-01",
    3,
    "work",
    "What effect does remote working have on the relationships between colleagues?",
  ),
  question(
    "s3-work-02",
    3,
    "work",
    "Do you think people will change careers more often in the future?",
  ),
]);

/** Part 2 cue cards. */
export const SPEAKING_CUE_CARDS: readonly SpeakingCueCard[] = Object.freeze([
  cueCard(
    "s2-person-01",
    "people",
    "Describe a person who taught you something important.",
    ["who this person is", "what they taught you", "how you learned it"],
    "and explain why this lesson mattered to you.",
  ),
  cueCard(
    "s2-place-01",
    "places",
    "Describe a place you like to go to relax.",
    ["where it is", "how often you go there", "what you do there"],
    "and explain why it helps you relax.",
  ),
  cueCard(
    "s2-object-01",
    "objects",
    "Describe an item of technology you find useful.",
    ["what it is", "how long you have had it", "how you use it"],
    "and explain why you would find it hard to live without.",
  ),
  cueCard(
    "s2-event-01",
    "events",
    "Describe an occasion when you had to make a difficult decision.",
    ["what the decision was", "what the options were", "who you consulted"],
    "and explain how you feel about the decision now.",
  ),
  cueCard(
    "s2-activity-01",
    "activities",
    "Describe a skill you would like to learn.",
    ["what the skill is", "how you would learn it", "how long it might take"],
    "and explain why you want to learn it.",
  ),
  cueCard(
    "s2-media-01",
    "media",
    "Describe a book, film or programme that changed your view of something.",
    ["what it was", "when you experienced it", "what it was about"],
    "and explain how it changed your thinking.",
  ),
]);

/** Every distinct topic label used by Part 1 and Part 3 questions. */
export const SPEAKING_TOPICS: readonly string[] = Object.freeze(
  [...new Set(SPEAKING_QUESTIONS.map((item) => item.topic))].sort(),
);

/** Every distinct topic label used by Part 2 cue cards. */
export const SPEAKING_CUE_CARD_TOPICS: readonly string[] = Object.freeze(
  [...new Set(SPEAKING_CUE_CARDS.map((item) => item.topic))].sort(),
);
