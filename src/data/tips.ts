import type { ExamTip } from "../types.js";

/**
 * A collection of practical, free-to-use IELTS exam tips, organised by skill.
 */
export const examTips: ExamTip[] = [
  {
    id: "tip-listening-1",
    skill: "listening",
    title: "Predict before you listen",
    tip: "Use the pause before each recording to read the questions and predict the type of answer you will hear.",
  },
  {
    id: "tip-listening-2",
    skill: "listening",
    title: "Watch out for paraphrasing",
    tip: "The audio rarely uses the exact words in the question. Listen for meaning and synonyms.",
  },
  {
    id: "tip-reading-1",
    skill: "reading",
    title: "Do not spend too long",
    tip: "Each passage should take about 20 minutes. If you are stuck, move on and return later.",
  },
  {
    id: "tip-reading-2",
    skill: "reading",
    title: "Read the instructions",
    tip: "Check the word limit. Writing too many words will lose marks.",
  },
  {
    id: "tip-writing-1",
    skill: "writing",
    title: "Plan your essay",
    tip: "Spend two or three minutes planning your structure before you write. A clear plan prevents rambling.",
  },
  {
    id: "tip-writing-2",
    skill: "writing",
    title: "Leave time to review",
    tip: "Reserve the final few minutes to check your spelling, grammar and word count.",
  },
  {
    id: "tip-speaking-1",
    skill: "speaking",
    title: "Expand your answers",
    tip: "Do not answer with one word. Give a reason, example or comparison to extend your response.",
  },
  {
    id: "tip-speaking-2",
    skill: "speaking",
    title: "Use 'well', 'actually' and fillers naturally",
    tip: "Natural hesitation is fine and can buy you time to think, but do not overuse it.",
  },
];

/** Find an exam tip by id. */
export function getTipById(id: string): ExamTip | undefined {
  return examTips.find((tip) => tip.id === id);
}

/** Return exam tips filtered by skill. */
export function getTipsBySkill(skill: string): ExamTip[] {
  const normalized = skill.toLowerCase();
  return examTips.filter((tip) => tip.skill === normalized);
}

/** Search exam tips by title or tip text. */
export function searchTips(query: string): ExamTip[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return examTips;
  }
  return examTips.filter((tip) =>
    [tip.title, tip.tip, tip.skill].join(" ").toLowerCase().includes(q),
  );
}
