import type { ReadingQuestionType } from "../types.js";

/**
 * The common question types found in the IELTS Academic and General Training
 * reading tests, with strategies for approaching each.
 */
export const readingQuestionTypes: ReadingQuestionType[] = [
  {
    id: "reading-tfng",
    name: "True / False / Not Given",
    description: "You decide whether statements are true, false, or not given based on the text.",
    strategy: [
      "Read the statement carefully and identify the key words.",
      "Scan the passage for those key words or their synonyms.",
      "A 'False' statement contradicts the text; 'Not Given' simply is not addressed.",
    ],
    skills: ["Paraphrasing", "Skimming", "Scanning"],
  },
  {
    id: "reading-multiple-choice",
    name: "Multiple Choice",
    description: "You choose the correct answer from a list of options.",
    strategy: [
      "Read the question before the options.",
      "Eliminate obviously incorrect or extreme answers.",
      "Watch out for traps that reuse exact words from the passage.",
    ],
    skills: ["Detail reading", "Distraction handling"],
  },
  {
    id: "reading-headings",
    name: "Matching Headings",
    description: "You match headings to the paragraphs of the passage.",
    strategy: [
      "Read the headings first, not the whole passage.",
      "Skim each paragraph to identify its main idea, not the details.",
      "Look for the topic sentence, often the first or last sentence.",
    ],
    skills: ["Skimming", "Identifying main ideas"],
  },
  {
    id: "reading-sentence-completion",
    name: "Sentence Completion",
    description: "You complete sentences with words from the passage.",
    strategy: [
      "Read the sentence and predict the type of word needed.",
      "Check the word limit given in the instructions.",
      "Copy words exactly as they appear in the passage.",
    ],
    skills: ["Prediction", "Scanning", "Grammar"],
  },
  {
    id: "reading-summary",
    name: "Summary Completion",
    description: "You complete a summary of a section of the passage.",
    strategy: [
      "Read the summary to understand which part of the passage it covers.",
      "Identify the part of speech of each gap.",
      "Locate the corresponding section and extract the exact words.",
    ],
    skills: ["Paraphrasing", "Scanning", "Vocabulary"],
  },
];

/** Find a reading question type by id. */
export function getReadingQuestionTypeById(id: string): ReadingQuestionType | undefined {
  return readingQuestionTypes.find((item) => item.id === id);
}

/** Search reading question types by name, description or strategy. */
export function searchReadingQuestionTypes(query: string): ReadingQuestionType[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return readingQuestionTypes;
  }
  return readingQuestionTypes.filter((item) =>
    [item.name, item.description, ...item.strategy].join(" ").toLowerCase().includes(q),
  );
}
