/**
 * Factual reference list of the IELTS Reading question types and the skills
 * they test. Original explanatory text.
 */
export interface QuestionType {
  id: string;
  name: string;
  description: string;
  skill: string;
  strategy: string;
}

export const QUESTION_TYPES: readonly QuestionType[] = [
  {
    id: "matching-headings",
    name: "Matching headings to paragraphs",
    description: "Choose the heading that best summarises each paragraph from a list.",
    skill: "Identifying the main idea of a paragraph.",
    strategy: "Read the first and last sentence of each paragraph before matching.",
  },
  {
    id: "tfng",
    name: "True / False / Not Given",
    description:
      "Decide whether statements agree with the text, contradict it, or are not covered.",
    skill: "Distinguishing facts stated in the text from unsupported ideas.",
    strategy: "Only judge statements against the passage; do not use outside knowledge.",
  },
  {
    id: "ymng",
    name: "Yes / No / Not Given",
    description: "Judge whether statements match the writer's opinion rather than the facts.",
    skill: "Recognising the author's viewpoint and argument.",
    strategy: "Look for opinion language such as 'I believe' or 'argues that'.",
  },
  {
    id: "fill-gaps",
    name: "Sentence and summary completion",
    description: "Fill gaps in a summary or sentences using words from the passage.",
    skill: "Locating specific information and paraphrasing.",
    strategy: "Predict the type of word needed (noun, verb, number) before searching.",
  },
  {
    id: "multiple-choice",
    name: "Multiple choice",
    description:
      "Select the correct option for each question, often with a single or multiple answers.",
    skill: "Reading for detail and main ideas.",
    strategy: "Eliminate clearly wrong options using evidence from the text.",
  },
  {
    id: "matching-info",
    name: "Matching information",
    description: "Match statements to the paragraph in which the information appears.",
    skill: "Scanning for specific facts or ideas.",
    strategy: "Work through the passage systematically instead of searching at random.",
  },
  {
    id: "diagram-flowchart",
    name: "Labelling a diagram, map or flowchart",
    description: "Complete labels on a diagram, map or flowchart using words from the passage.",
    skill: "Understanding spatial or process descriptions.",
    strategy: "Follow the labels in order and locate the matching words in the text.",
  },
  {
    id: "short-answer",
    name: "Short-answer questions",
    description: "Answer questions about the text in a few words, following a word limit.",
    skill: "Locating precise information quickly.",
    strategy: "Note the word limit and check your answer uses words from the passage.",
  },
];

/** Retrieve a single question type by id. */
export function getQuestionType(id: string): QuestionType | undefined {
  return QUESTION_TYPES.find((type) => type.id === id);
}
