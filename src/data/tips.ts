import type { StudyTip } from "../types.ts";

/** Twenty-four practical study tips across all four skills plus general strategy. */
export const STUDY_TIPS: readonly StudyTip[] = [
  { id: 1, skill: "listening", title: "Predict before you listen", detail: "Read the questions first and guess the kind of answer needed - a number, a name, a place - so your ear knows what to catch." },
  { id: 2, skill: "listening", title: "Watch for signpost words", detail: "Words such as \"however\", \"actually\" and \"finally\" signal a change of direction and often mark where the next answer hides." },
  { id: 3, skill: "listening", title: "Move on when you miss one", detail: "A single lost answer should never cost you the next three; let it go, reset, and lock onto the following question." },
  { id: 4, skill: "listening", title: "Check spelling and plurals", detail: "In the Listening test a correctly heard answer spelled wrong, or missing its final s, scores zero." },
  { id: 5, skill: "listening", title: "Train across accents", detail: "Use podcasts with British, Australian and North American speakers so no accent surprises you on test day." },
  { id: 6, skill: "reading", title: "Skim first, then scan", detail: "Spend two minutes skimming each passage for gist and structure before hunting for keywords." },
  { id: 7, skill: "reading", title: "Never leave blanks", detail: "There is no penalty for a wrong answer in IELTS Reading, so fill every gap in the last two minutes." },
  { id: 8, skill: "reading", title: "Learn the False vs Not Given trap", detail: "False contradicts the passage; Not Given simply is not stated. Ask: can I point at the line that proves it false?" },
  { id: 9, skill: "reading", title: "Budget twenty minutes per passage", detail: "Passage one earns points fastest; never let passage three eat the time you need to transfer strategy." },
  { id: 10, skill: "reading", title: "Study paraphrase, not just words", detail: "IELTS Reading tests synonyms: the question rarely repeats the exact words of the text." },
  { id: 11, skill: "writing", title: "Plan Task 2 for five minutes", detail: "A four-line plan - position, two body ideas, example, conclusion - buys coherence that saves far more time than it costs." },
  { id: 12, skill: "writing", title: "Answer the whole question", detail: "Double-question prompts ask two things; missing one caps your Task Achievement regardless of your English." },
  { id: 13, skill: "writing", title: "Link ideas explicitly", detail: "Examiners hunt for cohesive devices: however, in contrast, as a result. Make relationships between sentences visible." },
  { id: 14, skill: "writing", title: "Keep two minutes to proofread", detail: "Catching three slipped articles or subject-verb errors protects half a band of Grammatical Range and Accuracy." },
  { id: 15, skill: "writing", title: "Build Task 1 graph language", detail: "Learn rise, fall, fluctuate, plateau, and pair them with sharply, steadily and marginally." },
  { id: 16, skill: "speaking", title: "Extend every answer", detail: "Stop after one sentence and you hand the examiner nothing to grade; add a reason, an example or a contrast." },
  { id: 17, skill: "speaking", title: "Buy thinking time politely", detail: "\"That's an interesting question\" sounds natural and gives your brain two seconds to plan." },
  { id: 18, skill: "speaking", title: "Paraphrase the question", detail: "Echoing the examiner's exact words signals memorised language; rephrase it in your first sentence." },
  { id: 19, skill: "speaking", title: "Record yourself weekly", detail: "Listen back for fillers, speed and dropped past-tense endings; self-monitoring drives fluency gains." },
  { id: 20, skill: "speaking", title: "Rehearse Part 2 against the clock", detail: "One minute to plan, two to speak, until the cue-card structure feels like a habit." },
  { id: 21, skill: "general", title: "Simulate the full test", detail: "One timed sitting of all four skills builds the stamina a three-hour exam day demands." },
  { id: 22, skill: "general", title: "Keep an error notebook", detail: "Log every mistake by skill and reread the notebook weekly; awareness alone fixes a third of them." },
  { id: 23, skill: "general", title: "Immerse a little every day", detail: "Thirty daily minutes of podcasts, series or articles beats a four-hour weekend cram." },
  { id: 24, skill: "general", title: "Study the band you need", detail: "Read the descriptors for your target band and self-assess real samples against them; vague goals produce vague progress." },
];
