import type { CommonMistake } from "../types.js";

/**
 * Common mistakes made by IELTS candidates, with the correction and an
 * explanation of why the form is wrong.
 */
export const commonMistakes: CommonMistake[] = [
  {
    id: "mistake-1",
    category: "word choice",
    incorrect: "I am agree with this statement.",
    correct: "I agree with this statement.",
    explanation: "'Agree' is a verb, not an adjective, so it does not take the verb 'be'.",
  },
  {
    id: "mistake-2",
    category: "word choice",
    incorrect: "discuss about the problem",
    correct: "discuss the problem",
    explanation: "'Discuss' is a transitive verb and does not take the preposition 'about'.",
  },
  {
    id: "mistake-3",
    category: "grammar",
    incorrect: "People is becoming more aware.",
    correct: "People are becoming more aware.",
    explanation: "'People' is plural, so it takes the plural verb 'are'.",
  },
  {
    id: "mistake-4",
    category: "grammar",
    incorrect: "There is many reasons for this.",
    correct: "There are many reasons for this.",
    explanation: "The verb must agree with the plural noun 'reasons'.",
  },
  {
    id: "mistake-5",
    category: "spelling",
    incorrect: "goverment",
    correct: "government",
    explanation: "The word 'government' contains an 'n' after the 'r'.",
  },
  {
    id: "mistake-6",
    category: "preposition",
    incorrect: "depend of the weather",
    correct: "depend on the weather",
    explanation: "The verb 'depend' takes the preposition 'on'.",
  },
  {
    id: "mistake-7",
    category: "word form",
    incorrect: "in conclusion, we can see that it is benefit",
    correct: "in conclusion, we can see that it is beneficial",
    explanation: "After the verb 'be', an adjective is needed, not a noun.",
  },
  {
    id: "mistake-8",
    category: "word choice",
    incorrect: "The benefits are more bigger.",
    correct: "The benefits are bigger.",
    explanation: "'Bigger' is already comparative, so it cannot be combined with 'more'.",
  },
];

/** Find a common mistake by id. */
export function getMistakeById(id: string): CommonMistake | undefined {
  return commonMistakes.find((mistake) => mistake.id === id);
}

/** Search common mistakes by incorrect/correct text or category. */
export function searchMistakes(query: string): CommonMistake[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return commonMistakes;
  }
  return commonMistakes.filter((mistake) =>
    [mistake.incorrect, mistake.correct, mistake.category, mistake.explanation]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}
