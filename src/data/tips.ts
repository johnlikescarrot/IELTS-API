/**
 * Study and exam tips per skill (plus general strategy).
 *
 * Tips summarise widely taught exam technique in original wording (MIT).
 */

import type { Tip } from "../types.js";

export const tips: readonly Tip[] = [
  {
    id: "tip-001",
    skill: "listening",
    title: "Read ahead during the pauses",
    detail:
      "Use every pause to scan the next ten questions. Underline the words that tell you what kind of answer is coming - a name, a number, a place - so you listen for categories, not just words.",
  },
  {
    id: "tip-002",
    skill: "listening",
    title: "Expect the correction",
    detail:
      "Speakers often correct themselves: 'it opens at nine - sorry, half past'. The second piece of information is almost always the answer, so never commit to your first note until the sentence ends.",
  },
  {
    id: "tip-003",
    skill: "listening",
    title: "Watch the word limit",
    detail:
      "If the instruction says 'NO MORE THAN TWO WORDS', three words score zero even when the content is right. Count every word, including articles, before transferring answers.",
  },
  {
    id: "tip-004",
    skill: "listening",
    title: "Numbers and spelling are free marks",
    detail:
      "Practise distinguishing 13/30 and 14/40, and copying dictated spellings letter by letter. These items test transcription, not comprehension, so drill them until they are automatic.",
  },
  {
    id: "tip-005",
    skill: "listening",
    title: "Do not leave a blank",
    detail:
      "There is no penalty for a wrong answer. If you miss a question, guess from context and move on immediately - dwelling on it costs you the next two answers as well.",
  },
  {
    id: "tip-006",
    skill: "reading",
    title: "Read the questions first",
    detail:
      "Skim the passage for two minutes, then work question-set by question-set. You are reading to locate answers, not to understand everything; the questions are your itinerary.",
  },
  {
    id: "tip-007",
    skill: "reading",
    title: "Learn the difference between FALSE and NOT GIVEN",
    detail:
      "FALSE means the passage states the opposite; NOT GIVEN means the passage says nothing about it. If you cannot point to the sentence that contradicts the statement, the answer is NOT GIVEN.",
  },
  {
    id: "tip-008",
    skill: "reading",
    title: "Keyword, then synonym",
    detail:
      "Find a distinctive keyword in the question, then expect the passage to express it with a synonym - 'cheap' becomes 'affordable', 'banned' becomes 'prohibited'. You are matching meaning, not words.",
  },
  {
    id: "tip-009",
    skill: "reading",
    title: "Do the easy sets first",
    detail:
      "Passages get harder, not the clock. If a question set stalls you, mark it and move on; three easy questions later in the paper are worth more than one hard one now.",
  },
  {
    id: "tip-010",
    skill: "reading",
    title: "Check completion answers against the instructions",
    detail:
      "Hyphenated words count as one word, and 'a' and 'the' count. After finishing a set, re-read the word limit and verify every answer fits it and reads grammatically.",
  },
  {
    id: "tip-011",
    skill: "writing",
    title: "Answer the actual question",
    detail:
      "Underline the task words: 'discuss both views', 'to what extent', 'advantages outweigh disadvantages'. Every paragraph must serve that instruction; essays fail more often for irrelevance than for grammar.",
  },
  {
    id: "tip-012",
    skill: "writing",
    title: "Plan for five minutes, write for thirty",
    detail:
      "A four-line plan (position, two main ideas, example, conclusion) pays for itself. Unplanned essays repeat themselves and run out of ideas halfway through paragraph three.",
  },
  {
    id: "tip-013",
    skill: "writing",
    title: "One idea per paragraph",
    detail:
      "Topic sentence, explanation, example, link back. A paragraph that makes one point persuasively scores far higher than one that lists five points shallowly.",
  },
  {
    id: "tip-014",
    skill: "writing",
    title: "In Task 1, report - do not explain",
    detail:
      "Never speculate about why the data changed. Describe the main trends, compare the biggest and smallest values, and keep every sentence anchored to what is actually shown.",
  },
  {
    id: "tip-015",
    skill: "writing",
    title: "Leave three minutes to proofread",
    detail:
      "Most lost marks in otherwise strong essays come from careless slips: missing third-person '-s', articles, and spelling. A final scan for your own known errors is the cheapest revision there is.",
  },
  {
    id: "tip-016",
    skill: "speaking",
    title: "Speak in ideas, not sentences",
    detail:
      "Examiners reward developed answers. Aim for two or three sentences per Part 1 answer: answer, then add a reason, example, or contrast ('but', 'although', 'which is why').",
  },
  {
    id: "tip-017",
    skill: "speaking",
    title: "Use the cue card minute",
    detail:
      "Write only notes - nouns and verbs, not sentences. One word per bullet, plus one extra detail you can expand if time remains, keeps your talk structured and fluent.",
  },
  {
    id: "tip-018",
    skill: "speaking",
    title: "Paraphrase instead of pausing",
    detail:
      "When a word escapes you, describe your way around it: 'the tool you use to... '. Fluency is the ability to keep going; hesitation while searching for the perfect word costs more than a simple substitute.",
  },
  {
    id: "tip-019",
    skill: "speaking",
    title: "It is fine to disagree with the examiner",
    detail:
      "Part 3 tests argument, not agreement. A polite 'I am not sure that is true, because...' followed by two reasons shows exactly the discourse-management skill the band descriptors reward.",
  },
  {
    id: "tip-020",
    skill: "speaking",
    title: "Show range deliberately",
    detail:
      "Each answer should contain one attempt at a rarer structure - a conditional, a passive, or a collocation from your study list. Deliberate, sparing use beats memorised speeches.",
  },
  {
    id: "tip-021",
    skill: "general",
    title: "Know the band descriptors",
    detail:
      "Read the public versions of the writing and speaking band descriptors once. Knowing exactly what 'coherence' or 'lexical resource' means turns vague feedback into a checklist.",
  },
  {
    id: "tip-022",
    skill: "general",
    title: "Practise under exam timing",
    detail:
      "Do at least two full practice tests with a clock and no dictionary before exam day. Stamina and pacing are skills, and the exam rewards rehearsed routines.",
  },
  {
    id: "tip-023",
    skill: "general",
    title: "Keep an error log",
    detail:
      "After each practice task, write down every mistake and its correction, then re-test yourself on last week's list weekly. Fixing repeated personal errors raises band scores faster than learning new material.",
  },
  {
    id: "tip-024",
    skill: "general",
    title: "Immerse passively",
    detail:
      "Podcasts, radio news and documentaries in English tune your ear for free, at zero study cost. Choose topics you already enjoy: attention drives retention.",
  },
];
