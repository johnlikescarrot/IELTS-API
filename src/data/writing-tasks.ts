/**
 * A corpus of IELTS Writing prompts covering both modules and both tasks.
 *
 * The prompts are original items written to match the published task types,
 * timing and word minima, so the corpus can be redistributed under this
 * project's MIT licence without inheriting third-party restrictions.
 *
 * @packageDocumentation
 */

import type { Module } from "../core/types.ts";

/** Task 1 and Task 2 question formats recognised by the corpus. */
export const WRITING_TASK_TYPES = [
  "line-graph",
  "bar-chart",
  "pie-chart",
  "table",
  "process-diagram",
  "map",
  "mixed-charts",
  "formal-letter",
  "semi-formal-letter",
  "informal-letter",
  "opinion",
  "discussion",
  "advantages-disadvantages",
  "problem-solution",
  "two-part-question",
] as const;

/** A Writing task format. */
export type WritingTaskType = (typeof WRITING_TASK_TYPES)[number];

/** A single Writing prompt. */
export interface WritingTask {
  /** Stable identifier. */
  readonly id: string;
  /** The module the prompt belongs to. */
  readonly module: Module;
  /** Task number: 1 or 2. */
  readonly task: 1 | 2;
  /** The question format. */
  readonly type: WritingTaskType;
  /** Broad subject area. */
  readonly topic: string;
  /** The prompt shown to the candidate. */
  readonly prompt: string;
  /** Minimum word count required by the rubric. */
  readonly minimumWords: number;
  /** Recommended time allocation in minutes. */
  readonly recommendedMinutes: number;
}

function task(
  id: string,
  module: Module,
  taskNumber: 1 | 2,
  type: WritingTaskType,
  topic: string,
  prompt: string,
): WritingTask {
  return {
    id,
    module,
    task: taskNumber,
    type,
    topic,
    prompt,
    minimumWords: taskNumber === 1 ? 150 : 250,
    recommendedMinutes: taskNumber === 1 ? 20 : 40,
  };
}

/** Every Writing prompt in the corpus. */
export const WRITING_TASKS: readonly WritingTask[] = Object.freeze([
  task(
    "ac-t1-01",
    "academic",
    1,
    "line-graph",
    "energy",
    "The line graph shows the share of electricity generated from coal, gas, nuclear and renewable sources in four countries between 1990 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-02",
    "academic",
    1,
    "bar-chart",
    "education",
    "The bar chart compares the proportion of school leavers entering university, vocational training and full-time employment in six regions in 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-03",
    "academic",
    1,
    "pie-chart",
    "household spending",
    "The pie charts show how an average household in one city divided its monthly expenditure in 1980 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-04",
    "academic",
    1,
    "table",
    "transport",
    "The table gives information about the number of journeys made by rail, bus, private car and bicycle in a European country in five selected years. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-05",
    "academic",
    1,
    "process-diagram",
    "manufacturing",
    "The diagram illustrates the process by which recycled glass is collected, sorted and turned into new bottles. Summarise the information by selecting and reporting the main features.",
  ),
  task(
    "ac-t1-06",
    "academic",
    1,
    "map",
    "urban development",
    "The two maps show a coastal town in 1975 and in the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-07",
    "academic",
    1,
    "mixed-charts",
    "health",
    "The bar chart shows the number of hospital admissions for four conditions, and the pie chart shows the distribution of health-service funding, in one country in 2019. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "ac-t1-08",
    "academic",
    1,
    "line-graph",
    "population",
    "The line graph shows the percentage of the population aged 65 and over in Japan, Sweden and Brazil between 1960 and 2050, with projections after 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  ),
  task(
    "gt-t1-01",
    "general-training",
    1,
    "formal-letter",
    "employment",
    "You recently attended an interview for a position that was advertised online, but you have not received a reply. Write a letter to the head of recruitment. In your letter, say when and where the interview took place, explain why you are still interested in the position, and ask when a decision will be made.",
  ),
  task(
    "gt-t1-02",
    "general-training",
    1,
    "semi-formal-letter",
    "housing",
    "The heating in the flat you rent has broken down twice this winter. Write a letter to your landlord. In your letter, describe what has happened, explain how it has affected you, and say what you would like the landlord to do.",
  ),
  task(
    "gt-t1-03",
    "general-training",
    1,
    "informal-letter",
    "travel",
    "A friend from another country is going to visit your city for a week. Write a letter to your friend. In your letter, suggest when they should come, describe two places you plan to take them to, and explain what they should bring.",
  ),
  task(
    "gt-t1-04",
    "general-training",
    1,
    "formal-letter",
    "consumer",
    "You bought a household appliance online and it arrived damaged. Write a letter to the customer service manager. In your letter, give details of your order, describe the damage, and say what action you expect the company to take.",
  ),
  task(
    "t2-01",
    "academic",
    2,
    "opinion",
    "technology",
    "Some people believe that governments should invest public money in space exploration rather than in solving problems on Earth. To what extent do you agree or disagree?",
  ),
  task(
    "t2-02",
    "academic",
    2,
    "discussion",
    "education",
    "Some educators argue that every child should learn a second language from the age of five, while others believe that primary schools should concentrate on literacy and numeracy. Discuss both views and give your own opinion.",
  ),
  task(
    "t2-03",
    "academic",
    2,
    "advantages-disadvantages",
    "work",
    "An increasing number of employees now work from home for most of the week. Do the advantages of this development outweigh the disadvantages?",
  ),
  task(
    "t2-04",
    "academic",
    2,
    "problem-solution",
    "environment",
    "Traffic congestion in large cities continues to worsen despite investment in public transport. What are the main causes of this problem, and what measures could be taken to address it?",
  ),
  task(
    "t2-05",
    "academic",
    2,
    "two-part-question",
    "society",
    "In many countries people are living alone in greater numbers than ever before. Why is this happening, and is it a positive or a negative development?",
  ),
  task(
    "t2-06",
    "academic",
    2,
    "opinion",
    "health",
    "Some people think that governments should tax unhealthy food in the same way that they tax tobacco. To what extent do you agree or disagree?",
  ),
  task(
    "t2-07",
    "academic",
    2,
    "discussion",
    "culture",
    "Some people believe that museums should charge no entrance fee because they serve the public good, while others argue that visitors should contribute to their upkeep. Discuss both views and give your own opinion.",
  ),
  task(
    "t2-08",
    "academic",
    2,
    "problem-solution",
    "employment",
    "Automation is expected to replace many routine jobs over the next two decades. What problems could this cause, and what should governments and employers do to prepare?",
  ),
  task(
    "t2-09",
    "general-training",
    2,
    "opinion",
    "community",
    "Some people think that young adults should be required to spend a year doing unpaid community work before starting employment or study. To what extent do you agree or disagree?",
  ),
  task(
    "t2-10",
    "general-training",
    2,
    "advantages-disadvantages",
    "lifestyle",
    "More families are choosing to live in apartments rather than houses with gardens. Do the advantages of this trend outweigh the disadvantages?",
  ),
  task(
    "t2-11",
    "academic",
    2,
    "two-part-question",
    "media",
    "Social media platforms are now the main source of news for many young people. Why has this happened, and what effects does it have on society?",
  ),
  task(
    "t2-12",
    "academic",
    2,
    "opinion",
    "environment",
    "Individual action such as recycling and reducing meat consumption has little effect compared with regulation of industry. To what extent do you agree or disagree?",
  ),
]);

/** Word minimum for a given task number. */
export const MINIMUM_WORDS: Readonly<Record<1 | 2, number>> = Object.freeze({
  1: 150,
  2: 250,
});
