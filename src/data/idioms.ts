import type { Idiom } from "../types.js";

/**
 * Idioms that are natural and useful in IELTS Speaking and Writing. Each is
 * tagged by register so learners know when to use it in a formal exam.
 */
export const idioms: Idiom[] = [
  {
    id: "idiom-1",
    expression: "a double-edged sword",
    meaning: "Something that has both advantages and disadvantages.",
    example: "Social media is a double-edged sword: it connects us yet isolates us.",
    register: "neutral",
    topicId: "technology",
  },
  {
    id: "idiom-2",
    expression: "the tip of the iceberg",
    meaning: "A small visible part of a much larger problem.",
    example: "The reported cases are only the tip of the iceberg.",
    register: "neutral",
    topicId: "society",
  },
  {
    id: "idiom-3",
    expression: "cost an arm and a leg",
    meaning: "To be extremely expensive.",
    example: "Renovating the house cost an arm and a leg.",
    register: "informal",
    topicId: "work",
  },
  {
    id: "idiom-4",
    expression: "in the long run",
    meaning: "Over a long period of time, ultimately.",
    example: "Investing in education pays off in the long run.",
    register: "neutral",
    topicId: "education",
  },
  {
    id: "idiom-5",
    expression: "turn a blind eye",
    meaning: "To deliberately ignore something wrong.",
    example: "Officials turned a blind eye to the illegal dumping.",
    register: "informal",
    topicId: "environment",
  },
  {
    id: "idiom-6",
    expression: "a question of time",
    meaning: "Something that will definitely happen eventually.",
    example: "It is only a question of time before automation replaces these jobs.",
    register: "neutral",
    topicId: "work",
  },
];

/** Find an idiom by id. */
export function getIdiomById(id: string): Idiom | undefined {
  return idioms.find((idiom) => idiom.id === id);
}

/** Return idioms filtered by topic. */
export function getIdiomsByTopic(topicId: string): Idiom[] {
  return idioms.filter((idiom) => idiom.topicId === topicId);
}

/** Search idioms by expression, meaning or example. */
export function searchIdioms(query: string): Idiom[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return idioms;
  }
  return idioms.filter((idiom) =>
    [idiom.expression, idiom.meaning, idiom.example].join(" ").toLowerCase().includes(q),
  );
}
