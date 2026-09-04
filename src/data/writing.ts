import type { WritingTask } from "../types.js";

/**
 * Sample IELTS writing tasks with band-9 model answers. These are original,
 * free-to-use study materials written for this project.
 */
export const writingTasks: WritingTask[] = [
  {
    id: "writing-t2-education-1",
    task: 2,
    topicId: "education",
    question:
      "Some people believe that university education should be free for all students. To what extent do you agree or disagree?",
    type: "opinion",
    sampleBand: 9,
    modelAnswer:
      "A university education is often described as a ticket to a better life. While the idea of tuition-free universities is attractive, I believe it is neither financially sustainable nor the best way to allocate limited public resources.\n\nProponents of free tuition argue that education is a public good. When costs are removed, students from disadvantaged backgrounds are able to attend, and society as a whole benefits from a more skilled workforce. Indeed, a nation that educates its brightest regardless of income is likely to enjoy stronger economic growth and social mobility.\n\nHowever, free tuition carries significant drawbacks. First, it is enormously expensive. Governments must either raise taxes or divert funds from hospitals and infrastructure. Second, charging nothing can reduce the perceived value of a degree, leading to lower motivation and higher dropout rates. Third, it is regressive: many individuals who attend university go on to earn high salaries, so asking them to contribute is fairer than forcing taxpayers to subsidise the wealthy.\n\nA more balanced approach is to keep tuition fees modest and fund them through income-contingent loans, so the cost is repaid only when a graduate earns enough. Combined with generous bursaries for the poorest students, this preserves access without bankrupting the state.\n\nIn conclusion, although free education is a noble aspiration, it is impractical. A better solution is affordable, loan-supported tuition that protects access while ensuring fairness and fiscal responsibility.",
    bandDescriptors: [
      "Fully addresses the task with a clear position",
      "Uses precise, less common vocabulary",
      "Uses a range of complex structures accurately",
      "Coherent paragraphs with effective linking",
    ],
  },
  {
    id: "writing-t2-environment-1",
    task: 2,
    topicId: "environment",
    question:
      "Some people think that individual actions, such as recycling, have little effect on climate change. Others believe that individuals must change their behaviour. Discuss both views and give your own opinion.",
    type: "discussion",
    sampleBand: 9,
    modelAnswer:
      "Climate change is the defining challenge of our era, and the role of the individual is fiercely debated. While individual actions alone cannot solve the crisis, they are indispensable as catalysts for systemic change.\n\nThose who doubt the value of personal action point to the scale of the problem. A single household recycling or cycling to work is insignificant next to the emissions of a coal plant or an oil company. They argue that responsibility rests primarily with governments and corporations, which must legislate and innovate at scale. This view is not without merit: without binding agreements, no amount of personal virtue will reduce global temperatures.\n\nNevertheless, I believe individual behaviour matters more than its detractors admit. Consumer choices create demand signals that shape markets. When millions of people choose plant-based food, reuse, buy renewable energy, or fly less, businesses respond. Furthermore, lifestyle change builds political will; a public that values sustainability votes for leaders who legislate for it. In this way, personal and systemic action are not rivals but allies.\n\nIn my opinion, the most effective approach is a combination. Individuals should reduce unnecessary consumption where they can, while simultaneously pressing for stronger regulation. The former creates a moral mandate for the latter.\n\nIn conclusion, individual action is not a substitute for structural reform, but it is an essential precondition for it. Both are needed to confront the climate emergency.",
    bandDescriptors: [
      "Discusses both views and states a clear opinion",
      "Uses topic-specific, high-level vocabulary",
      "Accurate complex structures",
      "Cohesive and well-organised argument",
    ],
  },
  {
    id: "writing-t1-tech-1",
    task: 1,
    topicId: "technology",
    question:
      "The chart below shows the percentage of households with internet access in three countries between 2000 and 2010. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    type: "data",
    sampleBand: 9,
    modelAnswer:
      "The bar chart compares the proportion of homes with an internet connection in three countries over a decade from 2000 to 2010.\n\nOverall, internet penetration rose in all three countries, though growth was uneven. The United States remained the leader throughout, while Brazil, which started last, recorded the most dramatic increase.\n\nIn 2000, internet access was most widespread in the United States, at approximately 60%, compared with about 40% in the United Kingdom. Brazil lagged far behind, with just under 10% of households connected. By 2005, the United Kingdom had overtaken the United States, reaching about 80%.\n\nBy 2010, the picture had changed further. The United Kingdom reached nearly 85%, while the United States also continued to rise to around 80%. Brazil's growth was the most striking: access surged to roughly 70%, narrowing the gap with the other two countries considerably.\n\nIn summary, all three nations saw substantial growth in household internet access, with the United Kingdom and Brazil improving fastest, while the United States maintained a consistently high level of connectivity.",
    bandDescriptors: [
      "Selects and reports the main features",
      "Makes clear comparisons",
      "Uses data vocabulary precisely",
      "Accurate complex sentences",
    ],
  },
];

/** Return writing tasks, optionally filtered by task type and topic. */
export function getWritingTasks(task?: 1 | 2, topicId?: string): WritingTask[] {
  return writingTasks.filter((item) => {
    const taskMatch = task === undefined || item.task === task;
    const topicMatch = topicId === undefined || item.topicId === topicId;
    return taskMatch && topicMatch;
  });
}

/** Find a single writing task by id. */
export function getWritingTaskById(id: string): WritingTask | undefined {
  return writingTasks.find((item) => item.id === id);
}
