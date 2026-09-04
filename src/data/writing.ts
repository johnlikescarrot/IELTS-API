/**
 * A curated bank of original IELTS-style writing prompts and the building
 * blocks used by the seeded prompt generator. Every prompt is written from
 * scratch for this project so the data carries no copyrighted test material.
 */
import type { PromptKind, TestModule, WritingTaskNumber } from "../lib/types.js";

export interface WritingPrompt {
  id: string;
  task: WritingTaskNumber;
  kind: PromptKind;
  module: TestModule | "both";
  category: string;
  title: string;
  prompt: string;
  tips: string;
}

export const WRITING_PROMPTS: readonly WritingPrompt[] = [
  // ------------------------------------------------------------------ Task 2
  {
    id: "t2-education-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Education",
    title: "University funding",
    prompt:
      "Some people believe that university education should be free for everyone, while others argue that students should pay for their own higher education. Discuss both views and give your own opinion.",
    tips: "Give equal treatment to both sides before stating a clear opinion in the conclusion. Use real examples of how fees affect access.",
  },
  {
    id: "t2-education-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Education",
    title: "Homework in schools",
    prompt:
      "Homework is considered essential by many schools, yet some argue it places unnecessary pressure on children. To what extent do you agree or disagree that homework should be reduced?",
    tips: "Take a clear position early and keep it consistent. Weigh the purpose of homework against its burden on family time.",
  },
  {
    id: "t2-technology-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Technology",
    title: "Impact of the internet",
    prompt:
      "The internet has transformed how people communicate and obtain information. Some think this change has been overwhelmingly positive, while others believe it has weakened social relationships. Discuss both views and give your opinion.",
    tips: "Define what you mean by communication and relationships. Support claims with concrete, everyday examples rather than generalisations.",
  },
  {
    id: "t2-technology-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Technology",
    title: "Automation and jobs",
    prompt:
      "Advances in automation and artificial intelligence will make many current jobs disappear. Some argue that this is a serious threat to employment, while others believe it will create new opportunities. Discuss both perspectives.",
    tips: "Distinguish short-term disruption from long-term change. Avoid overstating either a dystopian or utopian future.",
  },
  {
    id: "t2-environment-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Environment",
    title: "Individual vs. government action",
    prompt:
      "Some people believe that individuals cannot make a meaningful difference to environmental problems and that only governments and large companies can. To what extent do you agree or disagree?",
    tips: "You can partially agree. Clearly separate the scale of responsibility between individuals, companies and governments.",
  },
  {
    id: "t2-environment-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Environment",
    title: "Plastic and packaging",
    prompt:
      "Many everyday products are wrapped in excessive packaging that harms the environment. Some people propose laws to limit packaging, while others think consumer choice should decide. Discuss both views.",
    tips: "Consider cost, convenience and environmental impact together. A balanced discussion is stronger than one-sided praise of regulation.",
  },
  {
    id: "t2-society-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Society",
    title: "Ageing populations",
    prompt:
      "In many countries the population is ageing rapidly. Some see this as a serious economic problem, while others view it as an opportunity for society. Discuss both views and give your own opinion.",
    tips: "Link to healthcare, pensions and the labour market. Avoid generalising about all older people.",
  },
  {
    id: "t2-society-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Society",
    title: "Urban versus rural life",
    prompt:
      "More people than ever live in cities, and rural communities are shrinking. Some believe this trend is inevitable and positive, while others argue that governments should act to keep rural areas alive. Discuss both sides.",
    tips: "Compare quality of life, services and opportunity. Use one well-developed example for each side.",
  },
  {
    id: "t2-health-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Health",
    title: "Prevention versus treatment",
    prompt:
      "Some governments spend most of their health budget treating illness rather than preventing it. To what extent do you agree that more money should be spent on prevention?",
    tips: "Make prevention concrete (vaccination, exercise, diet). Acknowledge that treatment cannot be ignored while arguing for rebalancing.",
  },
  {
    id: "t2-health-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Health",
    title: "Advertising unhealthy food",
    prompt:
      "Advertising of sugary and fatty foods is often blamed for rising obesity. Some people want these adverts banned, especially those aimed at children. Do the benefits of a ban outweigh the drawbacks?",
    tips: "Address freedom of speech and industry choice on one side and public health on the other. Give a reasoned verdict.",
  },
  {
    id: "t2-culture-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Culture & Globalisation",
    title: "Tourism and local culture",
    prompt:
      "International tourism has grown enormously and brings money to many regions, but some argue that it erodes local traditions. Discuss both the advantages and disadvantages of mass tourism.",
    tips: "Separate economic benefits from cultural costs. A clear paragraph structure for advantages and disadvantages works well here.",
  },
  {
    id: "t2-culture-02",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Culture & Globalisation",
    title: "Preserving minority languages",
    prompt:
      "Hundreds of minority languages disappear every year. Some argue that resources should not be wasted trying to save them, while others believe every language is part of world heritage. Discuss both views and give your opinion.",
    tips: "Show awareness of identity, history and practical cost. Avoid romanticising either outcome.",
  },
  {
    id: "t2-crime-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Crime & Justice",
    title: "Prison versus rehabilitation",
    prompt:
      "Many people believe prison is the best punishment for crime, while others argue that rehabilitation and education prevent reoffending more effectively. Discuss both views and give your opinion.",
    tips: "Distinguish violent from non-violent offences. Connect your argument to rates of reoffending.",
  },
  {
    id: "t2-media-01",
    task: 2,
    kind: "essay",
    module: "both",
    category: "Media",
    title: "Social media and news",
    prompt:
      "More people now get their news from social media than from traditional outlets. Some argue this improves access to information, while others worry about accuracy and trust. Discuss both views.",
    tips: "Compare speed and reach with verification and editorial standards. Offer a balanced final judgement.",
  },
  // ------------------------------------------------- Task 1 Academic (report)
  {
    id: "t1a-report-01",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Data description",
    title: "Line graph: energy use",
    prompt:
      "The line graph shows the amount of electricity used by households in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Describe overall trends first, then significant details. Do not give reasons for the data; only report what you see.",
  },
  {
    id: "t1a-report-02",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Data description",
    title: "Bar chart: transport",
    prompt:
      "The bar chart illustrates how people in one city travelled to work in 2010 and 2022. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Group categories that changed in similar ways. Use comparative and superlative language accurately.",
  },
  {
    id: "t1a-report-03",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Data description",
    title: "Pie charts: energy sources",
    prompt:
      "The two pie charts compare the sources of electricity in a country in 2005 and 2020. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Report proportions rather than invented absolute numbers. Mention the most striking changes explicitly.",
  },
  {
    id: "t1a-report-04",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Process & diagram",
    title: "Process: bottled water",
    prompt:
      "The diagram shows the stages of production of bottled drinking water. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Describe the sequence in a logical order and use sequencing language. Avoid introducing opinions.",
  },
  {
    id: "t1a-report-05",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Data description",
    title: "Table: population change",
    prompt:
      "The table shows the population of five cities in 2000 and 2030, and the projected percentage change. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Choose the cities worth highlighting rather than listing every cell. Compare the projected change, not just current size.",
  },
  {
    id: "t1a-report-06",
    task: 1,
    kind: "report",
    module: "academic",
    category: "Process & diagram",
    title: "Map: town development",
    prompt:
      "The two maps show a town centre in 2005 and in the present day. Summarise the information by selecting and reporting the main features and make comparisons where relevant.",
    tips: "Describe what has been added, removed and changed in location terms. Use prepositions of place precisely.",
  },
  // ------------------------------------------- Task 1 General Training (letter)
  {
    id: "t1g-letter-01",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Formal letter",
    title: "Complaint letter",
    prompt:
      "You recently bought an item online which arrived damaged. Write a letter to the company. In your letter, explain what you ordered, describe the problem, and say what you expect the company to do.",
    tips: "Open and close formally. State the facts calmly, describe the damage clearly and end with a reasonable request.",
  },
  {
    id: "t1g-letter-02",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Formal letter",
    title: "Job application",
    prompt:
      "You saw an advertisement for a part-time job that suits you. Write a letter applying for the position. In your letter, say why you are writing, describe your relevant experience, and explain why you would be suitable.",
    tips: "Keep it professional and positive. Show how your skills match the role rather than repeating the advert.",
  },
  {
    id: "t1g-letter-03",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Semi-formal letter",
    title: "Request to a landlord",
    prompt:
      "You have noticed a problem in the flat you rent, such as a leaking tap. Write a letter to your landlord. In your letter, describe the problem, explain why it needs fixing soon, and suggest when it could be repaired.",
    tips: "Be polite and clear. Give a specific reason for urgency and propose a flexible time for the repair.",
  },
  {
    id: "t1g-letter-04",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Informal letter",
    title: "Invitation to a friend",
    prompt:
      "You are planning a weekend trip and want a friend to join you. Write a letter to your friend. In your letter, describe the trip and dates, explain why you would like them to come, and suggest what you could do together.",
    tips: "Sound warm and natural. Give enough detail to make the invitation appealing without overloading.",
  },
  {
    id: "t1g-letter-05",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Informal letter",
    title: "Thanks for a stay",
    prompt:
      "You recently stayed at a friend's house for a few days. Write a letter to thank them. In your letter, thank your friend, say what you enjoyed most, and invite them to visit you soon.",
    tips: "Match the tone of an informal letter. Include specific, warm details and a clear invitation.",
  },
  {
    id: "t1g-letter-06",
    task: 1,
    kind: "letter",
    module: "general",
    category: "Formal letter",
    title: "Lost property enquiry",
    prompt:
      "You left a bag on a train and wish to recover it. Write a letter to the railway's lost-property office. In your letter, describe when and where you lost it, describe the bag and its contents, and ask what you should do next.",
    tips: "Be precise about time, train and carriage. Describe the bag so it is easy to identify without risking security.",
  },
];

/** Topics (broad categories) drawn on by the essay generator. */
export const ESSAY_TOPIC_POOL: readonly string[] = [
  "the future of work",
  "how cities will change",
  "the role of education in society",
  "protecting the natural environment",
  "the influence of social media",
  "public health and lifestyle",
  "the balance between tradition and change",
  "global travel and cultural exchange",
];

/** Framing skeletons used to assemble unique essay prompts. */
export const ESSAY_FRAMES: readonly string[] = [
  "Some people believe that {topic} is best handled by governments, while others think individuals should take responsibility. Discuss both views and give your own opinion.",
  "In recent years there has been growing debate about {topic}. Some argue the changes are positive, while others are more concerned. Discuss both perspectives and give your own view.",
  "It is often said that {topic} will shape our future in important ways. To what extent do you agree or disagree with this statement?",
  "Many people hold strong opinions about {topic}. Present the arguments on both sides and conclude with your own reasoned position.",
  "There is a view that {topic} deserves more public attention and funding. Others disagree. Discuss both sides of this argument and state your opinion.",
];

/** Categories present in the curated bank, used for validation. */
export const WRITING_CATEGORIES: readonly string[] = [
  ...new Set(WRITING_PROMPTS.map((prompt) => prompt.category)),
];

/** Retrieve a single writing prompt by id. */
export function getWritingPrompt(id: string): WritingPrompt | undefined {
  return WRITING_PROMPTS.find((prompt) => prompt.id === id);
}

/** A concise how-to guide for each Writing task, keyed by test variant. */
export interface WritingTaskGuideEntry {
  task: WritingTaskNumber;
  module: TestModule | "both";
  title: string;
  wordGoal: number;
  recommendedMinutes: number;
  approach: string;
}

/** Descriptive guide used by the `/v1/writing/tasks` endpoint. */
export const WRITING_TASK_GUIDE: readonly WritingTaskGuideEntry[] = [
  {
    task: 1,
    module: "academic",
    title: "Task 1 – Academic report",
    wordGoal: 150,
    recommendedMinutes: 20,
    approach:
      "Summarise and compare data from a graph, chart, table, map or process " +
      "without offering opinions about it.",
  },
  {
    task: 1,
    module: "general",
    title: "Task 1 – Letter",
    wordGoal: 150,
    recommendedMinutes: 20,
    approach:
      "Write a letter (formal, semi-formal or informal) covering every bullet " +
      "point in the prompt in a style that suits the situation.",
  },
  {
    task: 2,
    module: "both",
    title: "Task 2 – Essay",
    wordGoal: 250,
    recommendedMinutes: 40,
    approach:
      "Write a well-organised discursive essay in response to a point of view, " +
      "argument or problem, supporting your position with reasons and examples.",
  },
];
