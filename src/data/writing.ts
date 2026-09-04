import type { CommonMistake, Tip, WritingPrompt, WritingSample } from '../types.js';

export const task1Prompts: WritingPrompt[] = [
  {
    id: 't1-01',
    task: 1,
    category: 'line graph',
    prompt:
      'The line graph shows the percentage of households in three cities with internet access between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-02',
    task: 1,
    category: 'bar chart',
    prompt:
      'The bar chart compares the amount of time men and women spent on household tasks in one country in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-03',
    task: 1,
    category: 'pie charts',
    prompt:
      'The pie charts show the sources of electricity in two countries in 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-04',
    task: 1,
    category: 'table',
    prompt:
      'The table shows the number of international students at three universities from 2015 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-05',
    task: 1,
    category: 'process',
    prompt:
      'The diagram shows the stages in recycling plastic bottles. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-06',
    task: 1,
    category: 'map',
    prompt:
      'The maps show the changes to a town library between 2010 and 2023. Summarise the information by selecting and reporting the main changes, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-07',
    task: 1,
    category: 'mixed charts',
    prompt:
      'The bar chart shows coffee consumption per person in five countries, and the table shows the price of one cup in the same countries. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 't1-08',
    task: 1,
    category: 'line graph',
    prompt:
      'The line graph shows average monthly temperatures and rainfall in a coastal city. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    minWords: 150,
    timeMinutes: 20,
  },
];

export const task2Prompts: WritingPrompt[] = [
  {
    id: 't2-01',
    task: 2,
    category: 'opinion',
    prompt:
      'Some people believe that university education should be free for all students. Others think students should pay for their own tuition. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-02',
    task: 2,
    category: 'discussion',
    prompt:
      'Working from home has become common in many industries. Do the advantages of working from home outweigh the disadvantages?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-03',
    task: 2,
    category: 'problem-solution',
    prompt:
      'Traffic congestion is a serious problem in many large cities. What are the causes of this problem, and what measures could governments take to solve it?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-04',
    task: 2,
    category: 'opinion',
    prompt:
      'Some experts suggest that children should begin learning a foreign language in primary school rather than secondary school. Do the advantages of this outweigh the disadvantages?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-05',
    task: 2,
    category: 'two-part question',
    prompt:
      'Many young people now spend too much time on smartphones. Why is this the case? What effects does this have on young people and society?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-06',
    task: 2,
    category: 'opinion',
    prompt:
      'Some people think that protecting the environment should be the top priority for governments, even if it slows economic growth. To what extent do you agree or disagree?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-07',
    task: 2,
    category: 'discussion',
    prompt:
      'Some people prefer to live in a small town, while others prefer to live in a big city. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-08',
    task: 2,
    category: 'advantage-disadvantage',
    prompt:
      'International tourism has grown rapidly in recent decades. Do the advantages of international tourism outweigh its disadvantages?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-09',
    task: 2,
    category: 'problem-solution',
    prompt:
      'Obesity rates are rising in many countries. What are the causes of this trend, and what can be done to reverse it?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 't2-10',
    task: 2,
    category: 'opinion',
    prompt:
      'Some people believe that zoos are cruel and should be closed, while others think zoos play an important role in conservation. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
  },
];

export const writingSamples: WritingSample[] = [
  {
    id: 's-01',
    task: 2,
    title: 'Free university education (band 8 sample)',
    promptId: 't2-01',
    band: 8,
    essay:
      'Access to university education is widely debated. While some argue that governments should fund tuition for everyone, others believe students themselves should pay. This essay will discuss both views before giving my own opinion. Supporters of free tuition argue that it promotes equality. Talented students from poor families can study without the burden of debt, which benefits society through a skilled workforce. For example, countries with low tuition often report higher enrolment among disadvantaged groups. On the other hand, critics point out that free education is expensive for taxpayers and may reduce university funding. If students contribute, universities can invest more in teaching and research, and learners may take their studies more seriously. In my opinion, a middle path is best. Basic tuition could be subsidised for all, with extra support for low-income students, while graduates repay part of the cost once employed. In conclusion, both arguments have merit, but a balanced funding model protects fairness without weakening university quality.',
    cohesionNotes:
      'Clear four-paragraph structure; contrast linkers (while, on the other hand); opinion stated in introduction and conclusion.',
  },
  {
    id: 's-02',
    task: 2,
    title: 'Working from home (band 7 sample)',
    promptId: 't2-02',
    band: 7,
    essay:
      'Remote work has grown quickly, and people disagree about its value. This essay argues that its benefits are greater than its drawbacks. The main advantage is flexibility. Employees save commuting time and can organise their day around family needs, which often raises satisfaction and productivity. Companies also save money on office space. However, there are disadvantages. Home workers may feel isolated and find it harder to separate work from rest. Communication can also be slower without face-to-face meetings. Nevertheless, these problems can be managed with regular video calls and clear schedules. In conclusion, although remote work brings challenges such as isolation, the gains in flexibility, cost and work-life balance outweigh them.',
    cohesionNotes:
      'Position clear throughout; paragraphs each carry one idea; range of linkers with occasional repetition.',
  },
  {
    id: 's-03',
    task: 1,
    title: 'Internet access line graph (band 8 sample)',
    promptId: 't1-01',
    band: 8,
    essay:
      'The line graph compares household internet access in three cities from 2000 to 2020. Overall, access rose sharply in all three cities, although City A remained ahead throughout the period. In 2000, about 40% of homes in City A had internet, compared with roughly 25% in City B and 15% in City C. Over the next decade, all figures climbed steadily, with City C growing fastest and overtaking City B around 2012. By 2020, access in City A reached nearly 95%, while Cities B and C stood at approximately 85% and 80% respectively. In summary, the gap between the cities narrowed considerably as internet use became almost universal.',
    cohesionNotes:
      'Overview with overall trends; data grouped logically; comparisons without listing every figure.',
  },
  {
    id: 's-04',
    task: 1,
    title: 'Plastic bottle recycling process (band 7 sample)',
    promptId: 't1-05',
    band: 7,
    essay:
      'The diagram shows how plastic bottles are recycled. Overall, the process has six main stages, from collection to the manufacture of new products. First, used bottles are collected and transported to a recycling plant. Next, they are sorted by type and washed to remove labels and dirt. The clean plastic is then shredded into small flakes, melted, and formed into pellets. Finally, the pellets are used to make new bottles and other plastic goods. In short, recycling turns waste bottles into raw material through sorting, cleaning, shredding and remoulding.',
    cohesionNotes:
      'Passive voice for process steps; sequencers used naturally; overview identifies number of stages.',
  },
  {
    id: 's-05',
    task: 2,
    title: 'Traffic congestion causes and solutions (band 8 sample)',
    promptId: 't2-03',
    band: 8,
    essay:
      'Congestion troubles many growing cities. This essay will examine its main causes and suggest practical solutions. One major cause is rapid urbanisation combined with car dependence. As incomes rise, more families buy cars while public transport remains crowded or unreliable, so roads fill quickly. A second cause is poor planning, such as offices concentrated in one district and school runs overlapping with rush hour. Governments can respond in several ways. Investing in frequent, affordable public transport gives commuters a real alternative to driving. Congestion charges and parking limits in city centres can further discourage car use, while flexible working hours spread peak demand. To conclude, congestion grows when car ownership outpaces transport planning, but better public services, pricing measures and flexible schedules can relieve it.',
    cohesionNotes:
      'Two causes then three solutions, each extended; problem-solution vocabulary precise.',
  },
  {
    id: 's-06',
    task: 2,
    title: 'Tourism advantages outweigh drawbacks (band 7 sample)',
    promptId: 't2-08',
    band: 7,
    essay:
      'International tourism keeps expanding, bringing both benefits and problems. I believe the positives are stronger. Tourism creates jobs in hotels, restaurants and transport, and earns foreign currency for developing regions. It also builds cultural understanding when visitors and hosts meet directly. Admittedly, mass tourism can damage historic sites and disturb local life, while flights add to carbon emissions. Yet these harms can be reduced through visitor limits, eco-taxes and investment in cleaner transport. Therefore, with sensible management, tourism’s economic and cultural gains clearly outweigh its environmental costs.',
    cohesionNotes:
      'Opinion signposted; concession paragraph handles the other side briefly but fairly.',
  },
];

export const writingTips: Tip[] = [
  {
    id: 'wt-01',
    title: 'Answer every part of the question',
    detail:
      'Underline the instruction words (discuss, to what extent, why, what effects) and check each one is covered before you finish.',
  },
  {
    id: 'wt-02',
    title: 'Plan for 3–5 minutes',
    detail:
      'List two main ideas with one example each. A short plan prevents repetition and keeps paragraphs balanced.',
  },
  {
    id: 'wt-03',
    title: 'Write a real overview in Task 1',
    detail:
      'Summarise the overall trends or stages in 1–2 sentences without data. Reports without an overview lose marks for task achievement.',
  },
  {
    id: 'wt-04',
    title: 'Keep Task 1 objective',
    detail:
      'Report what the chart shows. Do not explain causes or give opinions in Task 1.',
  },
  {
    id: 'wt-05',
    title: 'One central idea per paragraph',
    detail:
      'Start each body paragraph with a clear topic sentence, then extend it with explanation and a concrete example.',
  },
  {
    id: 'wt-06',
    title: 'Develop with examples, not lists',
    detail:
      'One specific, realistic example per idea is more persuasive than three vague claims.',
  },
  {
    id: 'wt-07',
    title: 'Vary your sentence structures',
    detail:
      'Mix simple, compound and complex sentences. Use relative clauses, conditionals and passive forms where natural.',
  },
  {
    id: 'wt-08',
    title: 'Use cohesive devices sparingly',
    detail:
      'Prefer natural links (this means, as a result, for instance) over memorised chains of moreover/furthermore.',
  },
  {
    id: 'wt-09',
    title: 'Watch your word count',
    detail:
      'Aim for 160–190 words in Task 1 and 260–290 in Task 2. Short answers are penalised; very long ones invite errors.',
  },
  {
    id: 'wt-10',
    title: 'Save 3 minutes to check',
    detail:
      'Scan for articles, plural nouns, verb tenses and subject-verb agreement — the errors that cost the most.',
  },
];

export const commonMistakes: CommonMistake[] = [
  {
    id: 'cm-01',
    title: 'Missing articles',
    incorrect: 'Government should invest in education.',
    correct: 'The government should invest in education.',
    explanation:
      'Singular countable nouns usually need an article. Use “the” for specific institutions.',
  },
  {
    id: 'cm-02',
    title: 'Subject-verb agreement',
    incorrect: 'The number of cars have increased.',
    correct: 'The number of cars has increased.',
    explanation:
      '“The number of …” takes a singular verb; “a number of …” takes a plural verb.',
  },
  {
    id: 'cm-03',
    title: 'Uncountable nouns pluralised',
    incorrect: 'We need more informations and better equipments.',
    correct: 'We need more information and better equipment.',
    explanation:
      'Information, equipment, advice, knowledge and traffic have no plural form.',
  },
  {
    id: 'cm-04',
    title: 'Wrong preposition after “responsible”',
    incorrect: 'Parents are responsible of their children.',
    correct: 'Parents are responsible for their children.',
    explanation: 'The adjective “responsible” pairs with “for”.',
  },
  {
    id: 'cm-05',
    title: '“Discuss both views” with no balance',
    incorrect: 'Writing only about your own opinion in a discuss-both-views essay.',
    correct: 'Give one paragraph to each view, then state your opinion clearly.',
    explanation:
      'Task response requires both views to be addressed before your conclusion.',
  },
  {
    id: 'cm-06',
    title: 'Memorised phrases',
    incorrect: 'This is a controversial hot topic in this day and age.',
    correct: 'This issue divides public opinion.',
    explanation:
      'Examiners discount memorised openings. Paraphrase the question naturally.',
  },
  {
    id: 'cm-07',
    title: 'Double comparatives',
    incorrect: 'Life is more better in the countryside.',
    correct: 'Life is better in the countryside.',
    explanation: 'Use either “more + adjective” or the “-er” form, never both.',
  },
  {
    id: 'cm-08',
    title: '“According to me”',
    incorrect: 'According to me, tourism is beneficial.',
    correct: 'In my opinion, tourism is beneficial.',
    explanation: '“According to” cites other people or sources, not yourself.',
  },
  {
    id: 'cm-09',
    title: 'Tense in Task 1',
    incorrect: 'In 2010 the figure will rise to 50%.',
    correct: 'In 2010 the figure rose to 50%.',
    explanation:
      'Past data needs past tenses. Reserve “will” for future projections shown in the chart.',
  },
  {
    id: 'cm-10',
    title: 'Apostrophe errors',
    incorrect: 'Its a problem that effects childrens health.',
    correct: 'It is a problem that affects children’s health.',
    explanation:
      '“Its” shows possession; “it’s” means “it is”. “Effect” is usually a noun; “affect” is the verb.',
  },
  {
    id: 'cm-11',
    title: 'Repeating the same word',
    incorrect: 'Pollution is bad. Pollution causes problems. Pollution must stop.',
    correct:
      'Pollution is harmful. This problem affects cities worldwide and must be tackled.',
    explanation:
      'Vary vocabulary with synonyms and reference words (this problem, such damage).',
  },
  {
    id: 'cm-12',
    title: 'Fragments with “because”',
    incorrect: 'Because cars are cheap. More people drive.',
    correct: 'Because cars are cheap, more people drive.',
    explanation:
      '“Because” introduces a dependent clause and cannot stand alone as a sentence.',
  },
];
