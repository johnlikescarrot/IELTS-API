import type { SpeakingCueCard, SpeakingPart } from "../types.js";

/**
 * Free-to-use IELTS speaking practice questions for Parts 1, 2 and 3.
 */
export const speakingParts: SpeakingPart[] = [
  {
    id: "speak-1-hometown",
    topicId: "travel",
    question: "Where are you from?",
    followUp: [
      "Do you like living there? Why?",
      "Has your hometown changed in recent years?",
      "What is special about your hometown?",
    ],
  },
  {
    id: "speak-1-work",
    topicId: "work",
    question: "What do you do?",
    followUp: [
      "Do you enjoy your work?",
      "What do you find difficult about your job?",
      "How has your job changed your life?",
    ],
  },
  {
    id: "speak-1-study",
    topicId: "education",
    question: "Do you work or are you a student?",
    followUp: [
      "What do you study?",
      "Why did you choose that subject?",
      "Do you prefer studying in the morning or evening?",
    ],
  },
  {
    id: "speak-2-technology",
    topicId: "technology",
    question:
      "Describe a piece of technology you use often. You should say: what it is, how you use it, and why it matters to you.",
    followUp: [
      "How has technology changed the way people communicate?",
      "Do you think people rely too much on their phones?",
      "How might technology change in the next ten years?",
    ],
  },
  {
    id: "speak-3-environment",
    topicId: "environment",
    question: "What can individuals do to protect the environment?",
    followUp: [
      "Should governments do more to fight climate change?",
      "Are ordinary people responsible for environmental problems?",
    ],
  },
  {
    id: "speak-3-education",
    topicId: "education",
    question: "Is online learning as effective as traditional classroom teaching?",
    followUp: [
      "What are the advantages of studying online?",
      "Do you think exams are a fair way to assess students?",
      "Should university education be free for everyone?",
    ],
  },
];

export const speakingCueCards: SpeakingCueCard[] = [
  {
    id: "cue-tech-1",
    topicId: "technology",
    title: "A useful app",
    instructions: [
      "Describe a useful application on your phone or computer.",
      "How long have you been using it?",
      "How did you discover it?",
    ],
    points: ["What it is", "When you started using it", "What it helps you do"],
    part: 2,
  },
  {
    id: "cue-travel-1",
    topicId: "travel",
    title: "A memorable journey",
    instructions: [
      "Describe a journey you remember well.",
      "Where did you go and who with?",
      "Why was it memorable?",
    ],
    points: ["Where you went", "Who you travelled with", "What you did there"],
    part: 2,
  },
  {
    id: "cue-people-1",
    topicId: "family",
    title: "Someone you admire",
    instructions: [
      "Describe a person you admire.",
      "Who are they and how do you know them?",
      "What qualities do you admire?",
    ],
    points: ["Who they are", "How you know them", "What you admire about them"],
    part: 2,
  },
];

/** Find a speaking part question by id. */
export function getSpeakingPartById(id: string): SpeakingPart | undefined {
  return speakingParts.find((part) => part.id === id);
}

/** Find a speaking cue card by id. */
export function getCueCardById(id: string): SpeakingCueCard | undefined {
  return speakingCueCards.find((card) => card.id === id);
}

/** Search speaking parts and cue cards by question/title text. */
export function searchSpeaking(query: string): {
  parts: SpeakingPart[];
  cueCards: SpeakingCueCard[];
} {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return { parts: speakingParts, cueCards: speakingCueCards };
  }
  const parts = speakingParts.filter((part) =>
    [part.question, ...part.followUp].join(" ").toLowerCase().includes(q),
  );
  const cueCards = speakingCueCards.filter((card) =>
    [card.title, ...card.points, ...card.instructions].join(" ").toLowerCase().includes(q),
  );
  return { parts, cueCards };
}
