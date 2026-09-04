import type { WritingPrompt } from "../types.ts";

const SUMMARY_SUFFIX =
  "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.";

/**
 * Thirty original practice questions: 12 Academic Task 2 essays, 8 Academic
 * Task 1 reports, 5 General Training Task 1 letters and 5 General Training
 * Task 2 essays.
 */
export const WRITING_PROMPTS: readonly WritingPrompt[] = [
  // ----- Academic Task 2 (w001-w012) -----
  {
    id: "w001",
    module: "academic",
    task: 2,
    type: "opinion",
    prompt:
      "Some people believe that university education should be free for all students. To what extent do you agree or disagree?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w002",
    module: "academic",
    task: 2,
    type: "opinion",
    prompt:
      "Many adults now spend most of their free time online rather than with people in person. Is this a positive or negative development?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w003",
    module: "academic",
    task: 2,
    type: "opinion",
    prompt:
      "Some people argue that governments should spend money on space exploration. To what extent do you agree or disagree?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w004",
    module: "academic",
    task: 2,
    type: "discussion",
    prompt:
      "Some people think that children should start school as early as possible, while others believe they should begin later. Discuss both views and give your own opinion.",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w005",
    module: "academic",
    task: 2,
    type: "discussion",
    prompt:
      "Some people say the best way to protect the environment is through international agreements, while others think change must come from individuals. Discuss both views and give your own opinion.",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w006",
    module: "academic",
    task: 2,
    type: "discussion",
    prompt:
      "Governments should invest in public transport rather than in building new roads. Discuss both views and give your own opinion.",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w007",
    module: "academic",
    task: 2,
    type: "advantages-disadvantages",
    prompt:
      "In many countries, more people are working from home than ever before. Do the advantages of this outweigh the disadvantages?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w008",
    module: "academic",
    task: 2,
    type: "advantages-disadvantages",
    prompt:
      "More and more students choose to study abroad. Do the advantages of studying abroad outweigh the disadvantages?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w009",
    module: "academic",
    task: 2,
    type: "problem-solution",
    prompt:
      "In many cities, traffic congestion is becoming worse. What problems does this cause, and what measures could be taken to solve them?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w010",
    module: "academic",
    task: 2,
    type: "problem-solution",
    prompt:
      "The amount of household waste is rising in many countries. What are the causes of this trend, and what can be done to reduce it?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w011",
    module: "academic",
    task: 2,
    type: "double-question",
    prompt:
      "Many people use social media every day. Why is it so popular, and what effects does it have on relationships?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w012",
    module: "academic",
    task: 2,
    type: "double-question",
    prompt:
      "Some jobs require employees to work very long hours. Why do people accept these jobs, and do the benefits outweigh the drawbacks?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  // ----- Academic Task 1 (w013-w020) -----
  {
    id: "w013",
    module: "academic",
    task: 1,
    type: "chart",
    prompt: `The line graph below shows the number of international students at three universities between 2010 and 2020. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w014",
    module: "academic",
    task: 1,
    type: "chart",
    prompt: `The bar chart shows the percentage of households in one city that recycled their waste in 2005, 2015 and 2025. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w015",
    module: "academic",
    task: 1,
    type: "chart",
    prompt: `The pie charts compare how people in one town travelled to work in 2000 and 2020. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w016",
    module: "academic",
    task: 1,
    type: "table",
    prompt: `The table gives information about average salaries and the cost of living in five cities. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w017",
    module: "academic",
    task: 1,
    type: "process",
    prompt: `The diagram below shows how coffee is produced, from planting to packaging. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w018",
    module: "academic",
    task: 1,
    type: "map",
    prompt: `The two maps below show a town centre in 1990 and the same town centre today. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w019",
    module: "academic",
    task: 1,
    type: "chart",
    prompt: `The chart and table below give information about visitors to a museum over a ten-year period. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w020",
    module: "academic",
    task: 1,
    type: "process",
    prompt: `The diagrams show the life cycle of a species of large fish. ${SUMMARY_SUFFIX}`,
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  // ----- General Training Task 1 (w021-w025) -----
  {
    id: "w021",
    module: "general",
    task: 1,
    type: "letter-formal",
    prompt:
      "You recently bought a laptop online, but it arrived damaged. Write a letter to the company. In your letter: describe the laptop you bought, explain the damage, and say what you want the company to do.",
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w022",
    module: "general",
    task: 1,
    type: "letter-semi-formal",
    prompt:
      "Your neighbour has asked you to look after their cat while they are on holiday. Write a letter to your neighbour. In your letter: agree to help, ask about anything you need to know, and offer to keep them updated.",
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w023",
    module: "general",
    task: 1,
    type: "letter-informal",
    prompt:
      "A friend has invited you to visit them next month, but you cannot go. Write a letter to your friend. In your letter: thank them for the invitation, explain why you cannot visit, and suggest another time.",
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w024",
    module: "general",
    task: 1,
    type: "letter-formal",
    prompt:
      "You have just moved into a new flat and have discovered several problems. Write a letter to your landlord. In your letter: describe the problems, explain how they affect you, and say what you would like the landlord to do.",
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  {
    id: "w025",
    module: "general",
    task: 1,
    type: "letter-informal",
    prompt:
      "You have recently started a new hobby. Write a letter to an English-speaking friend. In your letter: describe the hobby, explain how you started it, and invite them to try it with you.",
    recommendedTimeMinutes: 20,
    wordTarget: 150,
  },
  // ----- General Training Task 2 (w026-w030) -----
  {
    id: "w026",
    module: "general",
    task: 2,
    type: "discussion",
    prompt:
      "Some people prefer to live in a big city, while others prefer life in the countryside. Discuss both views and give your own opinion.",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w027",
    module: "general",
    task: 2,
    type: "advantages-disadvantages",
    prompt:
      "Nowadays people often move far away from their home town for work. Do you think the advantages of this outweigh the disadvantages?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w028",
    module: "general",
    task: 2,
    type: "opinion",
    prompt:
      "Many people now communicate more online than face to face. Do you think this is a positive or negative development?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w029",
    module: "general",
    task: 2,
    type: "double-question",
    prompt:
      "More and more people are choosing to delay retirement. Why is this happening, and do you think it is a positive trend?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
  {
    id: "w030",
    module: "general",
    task: 2,
    type: "problem-solution",
    prompt:
      "In many countries, young people find it difficult to afford their own home. What are the causes of this problem, and what solutions can you suggest?",
    recommendedTimeMinutes: 40,
    wordTarget: 250,
  },
];
